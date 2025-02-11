'use strict'

const { promises } = require('nodemailer/lib/xoauth2')
const login = require('./nmsce-bot.json')
const snoowrap = require('snoowrap')
const reddit = new snoowrap(login)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

var sub
var subGE
var lastPost = {}
var rules = []
var modList = []
var flairList = []
var userFlair = []

main()
async function main() {
    console.log("\napp restart", new Date().toUTCString())

    reddit.config({
        continueAfterRatelimitError: true,
        requestTimeout: 90000,
        retryErrorCodes: [-3008, -4077, -4078, 429, 500, 502, 503, 504],
        maxRetryAttempts: 5
    })

    sub = await reddit.getSubreddit('NMSCoordinateExchange')
    subGE = await reddit.getSubreddit('NMSGlyphExchange')

    await loadSettings()

    setInterval(() => getModqueue(), 13 * 1000)     // for moderator commands
    setInterval(() => getNew(), 17 * 1000)          // post limits, etc.
    setInterval(() => getMessages(), 37 * 1000)     // user added galaxy
    setInterval(() => enableFlair(), 67 * 1000)  // enable flair

    // let log = await sub.getModerationLog({type:"removelink",mods:["nmsceBot"],limit:10,sort:"new"})
    // console.log(JSON.stringify(log))
}

const rrdFlair = 'Casual Wednesday'

async function enableFlair() {
    let day = new Date().getDay()
    let flair = getItem(flairList, rrdFlair)

    if (flair) {
        switch (day) {
            case 3:
                if (flair.mod_only || typeof flair.mod_only === "undefined") {
                    flair.mod_only = false

                    return (sub._post({
                        uri: "r/".concat("NMSCoordinateExchange", "/api/flairtemplate_v2"),
                        form: {
                            api_type: "json",
                            mod_only: false,
                            flair_template_id: flair.flair_template_id,
                            flair_type: "LINK_FLAIR",
                            text: flair.flair_text,
                            text_color: "dark",
                            text_editable: false,
                            allowable_content: "text",
                            background_color: "#ffff80"
                        }
                    }).then(() => console.log("enable " + rrdFlair)).catch(err => error("ef0", err)))
                }

                break

            default:
                if (!flair.mod_only) {
                    flair.mod_only = true

                    return (sub._post({
                        uri: "r/".concat("NMSCoordinateExchange", "/api/flairtemplate_v2"),
                        form: {
                            api_type: "json",
                            mod_only: true,
                            flair_template_id: flair.flair_template_id,
                            flair_type: "LINK_FLAIR",
                            text: flair.flair_text,
                            text_color: "dark",
                            text_editable: false,
                            allowable_content: "text",
                            background_color: "#ffff80"
                        }
                    }).then(() => console.log("disable " + rrdFlair)).catch(err => error("ef0", err)))
                }

                break
        }
    }

}

async function getMessages() {
    return reddit.getUnreadMessages().then(async comments => {
        let p = []

        for (let c of comments) {
            let parent = await reddit.getComment(c.parent_id).fetch().catch(err => error("gm2", err))
            let op = await reddit.getSubmission(parent.link_id).fetch().catch(err => error("gm1", err))

            if (parent && op && (op.author_fullname === c.author_fullname || modList.includes(c.author_fullname)))
                if (parent.body.startsWith("##What")) {
                    let flair = op.link_flair_text
                    op.link_flair_text += " " + c.body

                    p.push(checkFlair([op], flair))
                    p.push(c.remove().catch(err => error("gm5", err)))
                }
        }

        return Promise.all(p)
    }).catch(err => error("GM", err))
}

async function loadSettings() {
    let p = []

    //     let x = await sub._get({uri: "api/widgets"}).catch(err=>error("get",err))
    // console.log(x)

    p.push(sub.getLinkFlairTemplates().then(res => {
        flairList = []

        for (let f of res) {
            if (f.flair_text.includes("EDIT")) {
                f.name = f.flair_text.split("/")[0]
                f.galaxy = f.flair_text.includes("GALAXY")
                f.mode = f.flair_text.includes("MODE")

                if (!flairList.some(x => x.name === f.name))
                    flairList.push(f)
            }
        }

        for (let f of res)
            if (!flairList.some(x => f.flair_text.includes(x.name))) {
                f.name = f.flair_text
                flairList.push(f)
            }
    }).catch(err => error("ls0", err)))

    p.push(sub.getUserFlairTemplates().then(res => {
        userFlair = res

        for (let f of userFlair) {
            f.name = f.flair_text

            if (f.flair_text.endsWith(":ship:"))
                if (f.flair_text.startsWith(":ship:"))
                    f.mod = true
                else
                    f.award = true
        }
    }).catch(err => error("ls1", err)))

    p.push(sub.getRules().then(r => {
        rules = []

        for (let x of r.rules)
            rules.push(x.description)
    }).catch(err => error("ls2", err)))

    p.push(sub.getModerators().then(m => {
        modList = []

        for (let x of m)
            modList.push(x.id)
    }).catch(err => error("ls3", err)))

    return Promise.all(p).then(async () => {
        if (modList.length === 0 || rules.length === 0 || userFlair.length === 0 || flairList.length === 0) {
            await delay(2000)
            return loadSettings()
        }
    })
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
        // console.log(posts.length)

        if (posts.length > 0) {
            lastPost = posts[0]
            posts = posts.sort((a, b) => a.created_utc - b.created_utc)

            await checkFlair(posts)      // force order so bad posts are deleted before the limits are checked
            p.push(checkLimits(posts))
            p.push(checkTitle(posts))
        }

        if (posts.length > 0 || !lastPost.full || lastPost.full + recheck < date)
            lastPost.full = date            // read all if we go past recheck timeout, lastPost was probably deleted

        if (posts.length === 0)
            p.push(lastPost.refresh().then(post => {
                if (post.removed_by_category)
                    lastPost.full = 0       // post was deleted so force reread of last 10 post
            }).catch(err => { lastPost.full = 0; error("gn0", err) }))

        return Promise.all(p)
    }).catch(err => { lastPost.full = 0; error("GN", err) }))

    return Promise.all(p)
}

async function getBestOf(post, type) {
    let p = []
    let flairs = flairList.filter(a => a.galaxy)
    let n = post.body.match(/(\d+)/g)
    n = n ? parseInt(n[0]) : 4

    if (type) {
        p.push(sub.search({ query: "flair_text:" + type.name, time: "month", sort: "top", limit: n }).then(posts => {
            return { type: type.name, posts: posts }
        }))
    } else
        for (let type of flairs) {
            p.push(sub.search({ query: "flair_text:" + type.name, time: "month", sort: "top", limit: n }).then(posts => {
                return { name: type.name, posts: posts }
            }))

            await delay(1000)
        }

    return Promise.all(p).then(async res => {
        let text = "##Top Posts  \n"

        for (let type of res) {
            if (type.posts.length === 0)
                continue

            text += "###" + type.name + "  \n|Engagement|Title/Link|\n|----:|:-----------------------------------------|\n"

            for (let post of type.posts) {
                post = await post.expandReplies({ depth: 1 })

                text += "|" + (post.ups + post.downs + post.comments.length) + "|[" + post.title.slice(0, 40) + "](" + permaLinkHdr + post.permalink + ")|\n"
            }
        }

        return post.reply(text)
    })
}

async function checkTitle(posts) {
    let p = []

    for (let post of posts) {
        let flair = getItem(flairList, post.link_flair_text)

        if (!flair)
            continue

        let text = ""
        let first = ""
        let startLen = 0

        if (flair.name === rrdFlair)
            text = "See [this post](https://www.reddit.com/r/NMSCoordinateExchange/comments/1clsiij/casual_wednesday_relaxed_rules_flair/) for the rules on using the '" + rrdFlair + "' flair."

        if ((flair.name === "Request" || flair.name.includes("Starship")) && post.title.match(/(starbou?rne? runner)|(golden vector)|(Utopian? speeder)/ig)) {
            p.push(redirectToThread(post))
            continue
        }

        if (flair.name === "Request")
            text = "Many items are easy to find using the [search bar](https://www.reddit.com/r/NMSGlyphExchange/comments/1byxb6p/how_to_navigate_the_search_bar/) or the [nmsce app](https://nmsge.com). *Please search before posting a request.* If you haven't searched and subsequently find your item upon searching please delete this post.  \n\nPosts requesting easily found items will be removed. Requests are only allowed for locations, not a trade, of items (excepting dragon eggs). Requests for expedition items are not allowed because they have no location."

        if (flair.galaxy) {
            let error = false
            let userPosts = await sub.search({ query: "author:" + post.author.name, limit: 5 })
                .catch(err => { error("edu", err); error = true })

            if (!error && userPosts.length < 5)
                first = "Thank you for posting to NMSCE and taking an active part in the community!  \n\nSince this is one of your first few posts to NMSCE please read [this post](https://www.reddit.com/r/NMSCoordinateExchange/comments/1c0l1a4/how_to_create_helpful_starship_post_titles_and/) about what to include in your post to help people find your discovery.  \n  \n"

            let title = post.title.toLowerCase() + " " + post.selftext.toLowerCase()
            text = "Some info about this post:  \n"
            startLen = text.length

            if (!post.link_flair_text.includes("Euclid"))
                text += "- This " + flair.name.toLowerCase() + " is *not* in the Euclid/starting galaxy. **Shared glyphs only work in the specified galaxy.** If you need help getting there contact [Pan Galactic Star Cabs](https://discord.gg/WgUdnbZJjh). They can take you to any galaxy, any system for free!  \n  \n"

            if (flair.name === "Starship") {
                let partsMatched = shipParts.filter(a => title.includes(a))
                // console.log("part matches", partsMatched.length, permaLinkHdr + post.permalink)

                if (userPosts.length >= 5 && partsMatched.length < 3 && !title.includes("squid"))
                    text += "- Please read [this post](https://www.reddit.com/r/NMSCoordinateExchange/comments/1c0l1a4/how_to_create_helpful_starship_post_titles_and/) about what to include in your post to help people find your discovery.  \n"

                if (title.match(/(trad(?:ers?|ing)\W?posts?)|station/ig))
                    text += "- Starships can be found at any active landing pad in the system. Please do not include trading post or station in your post.  \n"

                if (title.match(/\Wwave/ig) && !title.match(/tested|reload|always/ig))
                    text += "- 1st wave is the first group ships that land at a station after a reset not the first ships that land after you land. This should always be tested before posting. Wave is only valid at a station.  \n"

                if (title.match(/class|rank/ig) && !title.match(/guppy|squid|exotic|crashed|sunken|living|interceptor|sentinel/ig))
                    text += "- The specific class of a ship is random based on the system economy. Class should not be specified unless it's for a crashed ship in which case latitude & longitude must be included.  \n"

            } else if (flair.mode) {
                text += "- This " + flair.name.toLowerCase()
                if (post.link_flair_text.includes("Permadeath"))
                    text += " is visible to every player. "
                else
                    text += " is NOT visible to permadeath players. "

                text += "A base uploaded in permadeath is visible to everyone. A base uploaded in any of the other modes, i.e. normal, is *not* visible to players in permadeath.  \n"
            }

            if (first)
                text = first + (text.length !== startLen ? "---\n  \n" + text : "")
        }

        if (text.length !== startLen)
            p.push(uniqueReply(post, text, text.slice(0, 16)))
    }

    return Promise.all(p)
}

async function uniqueReply(post, text, part, noSticky) {
    post = await post.expandReplies({ depth: 1 }).catch(err => error("ur", err))
    let found = false

    for (let c of post.comments) {
        if (c.banned_by || c.body === "[deleted]")
            continue

        if (part && c.body.startsWith(part) || c.body === text) {
            found = true
            // console.log("found comment:", c.body.slice(0, 16))
            break
        }
    }

    if (!found) {
        // console.log("reply:", text.slice(0, 16), permaLinkHdr + post.permalink)

        return post.reply(text)
            .distinguish({
                status: true,
                sticky: noSticky ? false : true
            }).lock().catch(err => error("ur1", err))
    }
}

async function redirectToThread(post) {
    let p = []
    let thread = await sub.search({ query: "flair_text:trading", sort: "new", limit: 1 }).catch(err => error("re0", err))

    let text = "Thank you for posting to r/NMSCoordinateExchange! Please make your request [here](" + permaLinkHdr + thread[0].permalink + ") instead. The trading thread was specifically created for requesting items that are generally not allowed as posts themselves. See rule 8."

    console.log("redirect", permaLinkHdr + post.permalink)

    p.push(post.remove().catch(err => error("ct2", err)))

    p.push(post.reply(text)
        .distinguish({
            status: true,
            sticky: true
        }).lock().catch(err => error("ct3", err)))

    return Promise.all(p)
}

async function getModqueue() {
    let p = []

    p.push(sub.getModqueue().then(posts => {
        let p = []
        p.push(modCommands(posts))
        p.push(checkReported(posts))

        return Promise.all(p)
    }).catch(err => error("MQ", err)))

    return Promise.all(p)
}

async function checkLimits(posts) {
    let p = []
    let now = new Date().valueOf() / 1000
    let oldest = now - 24 * 60 * 60

    let limits = [
        { time: 60 * 60, limit: 2, str: "hour" },               // hour first so a post removed for hourly limit
        { time: 24 * 60 * 60, limit: 2, str: "day", flair: rrdFlair },
        { time: 24 * 60 * 60, limit: 10, str: "day" },          //     won't count against the daily limit
    ]

    posts = posts.sort((a, b) => a.author.name >= b.author.name ? 1 : -1)
    let last = null
    let list = []

    for (let post of posts) {
        if (!post.name.includes("t3_") || post.created_utc < oldest) // more than a day old skip
            continue

        if (!last || post.author.name !== last.author.name) {       // only do this once/author
            list = await sub.search({ query: "author:" + post.author.name, sort: "new", time: "day" })
                .catch(err => error("lim", err))

            list = list.sort((a, b) => a.created_utc - b.created_utc)
            last = post
        } else
            continue

        for (let limit of limits) {
            for (let i = 0; i < list.length; ++i) {
                if (list.length < limit.limit)  // list.length reduced if a post gets removed
                    break

                let l = list[i]
                let end = l.created_utc + limit.time
                let total = typeof limit.flair === "undefined" || l.link_flair_text === limit.flair ? 1 : 0

                for (let k = i + 1; k < list.length; ++k) {
                    let j = list[k]

                    if (j.created_utc > end)
                        break

                    total += typeof limit.flair === "undefined" || j.link_flair_text === limit.flair ? 1 : 0

                    if (total > limit.limit) {
                        let message = removedPost
                        message += postLimit + limit.limit + " posts per "
                            + (typeof limit.flair !== "undefined" ? limit.flair + " per " : "") + limit.str + ".  \n"

                        if (end > now && typeof limit.flair === "undefined")
                            message += "Your next post can be made after " + (new Date(end * 1000).toUTCString()) + ".  \n"
                        message += botSig

                        p.push(j.reply(message)
                            .distinguish({
                                status: true,
                                sticky: true
                            }).lock().catch(err => error("lim0", err)))

                        p.push(j.remove().catch(err => error("lim1", err)))

                        console.log("over limit", typeof limit.flair !== "undefined" ? limit.flair : limit.str, permaLinkHdr + j.permalink)

                        list.splice(k, 1)
                        --total
                        --k
                    }
                }
            }
        }
    }

    return Promise.all(p)
}

function checkFlair(posts, origFlair) {
    let p = []

    for (let post of posts) {
        if (!post.name.startsWith("t3_")) // submission
            continue

        let flair = getItem(flairList, post.link_flair_text)

        if (!flair) {
            if (!modList.includes(post.author_fullname) && post.author.name !== "AutoModerator") {
                console.log("bad flair", permaLinkHdr + post.permalink)

                p.push(post.reply(unrecognizedFlair)
                    .distinguish({
                        status: true,
                        sticky: true
                    }).lock().catch(err => error(12, err)))

                p.push(post.remove({ reason: "unrecognized flair" }).catch(err => error("12b", err)))
            }

            continue
        }

        let newFlair = flair.name

        if (!flair.galaxy) {
            if (newFlair !== post.link_flair_text || origFlair && newFlair !== origFlair) {
                console.log("reset flair", post.link_flair_text, newFlair, permaLinkHdr + post.permalink)

                p.push(post.selectFlair({
                    flair_template_id: flair.flair_template_id,
                    text: newFlair
                }).catch(err => error("cf9", err)))
            }

            if (post.banned_by && (post.banned_by.name === "nmsceBot" || post.banned_by.name === "AutoModerator"))
                p.push(post.approve().catch(err => error("cf8", err)))

            continue
        }

        let reason = ""
        let galaxy, mode

        if (flair && flair.galaxy) {
            galaxy = checkFullText(galaxyList, post)

            if (!galaxy) {
                reason = "galaxy"
                newFlair += "/EDIT GALAXY"
            }
            else
                newFlair += "/" + galaxy.name

            if (flair.mode) {
                mode = checkFullText(modeList, post)

                if (!mode) {
                    reason += (reason ? " & " : "") + "game mode"
                    newFlair += "/GAMEMODE"
                }
                else
                    newFlair += "/" + mode.name
            }
        }

        // if (!reason)
        // newFlair +=  (flair.version ? "/" + version : "")

        if (newFlair !== post.link_flair_text || origFlair && newFlair !== origFlair) {
            console.log("edit flair", post.link_flair_text, newFlair, permaLinkHdr + post.permalink)

            post.link_flair_text = newFlair // so check title has correct flair

            p.push(post.selectFlair({
                flair_template_id: flair.flair_template_id,
                text: newFlair
            }).catch(err => error(13, err)))
        }

        if (reason) {
            const editFlair = '##What [is/are] the [missing]?  \n---\n######Please, reply to this comment with the [missing] to have the bot rewrite the flair and approve the post, e.g. [example] '
            const noGal = 'If everything is included and you still received this message please double check the galaxy spelling.'

            let text = editFlair.replace(/\[is\/are\]/g, reason.includes("&") ? "are" : "is")
            text = text.replace(/\[missing\]/g, reason)
            if (reason.includes("&"))
                text = text.replace(/\[example\]/, '"Eissentam Permadeath". Game mode is "Permadeath" or "Normal".') + noGal
            else if (reason.includes("mode"))
                text = text.replace(/\[example\]/, '"Permadeath". Game mode is "Permadeath" or "Normal".')
            else
                text = text.replace(/\[example\]/, "Eissemtam") + noGal

            text += 'For future posts you can include required information in the title and the bot will automatically update the flair.' + botSig

            console.log("missing", reason, permaLinkHdr + post.permalink)

            p.push(post.reply(text)
                .distinguish({
                    status: true,
                    sticky: true
                }).catch(err => error(15, err)))

            p.push(post.remove({ reason: "missing " + reason }).catch(err => error("15a", err)))

        } else if ((post.mod_reports.find(a => a[1] === "Artemis-Bot")
            || post.banned_by && (post.banned_by.name === "nmsceBot" || post.banned_by.name === "AutoModerator"))) {

            p.push(removeBotComments(post, "##What"))
            p.push(post.approve().catch(err => error("13a", err)))
            console.log("approve", permaLinkHdr + post.permalink)
        }
    }

    return Promise.all(p)
}

async function removeBotComments(post, message) {
    let p = []

    post = await post.expandReplies({ depth: 1 }).catch(err => error("rm", err))

    for (let comment of post.comments) {
        if ((comment.author.name === "nmsceBot" || comment.author.name === "AutoModerator")
            && (!message || comment.body.startsWith(message))) {

            p.push(comment.delete().catch(err => error("rc", err)))
            console.log("delete message", message, permaLinkHdr + post.permalink)
        }
    }

    return Promise.all(p)
}

function checkReported(posts) {
    let p = []
    for (let post of posts) {
        if ((post.author.name === "AutoModerator" || post.author.name === "nmsceBot") && post.body[0] !== '!')
            p.push(post.approve().catch(err => error("cr", err)))  // idiots reporting automod & bot comments
    }

    return Promise.all(p)
}

async function modCommands(posts) {
    let p = []
    // console.log("queue", posts.length)

    for (let post of posts) {
        if (post.name.startsWith("t1_")) {

            let flair = post.body.startsWith("!") ? getItem(flairList, post.body) : null
            let match = post.body.match(/!\W?(user|pm|or|rall|flair|redirect|request|best|setbest|r|c)\W?(.*)?/i)
            let m = match ? match[1].toLowerCase() : null

            if (flair || m) {
                console.log("command", post.body, permaLinkHdr + post.permalink)

                let parent = await reddit.getSubmission(post.link_id).fetch().catch(err => error("mc0", err))

                p.push(post.remove().catch(err => error("mc2", err)))

                if (flair && !m) {
                    if (modList.includes(post.author_fullname) || post.is_submitter)
                        p.push(changeFlairCmd(post, parent))
                } else {
                    if (modList.includes(post.author_fullname))
                        switch (m) {
                            case "request": // "r" catches this
                            case "flair":
                                p.push(changeFlairCmd(post, parent)); break
                            case "or":
                            case "r":
                                p.push(removePostCmd(post, parent)); break          // remove post & quote rule
                            case "c": p.push(sendCommentCmd(post, parent)); break    // comment
                            case "redirect": p.push(redirectToThread(parent)); break
                            case "best": p.push(getBestOf(post, flair)); break
                            case "setbest": p.push(setbestPost(post, parent)); break
                            case "rall": p.push(removeAll(post, parent)); break      // remove all of an ops posts or comments
                        }

                    switch (m) {
                        case "user": p.push(setUserFlairCmd(post)); break
                    }
                }
            }
        }
    }

    return Promise.all(p)
}

async function changeFlairCmd(post, op) {
    let p = []

    op = await op.expandReplies({ depth: 1 }).catch(err => error("cf", err))

    for (let c of op.comments)
        if (c.author.name === "AutoModerator" || c.author.name === "nmsceBot")
            p.push(c.remove().catch(err => error("cf1", err)))

    let flair = op.link_flair_text
    op.link_flair_text = post.body + " " + flair.slice(flair.indexOf("EDIT"))

    p.push(checkFlair([op], flair))
    p.push(checkTitle([op]))

    return Promise.all(p)
}

const bestPostsName = "Monthly Best Posts"

async function setbestPost(post, op) {
    let p = []
    let flair = getItem(flairList, bestPostsName)

    const setFlairAndComment = function (p, op) {
        console.log("set best post", permaLinkHdr + post.permalink)

        p.push(op.selectFlair({
            flair_template_id: flair.flair_template_id,
            text: op.link_flair_text
        }).catch(err => error("sb", err)))

        p.push(uniqueReply(op, "###Congratulations! This post has been selected as one of the best posts of the month on r/NMSCoordinateExchange!", "##Congratulations"))
    }

    if (op.link_flair_text === bestPostsName) {
        let list = []

        if (post.body === "!setbest") {
            let parent = await reddit.getComment(post.parent_id).fetch().catch(err => error("sb0", err))
            let match = parent.body.match(/\[https:\/\/.*?comments\/.*?\W/ig)

            for (let post of match)
                list.push(post.replace(/.*?comments\/(.*)\//, "$1"))
        } else {
            list = post.body.match(/\[https:\/\/.*?comments\/.*?\W/ig)
            if (list) {
                for (let i = 0; i < list.length; ++i)
                    list[i] = list[i].replace(/.*?comments\/(\w+?)\//, "$1")

            } else
                list = post.body.split(" ")

            let text = "##Links for this months best posts.  \n  \n"
            text += "|Author|Title/Link|\n"
            text += "|:--------------------|:-----------------------------------|\n"

            for (let l of list) {
                if (l && l !== "!setbest") {
                    let single = await reddit.getSubmission(l).fetch().catch(err => error("sb3", err))

                    if (single) {
                        text += "|u/" + single.author.name + "|[" + single.title + "](" + permaLinkHdr + single.permalink + ")|\n"

                        setFlairAndComment(p, op)

                        await delay(2000)
                    }
                }
            }

            p.push(op.reply(text).catch(err => error("sb4", err)))
        }
    }
    else
        setFlairAndComment(p, op)

    return Promise.all(p)
}

async function setUserFlairCmd(post) {
    let p = []
    let flair = getItem(userFlair, post.body)
    let pflair = getItem(flairList, post.body)
    let award = false
    let template
    let text = null

    // if (!pflair && flair && flair.name === "Hunter") {
    //     const types = ["Fighter", "Hauler", "Explorer", "Shuttle", "Interceptor", "Staff", "Solar", "Living Ship"]
    //     let matched = types.find(a => post.body.includes(a))
    //     if (matched.length) {
    //         pflair = {}
    //         pflair.name = matched[0]
    //         pflair.galaxy = true
    //     }
    // }

    if (modList.includes(post.author_fullname)) {
        text = post.body.replace(/!user\W+(.*)/i, "$1")
        text = ":ship: " + text + " :ship:"
        template = userFlair.find(a => a.mod).flair_template_id
    } else if (flair) {
        let user = await sub.getUserFlair(post.author.name).catch(err => error("uf0", err))

        if (user.flair_text) {
            if (user.flair_text.endsWith(":ship:"))
                award = true
        } else {
            user = await subGE.getUserFlair(post.author.name).catch(err => error("uf1", err))

            if (user.flair_text)//["Hunter","Specialist","Decorated","Exemplar"].includes(user.flair_text))
                award = true
        }

        text = (pflair && pflair.galaxy ? pflair.name + " " : "") + flair.name

        if (award) {
            text = text + " :ship:"
            template = userFlair.find(a => a.award).flair_template_id
        } else if (!user) {
            let search = await sub.search({
                query: "author:" + post.author.name,
                limit: 10
            }).catch(err => error("sea", err))

            if (search < 10) {
                text = ""
                p.push(post.reply("Please wait until you have made 10 posts to r/NMSCoordinateExchange before selecting a user flair.").catch(err => error("ufl", err)))
            }
        }
    }

    if (text) {
        console.log("change user flair", text, post.author.name)

        p.push(sub._post({
            uri: "r/".concat("NMSCoordinateExchange", "/api/selectflair"),
            form: {
                api_type: "json",
                flair_template_id: template,
                link: "",
                name: post.author.name,
                text: text
            }
        }).catch(err => error("uf2", err)))

        p.push(post.reply("User flair '" + text + "' assigned. You may need to reload to see the change.").catch(err => error("ufs", err)))
    } else
        p.push(post.reply("Invalid user flair selected. It needs to be an existing post flair + 'Hunter' or 'Builder'. e.g !user:Starship Hunter, !user:Hunter, !user:builder").catch(err => error("uf", err)))

    return Promise.all(p)
}

var inproc = false // jic command wasn't deleted

async function removeAll(post, op) {
    return
    let type = post.body.match(/!rall\W+(.*?)\W+(.*)/)
    let user = reddit.getUser(op.author.name)
    if (inproc) {
        console.log("in process")
        return
    }

    if (type[1] === "comments") {
        inproc = true
        console.log("get comments")
        let comments = await user.getComments({ sort: "new", limit: 1000 })
        let count = 0

        for (let c of comments) {
            if (c.removed) {
                ++count
                continue
            }

            if (c.subreddit_name_prefixed === "r/NMSCoordinateExchange") {
                // if (type[2] === "img" && c.body.includes("preview.redd.it")) { // specific to u/sweetdick who was spamming images
                console.log(++count, c.link_permalink)
                await c.remove().catch(err => console.error("error"))
                await delay(2000)
                // }
            }
        }

        console.error("done")
        inproc = false
    }
}

function removePostCmd(post, op) {
    let message = removedPost + (post.body.startsWith("!or") ? respOffTopic : "")
    let list = post.body.match(/![or]+(.*)/)[1].split(",")
    let p = []

    for (let r of list) {
        message += "Rule " + r + ":  \n"
        message += typeof rules[r - 1] !== "undefined" ? rules[r - 1] + "  \n\n" : ""
    }

    p.push(op.reply(message)
        .distinguish({
            status: true,
            sticky: true
        }).lock().catch(err => error("rp0", err)))

    p.push(op.remove().catch(err => error("rp1", err)))

    console.log("remove post: rule: " + list + " " + permaLinkHdr + op.permalink)

    return Promise.all(p)
}

function sendCommentCmd(post, op) {
    let message = ""
    let match = post.body.match(/!\W?c\W?([0-9,]+)/)

    if (match) {
        let list = match[1].split(",")

        message = "##Please read the following.  \n######This is a comment about your post. Your post has *not been removed*.  \n---\n"

        for (let r of list) {
            message += "Rule " + r + ":  \n"
            message += typeof rules[r - 1] !== "undefined" ? rules[r - 1] + "  \n\n" : ""
        }
    } else
        message = post.body.match(/!\W?c\W?(.*)/)[1]

    message += modSig

    console.log("post comment", permaLinkHdr + post.permalink)

    return op.reply(message)
        .distinguish({
            status: true
        }).lock()
        .catch(err => error("sc1", err))
}

function error(s, err) {
    console.log(new Date().toUTCString(), s ? s : "",
        typeof err.cause !== "undefined" ? err.cause.errno : "", err.name, err.message)
    console.error(JSON.stringify(err))
}

function checkFullText(list, post) {
    let item = getItem(list, post.link_flair_text)

    if (!item) {
        item = getItem(list, post.title)

        if (!item)
            item = getItem(list, post.selftext)
    }

    return item
}

function getItem(list, str) {
    if (!str)
        return null

    for (let s of list) {
        if (typeof s.match === "undefined") {
            if (str.toLowerCase().includes(s.name.toLowerCase()))
                return s
        } else if (str.match(s.match))
            return s
    }

    return null
}

const removedPost = 'Thank You for posting to r/NMSCoordinateExchange! Your post has been removed because it violates the following rules for posting:  \n\n'
const postLimit = "Posting limit exceded: OP is allowed to make "
const permaLinkHdr = "https://reddit.com"

const replyHelp = `List of bot commands

   * !help - this list
   * !glyphs - reply with comment about using glyph font
   * !light - reply with comment about improving the screenshot
   * !class - reply with comment about spawning ship classes
   * !portal - info about portal glyphs
   * !0000:0000:0000:0000 - replace with coordinates. bot will comment with glyphs & link showing glyphs
   * !000000000000 - replace with glyphs. bot will comment with a link showing glyphs
`
const replyModHelp = `
---
Moderator Commands:

    * !m-N - Quote rule number N. Specify multiple rules by separating the rule numbers with a comma. e.g !m-1,2
    * !m-N-B - Quote rule N bullet point B
    * !m-rN - Remove post for violating rule number N. Quotes rule.
    * !m-gmcls - Make comment about missing items where
        *  g = missing galaxy
        *  m = mode
        *  c = coordinates or glyphs
        *  l = latitude & longitude
        *  s = screenshot
    * !m-o - Add off topic comment and suggest reposting to nmstg. use with r8
    * !m-d - add comment requesting a better description on future post
    * !m-v[/emoji/] [flair] - get current event vote count. Optional emoji vote count, '/' brackets required. Optional new flair name to change. e.g. !m-vStarship
    * !reqflair - request op repost using the 'request' flair. removes post.
    * !search - add comment requesting the op search before posting a request. removes post.
    
    Commands can be concatenated together e.g. !m-gpr2,3o for missing galaxy & platform, remove for violcation of rule 2 & 3 and add offtopic comment`
const respDescription = "In order to help other players find your post using the search-bar you should consider adding a more descriptive title to future post. It is recommended to include main color(s), ship type and major parts. The NMSCE [wiki page](https://www.reddit.com/r/NMSCoordinateExchange/about/wiki/shipparts) has a link to the named parts list for most types of ships."
const respOffTopic = "This post is off topic for NMSCE you might try posting in r/NoMansSkyTheGame.  \n  \n"
const respShiploc = `All ships can be found at any landing pad in the system not just specific space stations or trading posts. The same ships are available on all platforms and game modes. Things to check if you don't find the ship you're looking for: 1) Are you in the correct galaxy? 2) Are you in the correct system? It's very easy to enter the glyphs incorrectly so please double check your location.`
const respShipclass = `Each individually spawned ship has a random class & number of slots. In a T3, e.g. wealthy, system a ship has a 2% chance of spawning as an S class. In a T2, e.g. developing, economy the percentage is 1%. In a T1 0%. The range of slots is based on the configuration of the ship. An S class ship will have the max possible number of slots in it's range. Only crashed ships have a fixed configuration of size and class.`
const respLinks = `If you select "images & videos" before selecting your images then they will show up on the front page as images instead of links.`
const respLight = `To help show off your items in future post you might consider taking your screenshot in a different location and/or repositioning the sun. This will help others to see what is special about your find. For more detailed information see [this](https://www.reddit.com/r/NMSCoordinateExchange/comments/hilovm/found_a_cool_ship_you_wanna_post_make_it_look/) post.`
const respGlyphs = `To improve the visibility of the glyphs in your image install the [glyph font](https://nmsce.com/bin/NMS-Glyphs-Mono.ttf). More information can be found in [this post](https://www.reddit.com/r/NMSCoordinateExchange/comments/oh109y/easy_way_to_add_larger_more_readable_glyphs_to/)`
const unrecognizedFlair = 'Thank You for posting to r/NMSCoordinateExchange. Your post has been removed because the flair was unrecognized. Please, reply with **!flair:** followed by the complete flair text to edit the flair and approve the post. e.g."!flair:Base/Euclid/Normal". Otherwise, please repost using the correct flair'
const botSig = "  \n---\n*This action was taken by the nmsceBot. If you have any questions please contact the [moderators](https://www.reddit.com/message/compose/?to=/r/NMSCoordinateExchange).*"
const modSig = "  \n---\n*This comment was made by a moderator of r/NMSCoordinateExchange. If you have questions please contact them [here](https://www.reddit.com/message/compose?to=/r/NMSCoordinateExchange).*"
const replyWaitRequest = "Because of a problem with people instantly answering \"!searched\" to the bot there is a 5 min cooldown period before the response will be accepted. Please reply after the cooldown has expired."

const shipParts =
    ["2rpedo", "afterburner", "alpha", "ant", "anvil", "arm", "asos", "ball", "barrel", "body", "bowie",
        "boy", "cargo", "carriage", "channel", "chin", "coolant", "cooling", "cowl", "crescent", "curved",
        "cylon", "d-flect", "delta", "dish", "dishes", "downlet", "drill", "droid", "duck", "duct", "elytra",
        "exhaust", "exotic", "explorer", "falcon", "fan", "fat", "fighter", "filter", "fin", "firefly", "firespray",
        "foil", "foot", "fork", "fuel", "fusion", "grapple", "grill", "grouper", "guard", "gull", "guppy", "halo",
        "hammerhead", "hauler", "hex", "hilt", "hopper", "horizon", "horza", "hover", "interceptor", "jackal",
        "jet", "jumper", "keg", "lambda", "laser", "light", "linea", "living", "lunch", "magnatreme", "mantis",
        "marlin", "mecha", "mohawk", "mosquito", "mu", "narrow", "needle", "nose", "octa", "omega", "omicron",
        "pedestal", "pelican", "pi", "plough", "pod", "pointed", "pommel", "ports", "quadra", "quasar", "r2",
        "rasa", "raven", "razor", "rectangle", "royal", "rudder", "sabre", "scorpion", "sentinel", "shard",
        "shark", "shield", "shielded", "shockwave", "short", "shuttle", "single", "slab", "slope", "snowspeeder",
        "solar", "spectrometer", "spider", "spikes", "squid", "stabilizer", "star", "starburst", "starscream",
        "stinger", "stubby", "tail", "talon", "tank", "tau", "teeth", "tie", "tilt", "torpedo", "triple", "tristar",
        "tusked", "upsilon", "vector", "vent", "vented", "verta", "vertical", "viper", "voyager", "vulture",
        "wedge", "widow", "v-wing", "e-wing", "thruster"]

const modeList = [{
    match: /(custom)|(creative)|(relaxed)|(normal)|(survival)|(expedition)/i,
    name: "Normal"
}, {
    match: /Permadeath|\bPD\b/i,
    name: "Permadeath"
}]

const galaxyList = [{
    match: /\bEl?uc\w+d\b/i,
    name: "Euclid"
}, {
    match: /\bHilb\w+t\b(Dim\w+n\b)?/i,
    name: "Hilbert"
}, {
    match: /\bCal\w+o\b/i,
    name: "Calypso"
}, {
    match: /\bHes\w+s\b(Dim\w+n\b)?/i,
    name: "Hesperius"
}, {
    match: /\bHya\w+s\b/i,
    name: "Hyades"
}, {
    match: /\b[IL]ck\w+w\b/i,
    name: "Ickjamatew"
}, {
    match: /\bBud\w+r\b/i,
    name: "Budullangr"
}, {
    match: /\bKik\w+r\b/i,
    name: "Kikolgallr"
}, {
    match: /\bElt\w+n\b/i,
    name: "Eltiensleen"
}, {
    match: /\bEis{1,2}\w+[mn]\b/i,
    name: "Eissentam"
}, {
    match: /\bElk[ua]\w+s\b/i,
    name: "Elkupalos"
}, {
    match: /\bApt\w+a\b/i,
    name: "Aptarkaba"
}, {
    match: /\bOnt\w+p\b/i,
    name: "Ontiniangp"
}, {
    match: /\bOdi\w+i\b/i,
    name: "Odiwagiri"
}, {
    match: /\bOgt\w+i\b/i,
    name: "Ogtialabi"
}, {
    match: /\bMuh\w+o\b/i,
    name: "Muhacksonto"
}, {
    match: /\bHit\w+r\b/i,
    name: "Hitonskyer"
}, {
    match: /\bRer\w+l\b/i,
    name: "Rerasmutul"
}, {
    match: /\b[IL]sd\w+g\b/i,
    name: "Isdoraijung"
}, {
    match: /\bDoc\w+a\b/i,
    name: "Doctinawyra"
}, {
    match: /\bLoyc\w+q\b/i,
    name: "Loychazinq"
}, {
    match: /\bZuk\w+a\b/i,
    name: "Zukasizawa"
}, {
    match: /\bEkw\w+e\b/i,
    name: "Ekwathore"
}, {
    match: /\bYebe\w+e\b/i,
    name: "Yeberhahne"
}, {
    match: /\bTwer\w+k\b/i,
    name: "Twerbetek"
}, {
    match: /\bSiv\w+s\b/i,
    name: "Sivarates"
}, {
    match: /\bEaj\w+l\b/i,
    name: "Eajerandal"
}, {
    match: /\bAld\w+i\b/i,
    name: "Aldukesci"
}, {
    match: /\bWot\w+i\b/i,
    name: "Wotyarogii"
}, {
    match: /\bSud\w+l\b/i,
    name: "Sudzerbal"
}, {
    match: /\bMau\w+y\b/i,
    name: "Maupenzhay"
}, {
    match: /\bSugu\w+e\b/i,
    name: "Sugueziume"
}, {
    match: /\bBrog\w+n\b/i,
    name: "Brogoweldian"
}, {
    match: /\bEhb\w+u\b/i,
    name: "Ehbogdenbu"
}, {
    match: /\b[IL]js\w+s\b/i,
    name: "Ijsenufryos"
}, {
    match: /\bNip\w+a\b/i,
    name: "Nipikulha"
}, {
    match: /\bAut\w+n\b/i,
    name: "Autsurabin"
}, {
    match: /\bLus\w+h\b/i,
    name: "Lusontrygiamh"
}, {
    match: /\bRew\w+a\b/i,
    name: "Rewmanawa"
}, {
    match: /\bEth\w+e\b/i,
    name: "Ethiophodhe"
}, {
    match: /\bUra\w+e\b/i,
    name: "Urastrykle"
}, {
    match: /\bXob\w+j\b/i,
    name: "Xobeurindj"
}, {
    match: /\bOni\w+u\b/i,
    name: "Oniijialdu"
}, {
    match: /\bWuc\w+c\b/i,
    name: "Wucetosucc"
}, {
    match: /\bEby\w+f\b/i,
    name: "Ebyeloof"
}, {
    match: /\bOdya\w+a\b/i,
    name: "Odyavanta"
}, {
    match: /\bMil\w+i\b/i,
    name: "Milekistri"
}, {
    match: /\bWaf\w+h\b/i,
    name: "Waferganh"
}, {
    match: /\bAgn\w+t\b/i,
    name: "Agnusopwit"
}, {
    match: /\bT[ae]y\w+y\b/i,
    name: "Teyaypilny"
}, {
    match: /\bZal\w+m\b/i,
    name: "Zalienkosm"
}, {
    match: /\bLadg\w+f\b/i,
    name: "Ladgudiraf"
}, {
    match: /\bMus\w+e\b/i,
    name: "Mushonponte"
}, {
    match: /\bAms\w+z\b/i,
    name: "Amsentisz"
}, {
    match: /\bFla\w+m\b/i,
    name: "Fladiselm"
}, {
    match: /\bLaa\w+b\b/i,
    name: "Laanawemb"
}, {
    match: /\b[IL]lk\w+r\b/i,
    name: "Ilkerloor"
}, {
    match: /\bDav\w+i\b/i,
    name: "Davanossi"
}, {
    match: /\bPlo\w+u\b/i,
    name: "Ploehrliou"
}, {
    match: /\bCor\w+a\b/i,
    name: "Corpinyaya"
}, {
    match: /\bLec\w+m\b/i,
    name: "Leckandmeram"
}, {
    match: /\bQuu\w+s\b/i,
    name: "Quulngais"
}, {
    match: /\bNok\w+l\b/i,
    name: "Nokokipsechl"
}, {
    match: /\bRinb\w+a\b/i,
    name: "Rinblodesa"
}, {
    match: /\bLoyd\w+n\b/i,
    name: "Loydporpen"
}, {
    match: /\b[IL]bt\w+p\b/i,
    name: "Ibtrevskip"
}, {
    match: /\bElko\w+b\b/i,
    name: "Elkowaldb"
}, {
    match: /\bHeh\w+o\b/i,
    name: "Heholhofsko"
}, {
    match: /\bYebr\w+d\b/i,
    name: "Yebrilowisod"
}, {
    match: /\bHus\w+i\b/i,
    name: "Husalvangewi"
}, {
    match: /\bOvn[\w'’]+d\b/i,
    name: "Ovna'uesed"
}, {
    match: /\bBah\w+y\b/i,
    name: "Bahibusey"
}, {
    match: /\bNuy\w+e\b/i,
    name: "Nuybeliaure"
}, {
    match: /\bDos\w+c\b/i,
    name: "Doshawchuc"
}, {
    match: /\bRuc\w+h\b/i,
    name: "Ruckinarkh"
}, {
    match: /\bTho\w+c\b/i,
    name: "Thorettac"
}, {
    match: /\bNupo\w+u\b/i,
    name: "Nuponoparau"
}, {
    match: /\bMog\w+l\b/i,
    name: "Moglaschil"
}, {
    match: /\bUiw\w+e\b/i,
    name: "Uiweupose"
}, {
    match: /\bNas\w+e\b/i,
    name: "Nasmilete"
}, {
    match: /\bEkd\w+n\b/i,
    name: "Ekdaluskin"
}, {
    match: /\bHak\w+y\b/i,
    name: "Hakapanasy"
}, {
    match: /\bDim\w+a\b/i,
    name: "Dimonimba"
}, {
    match: /\bCaj\w+i\b/i,
    name: "Cajaccari"
}, {
    match: /\bOlo\w+o\b/i,
    name: "Olonerovo"
}, {
    match: /\bUml\w+k\b/i,
    name: "Umlanswick"
}, {
    match: /\bHen\w+m\b/i,
    name: "Henayliszm"
}, {
    match: /\bUtz\w+e\b/i,
    name: "Utzenmate"
}, {
    match: /\bUmi\w+a\b/i,
    name: "Umirpaiya"
}, {
    match: /\bPah\w+g\b/i,
    name: "Paholiang"
}, {
    match: /\b[IL]ae\w+a\b/i,
    name: "Iaereznika"
}, {
    match: /\bYud\w+h\b/i,
    name: "Yudukagath"
}, {
    match: /\bBoe\w+j\b/i,
    name: "Boealalosnj"
}, {
    match: /\bYae\w+o\b/i,
    name: "Yaevarcko"
}, {
    match: /\bCoe\w+p\b/i,
    name: "Coellosipp"
}, {
    match: /\bWay\w+u\b/i,
    name: "Wayndohalou"
}, {
    match: /\bSmo\w+l\b/i,
    name: "Smoduraykl"
}, {
    match: /\bApm\w+u\b/i,
    name: "Apmaneessu"
}, {
    match: /\bHic\w+v\b/i,
    name: "Hicanpaav"
}, {
    match: /\bAkv\w+a\b/i,
    name: "Akvasanta"
}, {
    match: /\bTuy\w+r\b/i,
    name: "Tuychelisaor"
}, {
    match: /\bRiv\w+e\b/i,
    name: "Rivskimbe"
}, {
    match: /\bDak\w+x\b/i,
    name: "Daksanquix"
}, {
    match: /\bKiss\w+n\b/i,
    name: "Kissonlin"
}, {
    match: /\bAed\w+l\b/i,
    name: "Aediabiel"
}, {
    match: /\bUlo\w+k\b/i,
    name: "Ulosaginyik"
}, {
    match: /\bRoc\w+r\b/i,
    name: "Roclaytonycar"
}, {
    match: /\bKic\w+a\b/i,
    name: "Kichiaroa"
}, {
    match: /\b[IL]rc\w+y\b/i,
    name: "Irceauffey"
}, {
    match: /\bNud\w+e\b/i,
    name: "Nudquathsenfe"
}, {
    match: /\bGet\w+l\b/i,
    name: "Getaizakaal"
}, {
    match: /\bHans\w+n\b/i,
    name: "Hansolmien"
}, {
    match: /\bBloy\w+a\b/i,
    name: "Bloytisagra"
}, {
    match: /\bLads\w+y\b/i,
    name: "Ladsenlay"
}, {
    match: /\bLuyu\w+r\b/i,
    name: "Luyugoslasr"
}, {
    match: /\bUbre\w+k\b/i,
    name: "Ubredhatk"
}, {
    match: /\bCido\w+a\b/i,
    name: "Cidoniana"
}, {
    match: /\bJasi\w+a\b/i,
    name: "Jasinessa"
}, {
    match: /\bTorw\w+f\b/i,
    name: "Torweierf"
}, {
    match: /\bSaff\w+m\b/i,
    name: "Saffneckm"
}, {
    match: /\bThni\w+r\b/i,
    name: "Thnistner"
}, {
    match: /\bDotu\w+g\b/i,
    name: "Dotusingg"
}, {
    match: /\bLule\w+s\b/i,
    name: "Luleukous"
}, {
    match: /\bJelm\w+n\b/i,
    name: "Jelmandan"
}, {
    match: /\bOtim\w+o\b/i,
    name: "Otimanaso"
}, {
    match: /\bEnja\w+o\b/i,
    name: "Enjaxusanto"
}, {
    match: /\bSezv\w+w\b/i,
    name: "Sezviktorew"
}, {
    match: /\bZike\w+m\b/i,
    name: "Zikehpm"
}, {
    match: /\bBeph\w+h\b/i,
    name: "Bephembah"
}, {
    match: /\bBroo\w+i\b/i,
    name: "Broomerrai"
}, {
    match: /\bMexi\w+a\b/i,
    name: "Meximicka"
}, {
    match: /\bVene\w+a\b/i,
    name: "Venessika"
}, {
    match: /\bGait\w+g\b/i,
    name: "Gaiteseling"
}, {
    match: /\bZosa\w+o\b/i,
    name: "Zosakasiro"
}, {
    match: /\bDraj\w+s\b/i,
    name: "Drajayanes"
}, {
    match: /\bOoib\w+r\b/i,
    name: "Ooibekuar"
}, {
    match: /\bUrck\w+i\b/i,
    name: "Urckiansi"
}, {
    match: /\bDozi\w+o\b/i,
    name: "Dozivadido"
}, {
    match: /\bEmie\w+s\b/i,
    name: "Emiekereks"
}, {
    match: /\bMeyk\w+r\b/i,
    name: "Meykinunukur"
}, {
    match: /\bKimy\w+h\b/i,
    name: "Kimycuristh"
}, {
    match: /\bRoan\w+n\b/i,
    name: "Roansfien"
}, {
    match: /\b[IL]sga\w+o\b/i,
    name: "Isgarmeso"
}, {
    match: /\bDait\w+i\b/i,
    name: "Daitibeli"
}, {
    match: /\bGucu\w+k\b/i,
    name: "Gucuttarik"
}, {
    match: /\bEnla\w+e\b/i,
    name: "Enlaythie"
}, {
    match: /\bDrew\w+e\b/i,
    name: "Drewweste"
}, {
    match: /\bAkbu\w+i\b/i,
    name: "Akbulkabi"
}, {
    match: /\bHoms\w+w\b/i,
    name: "Homskiw"
}, {
    match: /\bZava\w+i\b/i,
    name: "Zavainlani"
}, {
    match: /\bJewi\w+s\b/i,
    name: "Jewijkmas"
}, {
    match: /\b[IL]tlh\w+a\b/i,
    name: "Itlhotagra"
}, {
    match: /\bPoda\w+s\b/i,
    name: "Podalicess"
}, {
    match: /\bHivi\w+r\b/i,
    name: "Hiviusauer"
}, {
    match: /\bHals\w+k\b/i,
    name: "Halsebenk"
}, {
    match: /\bPuik\w+c\b/i,
    name: "Puikitoac"
}, {
    match: /\bGayb\w+a\b/i,
    name: "Gaybakuaria"
}, {
    match: /\bGrbo\w+e\b/i,
    name: "Grbodubhe"
}, {
    match: /\bRyce\w+r\b/i,
    name: "Rycempler"
}, {
    match: /\b[IL]ndj\w+a\b/i,
    name: "Indjalala"
}, {
    match: /\bFont\w+k\b/i,
    name: "Fontenikk"
}, {
    match: /\bPasy\w+e\b/i,
    name: "Pasycihelwhee"
}, {
    match: /\b[IL]kba\w+t\b/i,
    name: "Ikbaksmit"
}, {
    match: /\bTeli\w+s\b/i,
    name: "Telicianses"
}, {
    match: /\bOyle\w+n\b/i,
    name: "Oyleyzhan"
}, {
    match: /\bUage\w+t\b/i,
    name: "Uagerosat"
}, {
    match: /\b[IL]mpo\w+n\b/i,
    name: "Impoxectin"
}, {
    match: /\bTwoo\w+d\b/i,
    name: "Twoodmand"
}, {
    match: /\bHilf\w+s\b/i,
    name: "Hilfsesorbs"
}, {
    match: /\bEzda\w+t\b/i,
    name: "Ezdaranit"
}, {
    match: /\bWien\w+e\b/i,
    name: "Wiensanshe"
}, {
    match: /\bEwhe\w+c\b/i,
    name: "Ewheelonc"
}, {
    match: /\bLitz\w+a\b/i,
    name: "Litzmantufa"
}, {
    match: /\bEmar\w+i\b/i,
    name: "Emarmatosi"
}, {
    match: /\bMufi\w+i\b/i,
    name: "Mufimbomacvi"
}, {
    match: /\bWong\w+m\b/i,
    name: "Wongquarum"
}, {
    match: /\bHapi\w+a\b/i,
    name: "Hapirajua"
}, {
    match: /\b[IL]gbi\w+a\b/i,
    name: "Igbinduina"
}, {
    match: /\bWepa\w+s\b/i,
    name: "Wepaitvas"
}, {
    match: /\bStha\w+i\b/i,
    name: "Sthatigudi"
}, {
    match: /\bYeka\w+n\b/i,
    name: "Yekathsebehn"
}, {
    match: /\bEbed\w+t\b/i,
    name: "Ebedeagurst"
}, {
    match: /\bNoli\w+a\b/i,
    name: "Nolisonia"
}, {
    match: /\bUlex\w+b\b/i,
    name: "Ulexovitab"
}, {
    match: /\b[IL]odh\w+s\b/i,
    name: "Iodhinxois"
}, {
    match: /\b[IL]rro\w+s\b/i,
    name: "Irroswitzs"
}, {
    match: /\bBifr\w+t\b/i,
    name: "Bifredait"
}, {
    match: /\bBeir\w+e\b/i,
    name: "Beiraghedwe"
}, {
    match: /\bYeon\w+k\b/i,
    name: "Yeonatlak"
}, {
    match: /\bCugn\w+h\b/i,
    name: "Cugnatachh"
}, {
    match: /\bNozo\w+i\b/i,
    name: "Nozoryenki"
}, {
    match: /\bEbra\w+i\b/i,
    name: "Ebralduri"
}, {
    match: /\bEvci\w+j\b/i,
    name: "Evcickcandj"
}, {
    match: /\bZiyb\w+n\b/i,
    name: "Ziybosswin"
}, {
    match: /\bHepe\w+t\b/i,
    name: "Heperclait"
}, {
    match: /\bSugi\w+m\b/i,
    name: "Sugiuniam"
}, {
    match: /\bAase\w+h\b/i,
    name: "Aaseertush"
}, {
    match: /\bUgly\w+a\b/i,
    name: "Uglyestemaa"
}, {
    match: /\bHore\w+h\b/i,
    name: "Horeroedsh"
}, {
    match: /\bDrun\w+o\b/i,
    name: "Drundemiso"
}, {
    match: /\b[IL]tya\w+t\b/i,
    name: "Ityanianat"
}, {
    match: /\bPurn\w+e\b/i,
    name: "Purneyrine"
}, {
    match: /\bDoki\w+t\b/i,
    name: "Dokiessmat"
}, {
    match: /\bNupi\w+h\b/i,
    name: "Nupiacheh"
}, {
    match: /\bDihe\w+j\b/i,
    name: "Dihewsonj"
}, {
    match: /\bRudr\w+k\b/i,
    name: "Rudrailhik"
}, {
    match: /\bTwer\w+t\b/i,
    name: "Tweretnort"
}, {
    match: /\bSnat\w+e\b/i,
    name: "Snatreetze"
}, {
    match: /\b[IL]wun\w+s\b/i,
    name: "Iwunddaracos"
}, {
    match: /\bDiga\w+a\b/i,
    name: "Digarlewena"
}, {
    match: /\bErqu\w+a\b/i,
    name: "Erquagsta"
}, {
    match: /\bLogo\w+n\b/i,
    name: "Logovoloin"
}, {
    match: /\bBoya\w+h\b/i,
    name: "Boyaghosganh"
}, {
    match: /\bKuol\w+u\b/i,
    name: "Kuolungau"
}, {
    match: /\bPehn\w+t\b/i,
    name: "Pehneldept"
}, {
    match: /\bYeve\w+n\b/i,
    name: "Yevettiiqidcon"
}, {
    match: /\bSahl\w+u\b/i,
    name: "Sahliacabru"
}, {
    match: /\bNogg\w+r\b/i,
    name: "Noggalterpor"
}, {
    match: /\bChma\w+i\b/i,
    name: "Chmageaki"
}, {
    match: /\bVeti\w+a\b/i,
    name: "Veticueca"
}, {
    match: /\bVitt\w+l\b/i,
    name: "Vittesbursul"
}, {
    match: /\bNoot\w+e\b/i,
    name: "Nootanore"
}, {
    match: /\b[IL]nne\w+h\b/i,
    name: "Innebdjerah"
}, {
    match: /\bKisv\w+i\b/i,
    name: "Kisvarcini"
}, {
    match: /\bCuzc\w+r\b/i,
    name: "Cuzcogipper"
}, {
    match: /\bPama\w+u\b/i,
    name: "Pamanhermonsu"
}, {
    match: /\bBrot\w+k\b/i,
    name: "Brotoghek"
}, {
    match: /\bMibi\w+a\b/i,
    name: "Mibittara"
}, {
    match: /\bHuru\w+i\b/i,
    name: "Huruahili"
}, {
    match: /\bRald\w+n\b/i,
    name: "Raldwicarn"
}, {
    match: /\bEzda\w+c\b/i,
    name: "Ezdartlic"
}, {
    match: /\bBade\w+a\b/i,
    name: "Badesclema"
}, {
    match: /\b[IL]sen\w+n\b/i,
    name: "Isenkeyan"
}, {
    match: /\b[IL]ado\w+u\b/i,
    name: "Iadoitesu"
}, {
    match: /\bYagr\w+i\b/i,
    name: "Yagrovoisi"
}, {
    match: /\bEwco\w+o\b/i,
    name: "Ewcomechio"
}, {
    match: /\b[IL]nun\w+a\b/i,
    name: "Inunnunnoda"
}, {
    match: /\bDisc\w+n\b/i,
    name: "Dischiutun"
}, {
    match: /\bYuwa\w+a\b/i,
    name: "Yuwarugha"
}, {
    match: /\b[IL]alm\w+a\b/i,
    name: "Ialmendra"
}, {
    match: /\bRepo\w+e\b/i,
    name: "Reponudrle"
}, {
    match: /\bRinj\w+o\b/i,
    name: "Rinjanagrbo"
}, {
    match: /\bZezi\w+h\b/i,
    name: "Zeziceloh"
}, {
    match: /\bOeil\w+c\b/i,
    name: "Oeileutasc"
}, {
    match: /\bZicn\w+s\b/i,
    name: "Zicniijinis"
}, {
    match: /\bDugn\w+a\b/i,
    name: "Dugnowarilda"
}, {
    match: /\bNeux\w+n\b/i,
    name: "Neuxoisan"
}, {
    match: /\b[IL]{2}me\w+n\b/i,
    name: "Ilmenhorn"
}, {
    match: /\bRukw\w+u\b/i,
    name: "Rukwatsuku"
}, {
    match: /\bNepi\w+u\b/i,
    name: "Nepitzaspru"
}, {
    match: /\bChce\w+g\b/i,
    name: "Chcehoemig"
}, {
    match: /\bHaff\w+n\b/i,
    name: "Haffneyrin"
}, {
    match: /\bUlic\w+i\b/i,
    name: "Uliciawai"
}, {
    match: /\bTuhg\w+d\b/i,
    name: "Tuhgrespod"
}, {
    match: /\b[IL]ous\w+a\b/i,
    name: "Iousongola"
}, {
    match: /\bOdya\w+i\b/i,
    name: "Odyalutai"
}]
