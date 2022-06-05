export const Version = "1.1.0"

/** @type {{Version: string, Title: string, Authors: string[], Changes: string[]}[]} */
export const ChangeLog = [
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
            "Fixed Galaxy selector removing unordered list and converting to text input",
            "Added validation to the Galaxy input",
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