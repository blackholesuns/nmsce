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

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

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

    setInterval(() => getModqueue(), 13 * 1000)     // for moderator commands
    setInterval(() => getNew(), 61 * 1000)          // post limits, etc.
}

async function loadSettings(post) {
    let p = []

    p.push(sub.getRules().then(r => {
        for (let x of r.rules)
            rules.push(x.description)
    }).catch(err => error(err, "rules")))

    await delay(7000)

    p.push(sub.getModerators().then(m => {
        for (let x of m)
            mods.push(x.id)
    }).catch(err => error(err, "mod")))

    return Promise.all(p).then(async () => {
        if (mods.length === 0 || rules.length === 0) {
            console.log("retry load settings")
            await delay(41000)
            return loadSettings()
        }
    })
}

function getWeekly() {
    // single searches at startup to get post for long posting limits

    let p = []

    p.push(sub.search({
        query: 'flair_text:Video',
        time: "week",
        limit: 1000,
        sort: "new"
    }).then(posts => {
        console.log("Video", posts.length)

        if (posts.length > 0) {
            posts = posts.sort((a, b) => a.created_utc - b.created_utc)
            checkPostLimits(posts)
        }
    }))

    await delay(7000)

    p.push(sub.search({
        query: 'flair_id:Community',
        time: "week",
        limit: 1000,
        sort: "new"
    }).then(posts => {
        console.log("Community", posts.length)

        if (posts.length > 0) {
            posts = posts.sort((a, b) => a.created_utc - b.created_utc)
            checkPostLimits(posts)
        }
    }))

    return Promise.all(p)
}

async function getNew() {
    let start = new Date()
    let date = parseInt(start.valueOf() / 1000)  // reddit time does not include ms so === epoch / 1000
    const recheck = 30 * 60   // timeout jic we get a bad lastPost.name so it should be set to possible time between posts
    let p = []

    p.push(sub.getNew(!lastPost.name ? {
        limit: 200 // day
    } : lastPost.full + recheck < date ? {
        limit: 10 // hour
    } : {
        before: lastPost.name
    }).then(async posts => {
        let p = []

        // if (!lastPost.name || lastPost.full + recheck < date)
        // console.log(posts.length, "posts / ", parseInt((posts[0].created_utc - posts[posts.length - 1].created_utc) / 60), "minutes")

        if (posts.length > 0) {
            lastPost = posts[0]
            posts = posts.sort((a, b) => a.created_utc - b.created_utc)

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

    let end = new Date().valueOf()
    // console.log("posts", start.toUTCString(), end - start.valueOf(), "ms")
}

async function getModqueue() {
    let start = new Date()
    let p = []

    p.push(sub.getModqueue().then(posts => {
        let p = []
        p.push(checkReported(posts))
        p.push(modCommands(posts, mods))
        return Promise.all(p)
    }).catch(err => error(err, 2)))

    await Promise.all(p)

    let end = new Date().valueOf()
    // console.log("modqueue", start.toUTCString(), end - start.valueOf(), "ms")
}

async function checkPostLimits(posts, approve) {
    let p = []
    let now = new Date().valueOf() / 1000

    for (let post of posts) {
        if (!post.name.includes("t3_") || post.selftext === "[deleted]")
            continue



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
                    .catch(err => error(err, 12)))
            }

            p.push(post.remove().catch(err => error(err, 13)))
        }
        else {
            if (approve) {
                console.log("approve", permaLinkHdr + post.permalink)
                p.push(post.approve().catch(err => error(err, 14)))
            }

            if (typeof limit.start_utc !== "undefined" && post.created_utc > limit.start_utc
                || typeof limit.time !== "undefined" && now - post.created_utc < limit.time) {

                user.history.push(post)
            }
        }
    }

    return Promise.all(p)
}

async function checkFlair(posts) {
    let p = []

    for (let post of posts) {
        if (!post.name.includes("t3_") || post.selftext === "[deleted]")
            continue

        // check for videos not using video flair
        if (post.link_flair_template_id !== "9e4276b2-a4d1-11ec-94cc-4ea5a9f5f267"
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
            }
        }

        return Promise.all(p)
    }
}

function checkReported(posts) {
    let p = []
    for (let post of posts) {
        if ((post.author.name === "AutoModerator" || post.author.name === "nmsceBot") && post.body[0] !== '!')
            p.push(post.approve())  // idiots reporting automod & bot comments
    }

    return Promise.all(p)
}

async function getContest(post) {

    let posts = await sub.search({
        query: 'flair_name:"' + post.link_flair_text + '"',
        time: "month",
        limit: 1000,
        sort: "new"
    })

    if (posts.length > 0)
        checkContest(posts, contest)

    let end = new Date().valueOf()
    // console.log("contest", start.toUTCString(), end - start.valueOf(), "ms")
}

async function modCommands(posts, mods) {
    let p = []
    // console.log("queue", posts.length)

    for (let post of posts) {
        if (post.name.startsWith("t1_")) {
            let match = post.body.match(/!\W?(contest|flair|r|cc)\W?(.*)?/i)

            if (match) {
                console.log("command", post.body, permaLinkHdr + post.permalink)

                let m = match[1].toLowerCase()
                let op
                let parent
                let id = post.parent_id

                if (id.startsWith("t1_"))
                    parent = await reddit.getComment(id).fetch()   // trace back up comment thread
                else
                    parent = await reddit.getSubmission(id).fetch()   // get post

                id = parent.parent_id

                while (typeof id !== "undefined" && id.startsWith("t1_")) {
                    op = await reddit.getComment(id).fetch()   // trace back up comment thread
                    id = op.parent_id
                }

                if (id !== parent.parent_id)
                    op = await reddit.getSubmission(id).fetch()   // get post
                else
                    op = parent

                p.push(post.remove().catch(err => error(err, 20)))

                if (mods.includes(post.author_fullname)) {
                    switch (m) {
                        case "r": p.push(removePost(post, op)); break               // remove post
                        case "cc": p.push(setFlair(post, op, "Community Content")); break       // set community flair
                        case "contest": p.push(contestResults(post, op)); break     // get contest
                    }
                }

                if (post.is_submitter) {
                    switch (m) {
                        case "flair": p.push(setFlair(post, op)); break      // set flair
                    }
                }
            }
        }
    }

    return Promise.all(p)
}

function setFlair(post, op) {
    let p = []

    let m = post.body.match(/!\W?flair:(.*)/)

    if (m) {
        if (m[1].match(/answered/i)) {
            op.link_flair_template_id = "30e40f0c-948f-11eb-bc74-0e0c6b05f4ff"
            op.link_flair_text = "Answered"
        }
        else
            op.link_flair_text = m[1]

        p.push(op.selectFlair({
            flair_template_id: op.link_flair_template_id,
            text: op.link_flair_text
        }).catch(err => error(err, 21)))

        console.log("set flair", op.link_flair_text, permaLinkHdr + op.permalink)

        let posts = []
        posts.push(op)

        p.push(checkPostLimits(posts, true))    // approve post if limit ok
    }

    return Promise.all(p)
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
        .catch(err => error(err, 29)))

    p.push(op.remove()
        .catch(err => error(err, 30)))

    console.log("remove post: rule: " + list + " " + permaLinkHdr + op.permalink)

    return Promise.all(p)
}

async function checkContest(posts, contest) {
    let total = 0
    let entries = []

    for (let post of posts) {
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

    return post xx
}

function error(err, add) {
    console.log(new Date().toUTCString(), add ? add : "", err.name, err.message)
    // console.log(err)
}

const thankYou = 'Thank You for posting to r/NoMansSkyTheGame!  \n\n'
const removedPost = 'Your post has been removed because it violates the following rules for posting:  \n\n'
const postLimit = "Posting limit exceded: OP is allowed to make "
const contestLimit = "Contest limit exceded: OP is allowed to make "
const botSig = "  \n*This action was taken by the nmstgBot. If you have any questions please contact the [moderators](https://www.reddit.com/message/compose/?to=/r/NoMansSkyTheGame).*  \n"
const permaLinkHdr = "https://reddit.com"
const editCommunityFlair = "Please edit this flair to be your community/site name. If you have trouble editing use '!flair:[name]' to have the bot edit it for you. e.g. '!flair:NoMansSkyTheGame'  \n"
