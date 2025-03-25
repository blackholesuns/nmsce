'use strict'

const login = require('./nmsce-bot.json')
const pushshift = require('./pushshift.json')
const snoowrap = require('snoowrap')
const r = new snoowrap(login)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

main()
async function main() {
    const server = 'https://api.pushshift.io/reddit/search/submission?'
    //const server = 'https://api.pushshift.io/reddit/search/comment?'
    let search = new URLSearchParams({
        subreddit: 'NoMansSkyTheGame',
        since: 1672531200, // Jan 1 2023
        //since: 1704067200, // Jan 1 2024
        until: 1704067200, //9999999999, // newest post
        sort: 'created_utc',
        order: 'desc',
        agg_size: 25,
        shard_size: 1.5,
        track_total_hits: false,
        limit: 500,
        // filter: 'id,title,link_flair_text,created_utc,removed_by_category'
        filter: 'thumbnail,created_utc,removed_by_category'
    })

    const headers = new Headers({
        'accept': 'application/json',
        'Authorization': 'Bearer ' + pushshift.token
    })

    // run to get new token from the old.
    // let response = await fetch("https://auth.pushshift.io/refresh?access_token="+pushshift.token, {method:'POST'})
    // let res = await response.json() // { detail: 'Access token is still active and can not be refreshed.' }
    // console.log(res)
    // return

    let posts = []

    do {
        let result = await fetch(server + search.toString(), { method: 'GET', headers: headers })
        posts = (await result.json()).data

        let lastpost = posts && posts.length > 0 ? posts[posts.length - 1] : null

        if (lastpost) {
            let time = new Date(lastpost.created_utc * 1000)
            console.error(posts.length, lastpost.created_utc, time.toLocaleString())
            search.set("until", lastpost.created_utc)
            //console.log(search.toString())

            for (let post of posts) {
                if (post.removed_by_category || !post.thumbnail.match(/https.*redditmedia/i))
                    continue

                console.log(post.created_utc, post.thumbnail)
            }
        }

        await delay(1000)
    } while (posts && posts.length > 0)
}
