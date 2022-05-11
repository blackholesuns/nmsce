export const Version = "1.1.0"

/** @type {{Version: string, Title: string, Authors: string[], Changes: string[]}[]} */
export const ChangeLog = [
    {
        Version: "1.1.0",
        Title: "Weight Shedding",
        Authors: ["CEbbinghaus"],
        Changes: [
            "Deleted BHS files and references to them",
            "Moved NMSCE app to root and renamed cedata to upload",
            "Fixed issue with which the app was impossible to debug without firebase cli",
            "Changed to use clean names without .html",
            "Fixed Galaxy selector removing unordered list and converting to text input",
            "Added This Changelog you are looking at :3"
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
            "Various Smaller Fixes"
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