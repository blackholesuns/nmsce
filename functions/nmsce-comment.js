'use strict'

const { setTimeout: setTimeoutPromise } = require('node:timers/promises')
const login = require('./personalBot.json')
const snoowrap = require('snoowrap')
const r = new snoowrap(login)

main()
async function main() {
    r.config({
        continueAfterRatelimitError: true,
        requestTimeout: 90000
    })

    let user = await r.getUser('spiper01')

    let posts = await user.getSubmissions({
        limit: 1000,
        type: "links",
        sort: "new",
        // after: "t3_gl7l0k"
    }).catch(err => console.log(err.message))

    if (posts.length > 0) {
        console.log("post", posts.length)
        let found = 0

        for (let post of posts) {
            if (post.subreddit_name_prefixed === "r/NMSCoordinateExchange") {
                let fullPost = await post.fetch()
                
                for (let comment of fullPost.comments) {
                    if (comment.author.name === 'spiper01' && comment.body.includes("NMSCE web app")) {
                        let c = await r.getComment(comment.id).fetch()
                        let m = c.body.match(/.*preview.html\?(.*?)\)/)
                        
                        // await c.edit(statement + (m ? m[1] : ""))
                        console.log("https://reddit.com" + post.permalink)

                        // await setTimeoutPromise(4000)
                        ++found
                        break
                    }
                }
            }

            if (found)break
        }

        console.log("replaced" + found)
    }
}

const statement = "I can no longer reply to comments on this post so please follow all the previous top posters that used to post here to their new home at r/NMSGlyphExchange.  \n\nThank you for your support all these years!  \n-Bad Wolf  \n\n\n"
