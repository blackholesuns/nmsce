'use strict'

const { promises } = require('nodemailer/lib/xoauth2')
const login = require('./nmsce-bot.json')
const snoowrap = require('snoowrap')
const reddit = new snoowrap(login)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

var sub
var lastPost = {}
var rules = []
var mods = []

const contestFlair = "Ship Build Contest"

main()
async function main() {
    console.log("\nnmstg restart", new Date().toUTCString())

    reddit.config({
        continueAfterRatelimitError: true,
        requestTimeout: 90000,
        retryErrorCodes: [-3008, -4077, -4078, 429, 500, 502, 503, 504],
        maxRetryAttempts: 10
    })

    sub = await reddit.getSubreddit('NoMansSkyTheGame')

    await loadSettings()

    setInterval(() => getModqueue(), 13 * 1000)     // for moderator commands
    setInterval(() => getNew(), 31 * 1000)          // post limits, etc.
}

async function getNew() {
    let start = new Date()
    let date = parseInt(start.valueOf() / 1000)  // reddit time does not include ms so === epoch / 1000
    const recheck = 5 * 60 * 60   // timeout jic we get a bad lastPost.name so it should be set to possible time between posts
    let p = []

    p.push(sub.getNew(!lastPost.name ? {
        limit: 200
    } : lastPost.full + recheck < date ? {
        limit: 10 // make sure to go back past deleted last post
    } : {
        before: lastPost.name
    }).then(async posts => {
        let p = []

        if (posts.length > 100) {
            let t = ((posts[0].created_utc - posts[posts.length - 1].created_utc) / (60 * 60)).toFixed(2)
            console.log("read", posts.length, t + " hr", (posts.length / t).toFixed(1), "/hr")
        }

        if (posts.length > 0) {
            lastPost = posts[0]
            p.push(checkPostLimits(posts))
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
    }).catch(err => error(err, 1)))

    await Promise.all(p)
}

async function getModqueue() {
    let p = []

    p.push(sub.getModqueue().then(posts => {
        let p = []
        p.push(modCommands(posts, mods))
        return Promise.all(p)
    }).catch(err => error(err, 2)))

    await Promise.all(p)
}

async function loadSettings() {
    let p = []

    p.push(sub.getRules().then(r => {
        rules = []

        for (let x of r.rules)
            rules.push(x.description)
    }).catch(err => error(err, "rules")))

    p.push(sub.getModerators().then(m => {
        mods = []

        for (let x of m)
            mods.push(x.id)
    }).catch(err => error(err, "mod")))

    return Promise.all(p).then(async () => {
        if (mods.length === 0 || rules.length === 0) {
            console.log("retry load settings")
            await delay(30000)
            return loadSettings()
        }
    })
}

async function checkPostLimits(posts) {
    const communityID = "9e4276b2-a4d1-11ec-94cc-4ea5a9f5f267"
    const now = new Date().getTime() / 1000
    const hour = 60 * 60
    const day = 24 * hour
    const week = 7 * day

    let p = []

    posts = posts.sort((a, b) => a.author.name >= b.author.name ? 1 : -1)
    checkFlair(posts)

    let last = null

    for (let post of posts) {
        if (!last || post.author.name !== last.author.name) {       // only do this once/author
            last = post

            let author = await sub.search({ query: "author:" + post.author.name, sort: "new", time: contestFlair ? "month" : "week" }) // if contest then use month if not use week

            let contest = author.filter(a => contestFlair && a.link_flair_text && a.link_flair_text.includes(contestFlair))
            let video = author.filter(a => a.link_flair_text && a.link_flair_text.includes("Video"))
            let community = author.filter(a => a.link_flair_text && a.link_flair_template_id === communityID
                && (!a.approved_by || a.approved_by !== "nmsceBot")) // leave mod approved stuff up

            let hour = author.filter(a => a.link_flair_text
                && !a.link_flair_text.includes(contestFlair)        // post checked elsewhere don't count towards hourly limit
                && !a.link_flair_text.includes("Video")
                && a.link_flair_template_id !== communityID)

            for (let i = 0; i < contest.length - 3; ++i)
                p.push(overLimit(contest[i], "3 post for contest"))

            for (let i = 0; i < video.length - 2; ++i)
                if (now - video[i].created_utc < day && video[i].created_utc - video[i + 2].created_utc < week)
                    p.push(overLimit(video[i], "2 video posts/week"))

            for (let i = 0; i < community.length - 2; ++i)
                if (now - community[i].created_utc < day
                    && community[i].created_utc - community[i + 2].created_utc < week)
                    p.push(overLimit(community[i], "2 community content posts/week"))

            for (let i = 0; i < hour.length - 2; ++i)
                if (now - hour[i].created_utc < day && hour[i].created_utc - hour[i + 2].created_utc < hour)
                    p.push(overLimit(hour[i], "2 posts/hour", new Date((hour[i + 2].created_utc + hour) * 1000).toUTCString()))

            delay(1000)
        }
    }

    return Promise.all(p).then(async () => {
        if (posts.length > 100)
            console.log("start up done")
    })
}

async function overLimit(post, str, time) {
    let p = []
    let message = removedPost + postLimit + str + ".  \n"

    if (time)
        message += "Your next post can be made after " + time + ".  \n"

    message += botSig

    p.push(post.reply(message)
        .distinguish({
            status: true,
            sticky: true
        }).lock().catch(err => error(err, "lim0")))

    p.push(post.remove().catch(err => error(err, "lim1")))

    console.log("over limit", str, permaLinkHdr + post.permalink)
    delay(2000)

    await Promise.all(p)
}

async function modCommands(posts, mods) {
    let p = []
    // console.log("queue", posts.length)

    for (let post of posts) {
        if (post.name.startsWith("t1_")) {
            let match = post.body.match(/!\W?(contest|reload|flair|cc|r)\W?(.*)?/i)

            if (match) {
                console.log("command", match[1], match[2], permaLinkHdr + post.permalink)

                let op = post

                while (typeof op.parent_id !== "undefined" && op.parent_id.startsWith("t1_"))
                    op = await reddit.getComment(op.parent_id).fetch()   // trace back up comment thread

                op = await reddit.getSubmission(op.parent_id).fetch()   // get post

                p.push(post.remove().catch(err => error(err, 20)))

                if (mods.includes(post.author_fullname)) {
                    switch (match[1].toLowerCase()) {
                        case "r": p.push(removePost(op, match[2])); break           // remove post for rule violation
                        case "cc": p.push(setFlair(op, "Community Content")); break // change flair to community content
                        case "reload": p.push(loadSettings()); break              // reload settings
                        case "contest": p.push(getContest(post, op, match[2])); break   // get contest results
                    }
                }

                if (post.is_submitter) {
                    switch (match[1].toLowerCase()) {
                        case "flair": p.push(setFlair(op, match[2])); break      // set flair
                    }
                }
            }
        }
    }

    return Promise.all(p)
}

async function setFlair(post, cmd) {
    let p = []

    if (cmd === "Community Content") {
        post.link_flair_template_id = "9e4276b2-a4d1-11ec-94cc-4ea5a9f5f267"
        post.link_flair_text = "Community Content"

        p.push(post.reply("Your post has been assigned the 'Community Content' flair, which is for NMS-related content creators, \
            modders, apps, tools, websites, and in-game groups (Civs). You may edit the flair to include your specific name (e.g., \
            channel, mod, or tool) for better visibility. Please use this flair for similar future posts. Thank you.").catch(err => error(err, "cc")))
    }
    else if (cmd.toLowerCase() === "answered") {
        post.link_flair_template_id = "30e40f0c-948f-11eb-bc74-0e0c6b05f4ff"
        post.link_flair_text = "Answered"
    }
    else
        post.link_flair_text = cmd

    p.push(post.selectFlair({
        flair_template_id: post.link_flair_template_id,
        text: post.link_flair_text
    }).catch(err => error(err, 21)))

    p.push(post.approve().catch(err => error(err, "lim4")))

    await Promise.all(p)

    console.log("set flair", post.link_flair_text, permaLinkHdr + post.permalink)

    return checkPostLimits([post])
}

async function checkFlair(posts) {
    let p = []

    // check for videos not using video flair
    for (let post of posts) {
        if (!post.link_flair_text) {  // somehow a post got made with no flair
            console.log("ERROR no flair", permaLinkHdr + post.permalink)
            continue
        }

        if (post.link_flair_template_id !== "9e4276b2-a4d1-11ec-94cc-4ea5a9f5f267" // community content flair
            && !post.link_flair_text.includes("Bug") && !post.link_flair_text.includes("Video")
            && !post.link_flair_text.includes("Question") && !post.link_flair_text.includes("Answered")) {

            if (typeof post.url !== "undefined" && post.url.match(/youtube\.com|twitch\.tv/gi)
                || post.selftext.match(/youtu\.be|youtube\.com|twitch\.tv|bitchute.com/gi)
                || typeof post.secure_media !== "undefined" && post.secure_media
                && (typeof post.secure_media.reddit_video !== "undefined"
                    || typeof post.secure_media.oembed !== "undefined" && (post.secure_media.oembed.type === "video"
                        || post.secure_media.type === "twitch.tv"))) {

                post.link_flair_text += " Video"
                console.log("add video flair: " + permaLinkHdr + post.permalink)

                p.push(post.selectFlair({
                    flair_template_id: post.link_flair_template_id,
                    text: post.link_flair_text
                }).catch(err => error(err, 6)))

                delay(2000)
            }
        }
    }

    await Promise.all(p)
}

function removePost(post, cmd) {
    let message = thankYou + removedPost
    let list = cmd.split(",")
    let p = []

    for (let r of list) {
        let i = parseInt(r) - 1
        message += typeof rules[i] !== "undefined" ? rules[i] + "  \n\n" : ""
    }

    message += botSig

    p.push(post.reply(message)
        .distinguish({
            status: true
        }).lock()
        .catch(err => error(err, 29)))

    p.push(post.remove()
        .catch(err => error(err, 30)))

    console.log("remove post: rule: " + list + " " + permaLinkHdr + post.permalink)

    return Promise.all(p)
}

async function getContest(post, op, cmd) {
    let total = 0
    let entries = []

    if (!cmd)
        cmd = op.link_flair_text

    let posts = await sub.search({ query: "flair_text:" + cmd, sort: "new", time: "month" })
        .catch(err => error(err, "lim2"))

    for (let post of posts) {
        let comments = 0

        let replies = await post.expandReplies().comments

        if (replies.length)
            for (let r of replies) {  // top level comments only
                if (r.author_fullname !== post.author_fullname)
                    comments++
            }

        total += post.ups + post.downs + post.total_awards_received + comments

        entries.push({
            link: post.permalink,
            id: post.id,
            votes: post.ups + post.downs + post.total_awards_received + comments,
            title: post.title,
        })
    }

    let text = "Contest: " + cmd + "  \n"
    text += "Updated: " + new Date().toUTCString() + "  \n"
    text += "Total Entries: " + entries.length + "  \n"
    text += "Total Votes: " + total + "  \n"
    text += "Position|Votes|Link\n---|---|---\n"

    entries.sort((a, b) => b.votes - a.votes)
    for (let i = 0; i < 6 && i < entries.length; ++i)
        text += (i + 1) + "| " + entries[i].votes + "| [" + entries[i].title + "](" + permaLinkHdr + entries[i].link + ")  \n"

    // return post.reply(text).catch(err => error(err, 32))

    return reddit.composeMessage({
        to: post.author.name,
        fromSubreddit: "NoMansSkyTheGame",
        subject: cmd + "Results",
        text: text
    }).catch(err => error(err, 32))
}

function error(err, add) {
    console.log(new Date().toUTCString(), add ? add : "",
        typeof err.cause !== "undefined" ? err.cause.errno : "", err.name, err.message)
    //console.error(err)
}

const thankYou = 'Thank You for posting to r/NoMansSkyTheGame!  \n\n'
const removedPost = 'Your post has been removed because it violates the following rules for posting:  \n\n'
const postLimit = "Posting limit exceded: OP is allowed to make "
const botSig = "  \n*This action was taken by the nmstgBot. If you have any questions please contact the \
                [moderators](https://www.reddit.com/message/compose/?to=/r/NoMansSkyTheGame).*  \n"
const permaLinkHdr = "https://reddit.com"
