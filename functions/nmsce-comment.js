'use strict'

const login = require('./personalBot.json')
const snoowrap = require('snoowrap')
const r = new snoowrap(login)

const message = `Please don't repost this to NMSCE. I can not reply to any comments made on this post so if you have questions please pm me. Follow me to r/NMSGlyphExchange.`

main()
async function main() {
    let p = []

    r.config({
        continueAfterRatelimitError: true,
        requestTimeout: 90000
    })

    let user = await r.getUser('spiper01')

    let posts = await user.getSubmissions({
        limit: 1000,
        type: "links",
        sort: "new",
        after: "t3_ubj44o"
    }).catch(err => console.log(err.message))

    if (posts.length > 0) {
        console.log("post", posts.length)
        // // let last = {}
        // // let found = false

        // for (let post of posts) {
        //     if (post.subreddit_name_prefixed === "r/NMSCoordinateExchange") {
        //         let fullPost = await post.fetch()

        //         for (let comment of fullPost.comments) {
        //             if (comment.author.name === 'spiper01' && comment.body.includes("NMSCE web app")) {
        //                 let c = await r.getComment(comment.id).fetch()
        //                 await c.edit("I can no longer reply to comments on this post so please follow all the previous top posters that used to post here to their new home at r/NMSGlyphExchange.  \n\nThank you for your support all these years!  -Bad Wolf")
        //                 // found = true
        //                 break
        //             }
        //         }

        //         // if (found)
        //         //     break
        //     }

        //     // last = post
        // }

        // // console.log(last.name)
    }

    return Promise.all(p)
}
