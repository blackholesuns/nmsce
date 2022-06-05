import "https://not-an-aardvark.github.io/snoowrap/snoowrap-v1.js"
import { Version } from "./metadata.js";

// Should be replaced with a ES6 Import of https://www.npmjs.com/package/snoowrap
// Documentation for Snoowrap can be found here: https://not-an-aardvark.github.io/snoowrap (not super good)

// Reddit API Documentation: https://www.reddit.com/dev/api
// Reddit OAuth Documentation: https://github.com/reddit-archive/reddit/wiki/OAuth2
// Reddit User Agent Documentation: https://github.com/reddit-archive/reddit/wiki/API#rules

// Configurations

// const reddit = {
//     client_id: "8oDpVp9JDDN7ng",
//     redirect_url: "http://nmsce.com/upload",
//     scope: "identity,submit,mysubreddits,flair",
//     auth_url: "https://www.reddit.com/api/v1/authorize",
//     token_url: "https://ssl.reddit.com/api/v1/access_token",
//     api_oauth_url: "https://oauth.reddit.com",
//     subscriber_endpt: "/subreddits/mine/subscriber",
//     user_endpt: "/api/v1/me",
//     getflair_endpt: "api/link_flair_v2",
//     submitLink_endpt: "/api/submit",
//     comment_endpt: "/api/comment",
// };

const reddit = {
    client_id: "lFPOgWOPUR3QAx-gZzeEyA",
    redirect_url: "http://localhost:5000/auth/reddit",
    scopes: ["identity", "submit", "mysubreddits", "flair"],
    user_agent: `Web:NMSCE:${Version} (by u/spiper01 & u/cebbinghaus)`
};

// Implementaion

/** @type {snoowrap} */
let instance = null;


/**
 * Tries to retrieve the token from the cache and authenticate using it
 * 
 * @export
 * @returns 
 */
export function TryCachedAuthentication(){
    let accessToken = window.localStorage.getItem('nmsce-reddit-access-token');
    if(!accessToken)
        return false;
    instance = new snoowrap({accessToken});
    return true;
}


/**
 * Returns if Reddit is Authenticated
 * @export
 * @returns {boolean} Authenticated
 */
export function IsAuthenticated() {
    return instance != null;
}

/**
 * Returns the Snoowrap object
 * @export
 * @returns {snoowarp} Snoowrap
 */
export function UNSAFE__GetSnoowrap() {
    return instance;
}

/**
 * Returns the Authentication Url to navigate to
 * @export
 * @param {string} state 
 * @returns {string} AuthUrl or Null if access was not granted
 */
export function GetAuthUrl(state) {
    return snoowrap.getAuthUrl({
        clientId: reddit.client_id,
        scope: reddit.scopes,
        redirectUri: reddit.redirect_url,
        permanent: true,
        state: state
    });
}

/**
 * Authenticates the user with the code to retrieve a token
 * @export @async
 * @param {string} code 
 * @returns {string} Token
 */
export async function GetTokenFromCode(code) {
    instance = await snoowrap.fromAuthCode({
        code: code,
        userAgent: reddit.user_agent,
        clientId: reddit.client_id,
        redirectUri: reddit.redirect_url
    });

    console.log(instance);
    
    window.localStorage.setItem('nmsce-reddit-access-token', instance.accessToken);
}

/**
 * Authenticates the user with the code to retrieve a token
 * @export @async
 * @returns {Promise<Map<string, subreddit>>} Token
 */
export async function GetSubredditMap() {
    if(!instance)
        throw "No user is authentidcated";

    const cached = window.localStorage.getItem('nmsce-reddit-subreddits');
    if(cached && ["{}", "null", "undefined"].indexOf(cached) == -1)
        return new Map(JSON.parse(cached));

    const result = new Map();
    const subreddits = await instance.getSubscriptions({limit: 9999});
    for(let i = 0; i < subreddits.length; ++i)
    {
        let subreddit = subreddits[i];
        if(subreddit.over18 || subreddit.subreddit_type == 'user')
            continue;
        
        result.set(subreddit.display_name, {
            name: subreddit.display_name_prefixed,
            url: subreddit.url,
            link: subreddit.name
        });
    }
    window.localStorage.setItem('nmsce-reddit-subreddits', JSON.stringify(Array.from(result)));
    return result;
}