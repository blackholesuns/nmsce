/** @type {{Version: string, Title: string, Authors: string[], Changes: string[]}[]} */
export const ChangeLog = [
    {
        Version: "1.1.3",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Start rebranding to NMSGE"
        ]
    },  {
        Version: "1.1.2",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Added new NMS version names & numbers"
        ]
    },    {
        Version: "1.1.1",
        Title: "Godspeed",
        Authors: ["CEbbinghaus"],
        Changes: [
            "Moved entire site to Cloudflare (sorry for the outage)",
            "Added better image storing with dedicated subdomain", 
            "Decreased Latency by Caching images on the edge",
            "Decreased Load times by skipping querying the URL"
        ]
    },
    {
        Version: "1.1.0",
        Title: "Weight Shedding",
        Authors: ["CEbbinghaus"],
        Changes: [
            "Added This Changelog you are looking at :3",
            "Deleted BHS files and references to them",
            "Moved NMSCE app to root and renamed cedata to upload",
            "Changed to use clean names without .html",
            "Fixed issue with which the app was impossible to debug without firebase cli",
            "Fixed Error with loading Overlay when uploading",
            "Improved Reddit interaction fixing it for alpha,beta and local dev environments",
            "Improved Galaxy Input",
            "Fixed System Search button in Preview",
            "Fixed Error when trying to delete a submission"
        ]
    },
    {
        Version: "1.0.0",
        Title: "ESM Update",
        Authors: ["CEbbinghaus"],
        Changes: [
            "Moved files to ES6 Module format",
            "Updated Firebase libraries to V9",
            "Moved Prototype functions to Classes",
            "Lots and Lots of Smaller Fixes (Too many to count)"
        ]
    }
]

export const Version = ChangeLog[0].Version

export function CollateChangeLog(){
    let result = "";
    for(let change of ChangeLog)
    {
        result += `
        <article>
            <h3 style="font-weight: bold;">v${change.Version}: ${change.Title}</h3>
            ${change.Authors.map(v => `<a style="font-size: 1rem;" href="https://github.com/${v}">@${v}</a>`).join("\n")}
            <ul id="changes">
            ${change.Changes.map(v => 
                `<li><p style="font-size: .85rem; margin-bottom: 5px;">${v}</p></li>`
                ).join("\n")
            }
            </ul>
        </article>
        `
    }
    return result;
}
