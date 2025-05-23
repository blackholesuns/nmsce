/** @type {{Version: string, Title: string, Authors: string[], Changes: string[]}[]} */
export const ChangeLog = [
    {
        Version: "1.3.2",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Rebrand to NMS Coordinate Exchange"
        ]
    }, {
        Version: "1.3.1",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Replace fontawesome because it went behind a paywall with boxicons"
        ]
    }, {
        Version: "1.3.0",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Add interceptor thruster selection"
        ]
    }, {
        Version: "1.2.9",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Temp fix for address checking. Purple systems are outside of the original system number limits.",
            "Adding new planet types & materials"
        ]
    }, {
        Version: "1.2.8",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Fix interceptor U-Wing parts selection"
        ]
    }, {
        Version: "1.2.7",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Upgrade to firebase v10.12.5",
            "Fix login",
            "Delete Patreon"
        ]
    }, {
        Version: "1.2.6",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Add exclude part to search selection. Click a part to cycle through selected, excluded & not selected.",
            "Add 'Exact Match' to ship color selection. If selected it won't return ships with any other colors selected."
        ]
    }, {
        Version: "1.2.5",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Add build menu to help create Reddit post titles."
        ]
    }, {
        Version: "1.2.4",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Update to firebase 9.23.0. Add count of items found for search."
        ]
    }, {
        Version: "1.2.3",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Default sub & flair for posting to r/NMSGlyphExchange."
        ]
    }, {
        Version: "1.2.2",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Clean up mobile interface. Close keyboard when entering glyphs via buttons. Resize parts map."
        ]
    }, {
        Version: "1.2.1",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Add favorites voting & display to tab thumbnail list."
        ]
    }, {
        Version: "1.2.0",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Got rid of required galaxy selection on searching. Use 'Select All' (default) to search across all galaxies.",
            "Platform requirement has been removed.",
            "Player listings now include all galaxies.",
            "Menus are rewritten so you can type to get to any item."
        ]
    }, {
        Version: "1.1.9",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Improve color & tag searching."
        ]
    }, {
        Version: "1.1.8",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Moved Living Ships into normal ships tab. Fixed input for always crashed ships."
        ]
    }, {
        Version: "1.1.7",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Added interceptor ships. First pass. Still needs some data entry changes."
        ]
    }, {
        Version: "1.1.6",
        Title: " ",
        Authors: ["CEbbinghaus"],
        Changes: [
            "Fixed the submissions triggering page reload due to form.",
            "Prevented overflow in the Horizontal causing needless scrollbars",
            "Added scrollbar to update notes & restricted panel height"
        ]
    }, {
        Version: "1.1.5",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Added save/reload button for image settings. Fixed galaxy display on image."
        ]
    }, {
        Version: "1.1.4",
        Title: " ",
        Authors: ["CEbbinghaus"],
        Changes: [
            "Fixed bug allowing invalid Galaxy names to be submitted."
        ]
    }, {
        Version: "1.1.3",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Start rebranding to NMSGE"
        ]
    }, {
        Version: "1.1.2",
        Title: " ",
        Authors: ["spip01"],
        Changes: [
            "Added new NMS version names & numbers"
        ]
    }, {
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

export function CollateChangeLog() {
    let result = "";
    for (let change of ChangeLog) {
        let title = (change.Title && `: ${change.Title}`) || "";
        result += `
        <article>
            <h3 style="font-weight: bold;">v${change.Version}${title}</h3>
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
