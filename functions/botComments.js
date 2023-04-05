'use strict'

const { setTimeout: setTimeoutPromise } = require('node:timers/promises')

async function main() {
    const login = require('./nmsce-bot.json')
    const snoowrap = require('snoowrap')
    const reddit = new snoowrap(login)
    reddit.config({
        continueAfterRatelimitError: true,
        requestTimeout: 90000
    })

    const user = await reddit.getUser("nmsceBot")

    const comments = await user.getComments({
        limit: 1000,
        sort: "new"
    })

    console.log("comments ", comments.length)
    let first = 0
    let max = {}
    max.time = 0

    let total = 0
    let count = 0
    let hours = []
    for (let i = 0; i < 24; ++i)
        hours.push({ total: 0, count: 0, max: 0 })

    for (let comment of comments) {
        if (comment.body === "!filter-First Post") {
            ++first

            let post = await reddit.getSubmission(comment.parent_id).fetch().catch(err => console.log(err))

            if (post && post.approved_at_utc && post.num_reports === 0) {
                let time = post.approved_at_utc - post.created_utc
                ++count
                total += time

                let created = new Date(post.created_utc * 1000).getHours()
                ++hours[created].count
                hours[created].total += time

                if (time > hours[created].max)
                    hours[created].max = time

                if (time > max.time) {
                    max.time = time
                    max.post = post
                }

                console.log(post.id)
            }
            else if (post.num_reports)
                console.log("skipped", JSON.stringify(post))

            await setTimeoutPromise(1500)
        }
    }

    console.log("max", (max.time / 60 / 60).toFixed(2), permaLinkHdr + max.post.permalink)
    console.log("avg", (total / count / 60 / 60).toFixed(2))
    console.log("hour, count, max, avg")

    for (let i = 0; i < 24; ++i)
        console.log(i, hours[i].count, (hours[i].max / 60 / 60).toFixed(2), (hours[i].total / hours[i].count / 60 / 60).toFixed(2))

    comments.sort((a, b) => b.created_utc - a.created_utc)
    console.log(first, new Date(comments[0].created_utc * 1000).toUTCString(), new Date(comments[comments.length - 1].created_utc * 1000).toUTCString())
}

main()

const permaLinkHdr = "https://reddit.com"
