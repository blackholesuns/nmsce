'use strict'

const { setTimeout: setTimeoutPromise } = require('node:timers/promises')

const login = require('./nmsce-bot.json')
const snoowrap = require('snoowrap')
const reddit = new snoowrap(login)

var sub = null
var lastPost = {}
var lastComment = {}
var rules = []
var settings = {}
var mods = []
var entries = []

var flairPostLimit = []
var anyPostLimit = {}
var allPost = {}

main()
async function main() {
    console.log("\napp restart", new Date().toUTCString())

    reddit.config({
        continueAfterRatelimitError: true,
        requestTimeout: 90000
    })

    sub = await reddit.getSubreddit('NoMansSkyTheGame')

    await loadSettings()
    getWeekly()

    setInterval(() => getComments(), 30 * 1000)     // for watched comments
    setInterval(() => getModqueue(), 10 * 1000)     // for moderator commands
    setInterval(() => getNew(), 15 * 1000)          // post limits, etc.
    setInterval(() => getContest(), 5 * 60 * 1000)  // update contest wiki
}

async function getContest() {
    let start = new Date()

    for (let contest of settings.contest)
        if (contest.active) {
            let posts = await sub.search({
                query: 'flair_name:"' + contest.flair + '"',
                time: "month",
                limit: 1000,
                sort: "new"
            })

            if (posts.length > 0)
                checkContest(posts, contest)

            break
        }

    let end = new Date().valueOf()
    console.log("contest", start.toUTCString(), end - start.valueOf(), "ms")
}

async function getNew() {
    let start = new Date()
    let date = parseInt(start.valueOf() / 1000)  // reddit time does not include ms so === epoch / 1000
    const recheck = 30 * 60   // timeout jic we get a bad lastPost.name so it should be set to possible time between posts
    let p = []

    p.push(sub.getNew(!lastPost.name ? {
        limit: 100 // day
    } : lastPost.full + recheck < date ? {
        limit: 10 // hour
    } : {
        before: lastPost.name
    }).then(async posts => {
        let p = []

        if (!lastPost.name || lastPost.full + recheck < date)
            console.log(posts.length, "posts / ", parseInt((posts[0].created_utc - posts[posts.length - 1].created_utc) / 60), "minutes")

        if (posts.length > 0) {
            lastPost = posts[0]
            posts = posts.sort((a, b) => a.created_utc - b.created_utc)

            p.push(checkNewPosters(posts))  // Only time critical function. Limits how much time first time post is visible on sub.
            p.push(checkPostLimits(posts))
            p.push(updateWikiThreads(posts))
            checkWatched(posts)
        }

        if (posts.length > 0 || !lastPost.full || lastPost.full + recheck < date)
            lastPost.full = date            // read all if we go past recheck timeout, lastPost was probably deleted

        if (posts.length === 0)
            p.push(lastPost.refresh().then(post => {
                if (post.selftext === "[Deleted]" || post.banned_by) {
                    lastPost.full = 0       // post was deleted so force reread of last 10 post
                }
            }))

        return Promise.all(p)
    }).catch(err => error(err)))

    await Promise.all(p)

    let end = new Date().valueOf()
    console.log("posts", start.toUTCString(), end - start.valueOf(), "ms")
}

async function getModqueue() {
    let start = new Date()
    let p = []

    p.push(sub.getModqueue().then(posts => {
        let p = []
        p.push(modCommands(posts, mods))
        p.push(checkReported(posts))
        return Promise.all(p)
    }).catch(err => error(err)))

    await Promise.all(p)

    let end = new Date().valueOf()
    console.log("modqueue", start.toUTCString(), end - start.valueOf(), "ms")
}

async function getComments() {
    let start = new Date()
    let date = parseInt(start.valueOf() / 1000)  // reddit time does not include ms so === epoch / 1000
    const recheck = 30 * 60   // timeout jic we get a bad lastPost.name so it should be set to possible time between posts

    if (settings.watch.find(x => x.active === true && x.comments === true)) {
        let posts = await sub.getNewComments(!lastComment.name || lastComment.full + recheck < date ? {
            limit: 20 // if startup misses a few nbd
        } : {
            before: lastComment.name
        }).catch(err => error(err))

        if (!lastComment.name || lastComment.full + recheck < date)
            console.log(posts.length, "comments / ", parseInt((posts[0].created_utc - posts[posts.length - 1].created_utc) / 60), "minutes")

        if (lastComment.length > 0 || !lastComment.full || lastComment.full + recheck < date)
            lastComment.full = date    // read all if we go past recheck timeout

        if (posts.length > 0) {
            posts = posts.sort((a, b) => a.created_utc - b.created_utc)
            lastComment.name = posts[posts.length - 1].name

            checkWatched(posts)
        }

        let end = new Date().valueOf()
        console.log("comments", start.toUTCString(), end - start.valueOf(), "ms")
    }
}

function getWeekly() {
    // single searches at startup to get post for long posting limits
    let search = ""
    for (let l of flairPostLimit)
        if (l.timeStr === "week")
            search += (search !== "" ? " OR " : "") + "(flair_text:\"" + l.flair + "\")"

    sub.search({
        query: search,
        time: "week",
        limit: 1000,
        sort: "new"
    }).then(posts => {
        console.log("Weekly", posts.length)

        if (posts.length > 0) {
            posts = posts.sort((a, b) => a.created_utc - b.created_utc)
            checkPostLimits(posts)
        }
    })
}

async function loadSettings(post) {
    const calcTime = function (length) {
        switch (length) {    // reddit time is in sec not ms
            case "week": return 7 * 24 * 60 * 60 - 60 * 60 // 60 min leway 
            case "hour": return 60 * 60 - 2 * 60
            case "day": return 24 * 60 * 60 - 15 * 60
        }
    }

    let p = []

    p.push(sub.getWikiPage("botsettings").fetch().then(page => {
        settings = JSON.parse(page.content_md)
        settings.revision = page.revision_date

        flairPostLimit = []
        anyPostLimit = {}

        if (typeof allPost.any === undefined) {
            allPost = {}
        }

        for (let e of settings.ads) {
            if (e.flair) {
                let limit = {}
                limit.flair = e.flair
                limit.limit = e.limit
                limit.timeStr = e.timeStr
                limit.time = calcTime(e.timeStr)
                limit.contacts = e.contacts
                flairPostLimit.push(limit)
                allPost[e.flair] = []
            }
        }

        let now = new Date().valueOf()

        for (let e of settings.contest) {
            if (e.flair) {
                let start = Date.parse(e.start).valueOf() + e.tz * 60 * 60 * 1000
                let end = start + e.end * 24 * 60 * 60 * 1000 + e.tz * 60 * 60 * 1000

                e.endUTC = new Date(end).toUTCString()
                e.active = now > start && now < end

                if (e.active) {
                    entries = []

                    let limit = {}
                    limit.flair = e.flair
                    limit.limit = e.limit
                    flairPostLimit.push(limit)
                    allPost[e.flair] = []
                    break
                }
            }
        }

        for (let e of settings.limits) {
            let limit = {}
            limit.flair = e.flair
            limit.limit = e.limit
            limit.timeStr = e.timeStr
            limit.time = calcTime(e.timeStr)

            if (e.flair) {
                flairPostLimit.push(limit)
                allPost[e.flair] = []
            } else {
                anyPostLimit = limit
                allPost.any = []
            }
        }
    }))

    p.push(sub.getRules().then(r => {
        for (let x of r.rules)
            rules.push(x.description)
    }))

    p.push(sub.getModerators().then(m => {
        for (let x of m)
            mods.push(x.id)
    }))

    await Promise.all(p)

    console.log("reload settings")

    if (typeof post !== "undefined")
        return post.reply("!-All settings reloaded").catch(err => error(err))
}

function updateSettings() {
    console.log("update settings")

    return sub.getWikiPage("botsettings").edit({
        text: JSON.stringify(settings),
        reason: "bot-update"
    }).catch(err => error(err))
}

var commentedList = []

async function checkPostLimits(posts) {
    let p = []
    let now = new Date().valueOf() / 1000

    for (let post of posts) {
        if (!post.name.includes("t3_") || post.selftext === "[deleted]")
            continue

        // check for videos not using video flair
        if (post.link_flair_template_id !== "9e4276b2-a4d1-11ec-94cc-4ea5a9f5f267" && !post.link_flair_text.includes("Bug")
            && !post.link_flair_text.includes("Video") && !post.link_flair_text.includes("Question") && !post.link_flair_text.includes("Answered")
            && typeof post.secure_media !== "undefined" && post.secure_media
            && (typeof post.secure_media.reddit_video !== "undefined" || typeof post.secure_media.oembed !== "undefined"
                && (post.secure_media.oembed.type === "video" || post.secure_media.type === "twitch.tv"))) {

            post.link_flair_text += " Video"
            console.log("add video flair: " + permaLinkHdr + post.permalink)

            p.push(post.selectFlair({
                flair_template_id: post.link_flair_template_id,
                text: post.link_flair_text
            }).catch(err => error(err)))
        }

        let limit = flairPostLimit.find(x => post.link_flair_text.includes(x.flair))
        let userHistory

        if (limit) {
            userHistory = allPost[limit.flair]

            // this really only happens if someone edits the flair
            if (typeof limit.contacts !== "undefined" && !limit.contacts.find(x => x.uid === post.author.name) && !commentedList.includes(post.id)) {
                commentedList.push(post.id)

                p.push(post.reply(thankYou + removedPost + civFlair + rules[settings.adRuleNo - 1] + "  \n\n" + botSig)
                    .distinguish({
                        status: true
                    }).lock()
                    .catch(err => error(err)))

                p.push(post.remove().catch(err => error(err)))

                console.log("Ad flair op not approved:", post.author.name, permaLinkHdr + post.permalink)
                continue
            }
        }
        else {
            if (!commentedList.includes(post.id) && (post.link_flair_template_id === "9e4276b2-a4d1-11ec-94cc-4ea5a9f5f267" || post.link_flair_text === "Civ Advertisement")) {
                commentedList.push(post.id)

                p.push(post.reply(thankYou + removedPost + civFlair + rules[settings.adRuleNo - 1] + "  \n\n" + botSig)
                    .distinguish({
                        status: true
                    }).lock()
                    .catch(err => error(err)))

                p.push(post.remove().catch(err => error(err)))
                // p.push(post.report({ reason: "Flair needs editing" }).catch(err => error(err)))

                console.log("Ad flair doesn't match:", post.author.name, permaLinkHdr + post.permalink)
                continue
            }

            // check here for post/comments for registered url with wrong flair and delete

            limit = anyPostLimit
            userHistory = allPost.any
        }

        let user = userHistory.find(x => {
            if (typeof limit.contacts === "undefined")
                return x.author === post.author_fullname
            else
                return x.author === limit.flair // ad post get saved under flair
        })

        if (user) {
            if (user.history.find(x => { return x.id === post.id }))
                continue

            user.history = user.history.filter(x =>
                typeof limit.start_utc !== "undefined" && x.created_utc > limit.start_utc
                || typeof limit.time !== "undefined" && post.created_utc - x.created_utc < limit.time)

            if (user.history.length + 1 > limit.limit) {
                for (let h of user.history) {
                    let post = await h.fetch()

                    if (post.selftext === "[deleted]")
                        console.log("deleted post", post.link_flair_text, post.author.name, permaLinkHdr + post.permalink)
                }

                user.history = user.history.filter(x => x.selftext !== "[deleted]" && !x.banned_by)
            }

            if (user.history.length > 1)
                user.history.sort((a, b) => a.created_utc - b.created_utc)
        }
        else {
            user = {}
            user.author = typeof limit.contacts !== "undefined" ? limit.flair : post.author_fullname // ad post get saved under group flair
            user.name = typeof limit.contacts !== "undefined" ? limit.flair : post.author.name
            user.history = []
            userHistory.push(user)
        }

        if (user.history.length + 1 > limit.limit) {
            let message = thankYou + removedPost
            if (typeof limit.timeStr !== "undefined") {
                message += postLimit + limit.limit + "/" + limit.timeStr + ". "
                if (!limit.selectFlair)
                    message += "Your next post can be made after " + (new Date((user.history[0].created_utc + limit.time) * 1000).toUTCString()) + ".  \n"
                message += botSig
            } else
                message += contestLimit + limit.limit + " This post may be reposted using a different flair.  \n" + botSig

            console.log("over limit", permaLinkHdr + post.permalink)

            if (!commentedList.includes(post.id)) {
                commentedList.push(post.id)

                p.push(post.reply(message)
                    .distinguish({
                        status: true
                    }).lock()
                    .catch(err => error(err)))
            }

            p.push(post.remove().catch(err => error(err)))
        }
        else if (typeof limit.start_utc !== "undefined" && post.created_utc > limit.start_utc
            || typeof limit.time !== "undefined" && now - post.created_utc < limit.time)

            user.history.push(post)
    }

    return Promise.all(p)
}

var posters = []

function checkNewPosters(posts) {
    let p = []

    for (let post of posts) {
        if (posters.includes(post.author_fullname)) {
            continue
        }
        else if (post.approved_by) {
            posters.push(post.author_fullname)
            continue
        }

        p.push(sub.search({
            query: "author:" + post.author.name,
            limit: 2,
            sort: "new"
        }).then(posts => {
            if (posts.length === 2 || posts.length === 1 && posts[0].approved_by) {
                posters.push(post.author_fullname)
            }
            else if (!post.banned_by) {
                console.log("new poster", post.author.name, permaLinkHdr + post.permalink)
                let p = []
                p.push(post.reply("!filter-First Post").catch(err => error(err)))

                if (!commentedList.includes(post.name)) {
                    commentedList.push(post.name)

                    p.push(reddit.composeMessage({
                        to: post.author.name,
                        subject: "First post to r/NoMansSkyTheGame",
                        text: firstPost
                    }).catch(err => error(err)))
                }

                return Promise.all(p)
            }
        }))
    }

    return Promise.all(p)
}

function checkReported(posts) {
    let p = []
    for (let post of posts) {
        if (post.author.name === "AutoModerator" || post.author.name === "nmsceBot")
            p.push(post.approve())  // idiots reporting automod & bot comments

        if (post.name.startsWith("t1"))
            for (let r of post.user_reports)
                if (r[0].includes("poiler"))
                    p.push(post.reply("!Filter-Spoiler").catch(err => error(err)))
    }

    return Promise.all(p)
}

async function updateWikiThreads(posts) {
    let changed = []
    let needsUpdate = false

    for (let post of posts)
        if (mods.includes(post.author_fullname) && (post.link_flair_text.match(/(weekly-thread|bug-thread|mega-?thread)/i)))
            changed.push(post)

    if (changed.length > 0) {
        let wiki = await sub.getWikiPage("mega-threads")
        let page = await wiki.fetch().content_md

        for (let post of changed) {
            if (!page.includes(post.id)) {
                let title = post.permalink.split("/")
                let loc = page.indexOf(title[5].slice(0, 20)) // find post title in page

                if (loc) {
                    let insert = page.lastIndexOf("/", loc - 2) + 1
                    page = page.slice(0, insert) + post.id + page.slice(loc - 1)
                    page += "  \n" + new Date(post.created_utc * 1000).toDateString().slice(4) + " | [" + post.title + "](" + permaLinkHdr + post.permalink + ")"

                    needsUpdate = true
                }
            }
        }

        if (needsUpdate) {
            console.log('update wiki')

            return wiki.edit({
                text: page,
                reason: "bot-update scheduled thread urls"
            }).catch(err => error(err))
        }
    }
}

async function modCommands(posts, mods) {
    let p = []

    for (let post of posts) {
        if (post.name.startsWith("t1_") && mods.includes(post.author_fullname)) {
            let match = post.body.match(/!(watch|unwatch|contest|reload|check|ad|pm|r|c)\W?(.*)?/i)

            if (match) {
                console.log("command", post.body)
                let op

                if (post.parent_id.startsWith("t1_"))
                    op = await reddit.getComment(post.parent_id).fetch()
                else
                    op = await reddit.getSubmission(post.parent_id).fetch()

                switch (match[1]) {
                    case "r": p.push(removePost(post, op)); break           // remove post
                    case "c": p.push(sendComment(post, op)); break          // comment
                    case "pm": p.push(sendMessage(post, op)); break         // pm op
                    case "ad": p.push(setupAdvertiser(post, op)); break     // setup ad permission
                    case "watch": p.push(setupWatch(post, op)); break       // send ops post to modqueue
                    case "unwatch": p.push(clearWatch(post, op)); break
                    case "contest": p.push(setupContest(post, op)); break   // setup contest
                    case "reload": p.push(loadSettings(post, op)); break    // reload settings from wiki
                    case "check": p.push(botStats(post, op)); break         // am I running?
                }

                p.push(post.remove().catch(err => error(err)))
            }
        }
    }

    return Promise.all(p)
}

function setupAdvertiser(post, op) {
    let p = []
    let ad = {
        flair: null,
        limit: 2,
        timeStr: "week",
        url: null,
        contacts: []
    }

    let opts = post.body.split(" ")

    for (let opt of opts) {
        let field = opt.split(":")

        switch (field[0]) {
            case "limit": ad.limit = parseInt(field[1]); break
            case "time": ad.timeStr = field[1]; break
            case "flair": {
                if (field[1].startsWith('"')) {
                    let m = post.body.match(/.*?flair:\"(.*?)\"/)

                    if (m)
                        ad.flair = m[1]
                }
                else
                    ad.flair = field[1]
                break
            }
            case "contacts": {
                let contacts = field[1].split(",")
                for (let c of contacts)
                    ad.contacts.push({ uid: c, email: null, name: null })

                break
            }
        }
    }

    if (ad.flair) {
        let ads = settings.ads.find(x => x.flair === ad.flair)

        if (!ads && !settings.ads[0].flair)
            ads = settings.ads[0]

        if (!ads)
            settings.ads.push(ad)
        else {
            ads.flair = ad.flair
            ads.limit = ad.limit
            ads.timeStr = ad.timeStr
            ads.contacts = []

            for (let c of ad.contacts)
                ads.contacts.push(c)
        }

        p.push(updateSettings())
    }

    p.push(listAdvertisers(post, ad.flair))

    return Promise.all(p)
}

function listAdvertisers(post, flair) {
    const buildAd = function (ad) {
        let text = "flair: '" + ad.flair + "  \n"
        text += "    contacts: "
        for (let c of ad.contacts)
            text += c.uid + ", "

        return text.slice(0, text.length - 1) + "  \n\n"
    }

    let text = "!-Authorized advertisers  \n"

    if (!settings.ads[0].flair)
        text = "!-No Authorized advertisers  \n"
    else
        for (let ad of settings.ads)
            if (!ad.flair || ad.flair === flair)
                text += buildAd(ad)

    return post.reply(text).catch(err => error(err))
}

function setupWatch(post, op) {
    let watch = settings.watch.find(x => x.uid === op.author_fullname)
    let opts = post.body.split(" ")
    let p = []

    if (opts.length === 1 || opts[1] === "history")
        p.push(watchHistory(post, op, watch))
    else {
        if (watch === undefined || settings.watch[0].uid === "") {
            if (settings.watch[0].uid === "") {
                watch = settings.watch[0]
            } else {
                watch = {}
                settings.watch.push(watch)
            }
        }
        else {
            let old = Object.assign({}, watch)
            old.active = false
            delete old.history

            if (typeof watch.history === "undefined")
                watch.history = []

            watch.history.push(old)
        }

        watch.end = 30
        watch.notify = "report"
        watch.comments = false

        watch.uid = op.author_fullname
        watch.name = op.author.name
        watch.post = permaLinkHdr + op.permalink

        watch.by = post.author.name
        watch.date = new Date(post.created_utc * 1000).toDateString().slice(4)
        watch.active = true

        for (let opt of opts) {
            let o = opt.split(":")

            switch (o[0]) {
                case "end":
                    watch[o[0]] = parseInt(o[1])
                    break

                case "comments":
                    watch[o[0]] = o[1] === "true"
                    break

                case "reason":
                    if (o[1].startsWith('\"')) {
                        let r = post.body.split('\"')
                        watch[o[0]] = r[1]
                    }
                    else
                        watch[o[0]] = o[1]
                    break

                case "notify":
                    watch[o[0]] = o[1]
                    break
            }
        }

        console.log("watch", watch.name)

        p.push(updateSettings())
        p.push(watchHistory(post, op, watch))
    }

    return Promise.all(p)
}

function watchHistory(post, op, watch) {
    if (watch === undefined)
        return post.reply("!-No watch history for " + op.author.name).catch(err => error(err))
    else {
        let text = "!-Watch history for " + op.author.name + "  \n\n"
        text += watch.active ? "**Actively watching**  \n" : "*No active watch*  \n"
        text += "reason: " + watch.reason + "  \n"
        text += "date: " + watch.date + "  \n"
        text += "end: " + watch.end + "  \n"
        text += "by: " + watch.by + "  \n"
        text += "post: " + watch.post + "  \n\n"
        if (typeof watch.history !== "undefined") {
            text += "Previous watch history  \n\n"
            for (let w of watch.history) {
                text += "reason: " + w.reason + "  \n"
                text += "date: " + w.date + "  \n"
                text += "by: " + w.by + "  \n"
                text += "post: " + w.post + "  \n\n"
            }
        }

        return post.reply(text).catch(err => error(err))
    }
}

function clearWatch(post, op) {
    let p = []
    let watch = settings.watch.find(x => x.uid === op.author_fullname)

    if (typeof watch !== "undefined") {
        watch.active = false

        console.log("unwatch", watch.name)
        p.push(updateSettings())
    }

    p.push(watchHistory(post, op, watch))

    return Promise.all(p)
}

function setupContest(post, op) {
    let p = []

    let opts = post.body.split(" ")
    console.log(opts)

    if (opts.length > 1) {

        let update = settings.contest.find(c => c.flair === op.link_flair_text || !c.flair)
        let contest = update

        if (typeof update === "undefined")
            contest = { // default values
                end: 14,
                tz: 0,
                limit: 3,
                repost: [-1, -3],
                comments: false,
                type: "post"
            }

        contest.flair = op.link_flair_text
        contest.flairID = op.link_flair_template_id
        contest.link = permaLinkHdr + op.permalink

        for (let o of opts) {
            let l = o.split(":")
            console.log(l)

            if (l[0].match(/(end|tz|limit)/))
                contest[l[0]] = parseInt(l[1])
            else if (l[0].match(/(type|start)/))
                contest[l[0]] = l[1]
            else if (l[0] === "comment")
                contest[l[0]] = l[1] === "true"
            else if (l[0] === "repost") {
                contest[l[0]] = []
                let d = l[1].split(",")
                console.log(d)
                for (let x of d)
                    contest[l[0]].push(parseInt(x))
            }
        }

        if (update)
            update = contest
        else
            settings.contest.push(contest)

        p.push(updateSettings())
    }

    p.push(listContest(post, op))

    return Promise.all(p)
}

async function listContest(post, op) {
    let today = new Date()
    let text = "!-Contest  \n"

    let contest = await settings.contest.filter(x => {
        let start = new Date(x.start).valueOf()
        let end = start + x.end * 1000 * 60 * 60 * 24

        return today < end
    })

    for (let c of contest)
        text += "start: " + c.start + " flair: " + c.flair + " [post](" + c.link + ")  \n"

    console.log(text)

    return post.reply(text).catch(err => error(err))
}

function botStats(post, op) {
    console.log("bot check")
    return post.reply("!-Bot Running").catch(err => error(err))
}

function removePost(post, op) {
    let message = thankYou + removedPost
    let list = post.body.slice(2).split(",")
    let p = []

    for (let r of list) {
        let i = parseInt(r) - 1
        message += typeof rules[i] !== "undefined" ? rules[i] + "  \n\n" : ""
    }

    message += botSig

    p.push(op.reply(message)
        .distinguish({
            status: true
        }).lock()
        .catch(err => error(err)))

    p.push(op.remove()
        .catch(err => error(err)))

    console.log("remove post: rule: " + list + " " + permaLinkHdr + op.permalink)

    return Promise.all(p)
}

function sendComment(post, op) {
    let message = post.body.slice(3) + "  \n\n*This comment was made by a moderator of r/NoMansSkyTheGame. If you have questions please contact them [here](https://www.reddit.com/message/compose?to=%2Fr%2FNoMansSkyTheGame).*"
    console.log("post comment: ", message)

    return op.reply(message)
        .distinguish({
            status: true
        }).lock()
        .catch(err => error(err))
}

function sendMessage(post, op) {
    let message = post.body.slice(3) + "  \n\n*This message was sent by a moderator of r/NoMansSkyTheGame. If you have questions please contact them [here](https://www.reddit.com/message/compose?to=%2Fr%2FNoMansSkyTheGame).*"
    console.log("send message: ", message)
    let p = []

    p.push(reddit.composeMessage({
        to: op.author.name,
        subject: "Message from r/NoMansSkyTheGame",
        text: message
    }).catch(err => error(err)))

    p.push(post.reply("!-sending message to " + op.author.name).catch(err => error(err)))

    return Promise.all(p)
}

async function checkWatched(posts) {
    let watching = await settings.watch.filter(x => x.active === true)
    let comments = await watching.filter(x => x.comments === true)
    let today = new Date().valueOf()
    let needsUpdate = false
    let p = []

    for (let post of posts) {
        if (post.approved_by)
            continue

        let watch
        if (post.name.startsWith("t3_"))
            watch = watching.find(x => x.uid === post.author_fullname)
        else
            watch = comments.find(x => x.uid === post.author_fullname)

        if (watch !== undefined) {
            if (today - new Date(watch.date).valueOf() > watch.end * 1000 * 60 * 60 * 24) {
                settings.watch.find(x => x.uid === post.author_fullname).active = false
                console.log("watch expired", post.author.name)
                needsUpdate = true
                continue
            }

            console.log("watch triggered", post.author.name)

            if (watch.notify === "report" || post.name.startsWith("t1"))
                p.push(post.report({
                    reason: "Watch " + post.author.name + " " + watch.reason
                }).catch(err => error(err)))
            else
                p.push(post.reply("!filter-watched user '" + watch.reason + "'").catch(err => error(err)))
        }
    }

    if (needsUpdate)
        p.push(updateSettings())

    await Promise.all(p)
}

async function checkContest(posts, contest) {
    let total = 0
    let entries = []

    for (let post of posts) {
        if (post.link_flair_text !== contest.flair)
            continue

        await setTimeoutPromise(1000)

        let replies = await post.expandReplies().comments
        let comments = 0
        let skip = false

        if (replies.length)
            for (let r of replies) {  // top level comments only
                if (r.body.match(/!contest/i)) { // announcement post
                    skip = true
                    break
                }

                if (r.author_fullname !== post.author_fullname)
                    comments++// += r.ups + r.downs
            }

        if (!skip) {
            total += post.ups + post.downs + post.total_awards_received + comments

            entries.push({
                link: post.permalink,
                id: post.id,
                votes: post.ups + post.downs + post.total_awards_received + comments,
                title: post.title,
            })
        }
    }

    let text = "Contest: " + contest.flair + "  \n"
    text += "[Announcement & rules post](" + contest.link + ")  \n"
    text += "Updated: " + new Date().toUTCString() + "  \n"
    text += "Total Entries: " + entries.length + "  \n"
    text += "Total Votes: " + total + "  \n"
    text += "Contest Ends: " + contest.endUTC + "  \n\n"
    text += "Position|Votes|Link\n---|---|---\n"

    entries.sort((a, b) => b.votes - a.votes)
    for (let i = 0; i < 6 && i < entries.length; ++i)
        text += (i + 1) + "| " + entries[i].votes + "| [" + entries[i].title + "](" + permaLinkHdr + entries[i].link + ")  \n"

    await sub.getWikiPage("conteststats").edit({
        text: text,
        reason: "bot-update"
    }).catch(err => error(err))
}

function error(err) {
    console.log(new Date().toUTCString(), err.name, err.message)
    // console.log(err)
}

const thankYou = 'Thank You for posting to r/NoMansSkyTheGame. '
const removedPost = 'Your post has been removed because it violates the following rules for posting:  \n\n'
const postLimit = "Posting limit exceded: OP is allowed to make "
const contestLimit = "Contest limit exceded: OP is allowed to make "
const botSig = "  \n*This action was taken by the nmstgBot. If you have any questions please contact the [moderators](https://www.reddit.com/message/compose/?to=/r/NoMansSkyTheGame).*"
const firstPost = "Thank you for posting to r/NoMansSkyTheGame and taking an active part in the community!  \n-Since this is your first post to r/NoMansSkyTheGame it has been queued for moderator approval. This is one of the anti-spam measures we're forced to use because of the proliferation of bots on reddit. In the meantime checkout our posting rules listed in the sidebar.  \n\n*Since moderators are not always immediately available please be patient for your post to be approved.*"
const permaLinkHdr = "https://reddit.com"
const civFlair = "-Please complete this [applicaion](https://forms.gle/wE3vtTWtJH1bZaQg7) before using this flair. Contact the moderators when its completed so we don't miss it.  \n-If you have already applied and been accepted please contact the moderators with a unique flair you'd like to use for your group. Also, you can have multiple contacts for your group making post. Please provide the uid of any users you'd like to add. In the future you will need to edit the \"Civ Advertisement\" flair to replace it with your unique flair.  \n-If you just forgot to edit the flair you can repost this using the correct flair. Alternatively you can edit the flair and wait for a moderator to reapprove your post.  \n"
