'use strict'

const login = require('./nmsce-bot.json')
const pushshift = require('./pushshift.json')
const snoowrap = require('snoowrap')
const r = new snoowrap(login)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

main()
async function main() {
    let sub = await r.getSubreddit('NMSCoordinateExchange')
    r.config({
        continueAfterRatelimitError: true,
        requestTimeout: 90000
    })

    let allFlair = await sub.getLinkFlairTemplates().catch(err => { console.log("get flair", err.error); exit(1) })
    for (let f of allFlair) {
        if (f.flair_text.match(/Multi/)) {
            f.name = "Multi"
            f.write = "Multi Tool"
        } else if (f.flair_text.match(/Staff/)) {
            f.name = "Staff"
            f.write = "Multi Tool"
        } else if (f.flair_text.match(/Living/)) {
            f.name = "Living"
            f.write = "Starship"
        } else if (f.flair_text.match(/Farm/)) {
            f.name = "Farm"
            f.write = "Base"
        } else {
            f.name = f.flair_text.includes("EDIT") ? f.flair_text.split("/")[0] : f.flair_text
            f.write = f.name
        }
    }

    let editFlair = allFlair.filter(f => f.flair_text.match(/EDIT/))

    // pushshift data
    // const server = 'https://api.pushshift.io/reddit/search/submission?'
    const server = 'https://api.pushshift.io/reddit/search/comment?'
    let search = new URLSearchParams({
        subreddit: 'NoMansSkyTheGame',
        since: 1672531200, // Jan 1 2023
        // since: 1704067200, // Jan 1 2024
        until: 9999999999, //9999999999, // newest post
        sort: 'created_utc',
        order: 'desc',
        agg_size: 25,
        shard_size: 1.5,
        track_total_hits: false,
        limit: 500,
        // filter: 'id,title,link_flair_text,created_utc,removed_by_category'
        filter: 'id,author,created_utc,removed_by_category'
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
    let totals = []
    let total = 0

    do {
        let result = await fetch(server + search.toString(), { method: 'GET', headers: headers })
        posts = (await result.json()).data

        total += posts.length
        let lastpost = posts.length > 0 ? posts[posts.length - 1] : null

        if (lastpost) {
            let time = new Date(lastpost.created_utc * 1000)
            console.error(total, lastpost.created_utc, time.toLocaleString(), lastpost.id)
            search.set("until", lastpost.created_utc)
        }

        for (let post of posts) {
            if (post.removed_by_category)
                continue

            let hour = new Date(post.created_utc * 1000).getUTCHours()

            if (typeof totals[hour] === "undefined")
                totals[hour] = []

            let name = getItem(totals[hour], post.author)
            if (!name)
                totals[hour].push({ name: post.author, total: 1 })
            else
                ++name.total
        }

        if (total >= 50000)
            break

        await delay(1000)
    } while (posts.length > 0)

    // for (let h = 0; h < 24; ++h) {
    //     if (typeof totals[h] !== "undefined") {
    //         let person = getItem(totals[h], "E-MingEyeroll")
    //         if (person)
    //         console.log(h, h-5, person)
    //     }
    // }

    for (let h = 0; h < 24; ++h) {
        if (typeof totals[h] !== "undefined") {
            let list = totals[h].filter(a => a.name !== "AutoModerator" && a.name !== "nmsceBot" && a.name !== "[deleted]")
            list = list.sort((a, b) => b.total - a.total)

            console.log(h, h - 5 < 0 ? 24 + h - 5 : h - 5, list[0], list[1], list[3])
        }
    }
}

function checkList(list, post, full) {
    let item = getItem(list, post.link_flair_text)

    if (!item && full) {
        item = getItem(list, post.title)

        if (!item)
            item = getItem(list, post.selftext)
    }
    return item
}

function getItem(list, str) {
    if (!str)
        return null

    for (let s of list) {
        if (typeof s.match === "undefined") {
            if (str.includes(s.name))
                return s
        } else if (str.match(s.match))
            return s
    }

    return null
}

const modeList = [{
    match: /(Custom)|(creative)|(relaxed)|(normal)|(survival)|(expedition)/i,
    name: "Normal"
}, {
    match: /Permadeath|\bPD\b/i,
    name: "Permadeath"
}]

const galaxyList = [{
    match: /\bEuc\w+[de]\b/i,
    name: "Euclid"
}, {
    match: /\bHilb\w+t\b(Dim\w+n\b)?/i,
    name: "Hilbert"
}, {
    match: /\bCal\w+o\b/i,
    name: "Calypso"
}, {
    match: /\bHes\w+s\b(Dim\w+n\b)?/i,
    name: "Hesperius"
}, {
    match: /\bHya\w+s\b/i,
    name: "Hyades"
}, {
    match: /\bIck\w+w\b/i,
    name: "Ickjamatew"
}, {
    match: /\bBud\w+r\b/i,
    name: "Budullangr"
}, {
    match: /\bKik\w+r\b/i,
    name: "Kikolgallr"
}, {
    match: /\bElt\w+n\b/i,
    name: "Eltiensleen"
}, {
    match: /\bEis{1,2}\w+[mn]\b/i,
    name: "Eissentam"
}, {
    match: /\bElk[ua]\w+s\b/i,
    name: "Elkupalos"
}, {
    match: /\bApt\w+a\b/i,
    name: "Aptarkaba"
}, {
    match: /\bOnt\w+p\b/i,
    name: "Ontiniangp"
}, {
    match: /\bOdi\w+i\b/i,
    name: "Odiwagiri"
}, {
    match: /\bOgt\w+i\b/i,
    name: "Ogtialabi"
}, {
    match: /\bMuh\w+o\b/i,
    name: "Muhacksonto"
}, {
    match: /\bHit\w+r\b/i,
    name: "Hitonskyer"
}, {
    match: /\bRer\w+l\b/i,
    name: "Rerasmutul"
}, {
    match: /\bIsa?d\w+g\b/i,
    name: "Isdoraijung"
}, {
    match: /\bDoc\w+a\b/i,
    name: "Doctinawyra"
}, {
    match: /\bLoyc\w+[gq]\b/i,
    name: "Loychazinq"
}, {
    match: /\bZuk\w+a\b/i,
    name: "Zukasizawa"
}, {
    match: /\bEkw\w+e\b/i,
    name: "Ekwathore"
}, {
    match: /\bYebe\w+e\b/i,
    name: "Yeberhahne"
}, {
    match: /\bTwer\w+k\b/i,
    name: "Twerbetek"
}, {
    match: /\bSiv\w+s\b/i,
    name: "Sivarates"
}, {
    match: /\bEaj\w+l\b/i,
    name: "Eajerandal"
}, {
    match: /\bAld\w+i\b/i,
    name: "Aldukesci"
}, {
    match: /\bWot\w+i\b/i,
    name: "Wotyarogii"
}, {
    match: /\bSud\w+l\b/i,
    name: "Sudzerbal"
}, {
    match: /\bMau\w+y\b/i,
    name: "Maupenzhay"
}, {
    match: /\bSugu\w+e\b/i,
    name: "Sugueziume"
}, {
    match: /\bBrog\w+n\b/i,
    name: "Brogoweldian"
}, {
    match: /\bEhb\w+u\b/i,
    name: "Ehbogdenbu"
}, {
    match: /\bIjs\w+s\b/i,
    name: "Ijsenufryos"
}, {
    match: /\bNip\w+a\b/i,
    name: "Nipikulha"
}, {
    match: /\bAut\w+n\b/i,
    name: "Autsurabin"
}, {
    match: /\bLus\w+h\b/i,
    name: "Lusontrygiamh"
}, {
    match: /\bRew\w+a\b/i,
    name: "Rewmanawa"
}, {
    match: /\bEth\w+e\b/i,
    name: "Ethiophodhe"
}, {
    match: /\bUra\w+e\b/i,
    name: "Urastrykle"
}, {
    match: /\bXob\w+j\b/i,
    name: "Xobeurindj"
}, {
    match: /\bOni\w+u\b/i,
    name: "Oniijialdu"
}, {
    match: /\bWuc\w+c\b/i,
    name: "Wucetosucc"
}, {
    match: /\bEby\w+f\b/i,
    name: "Ebyeloof"
}, {
    match: /\bOdya\w+a\b/i,
    name: "Odyavanta"
}, {
    match: /\bMil\w+i\b/i,
    name: "Milekistri"
}, {
    match: /\bWaf\w+h\b/i,
    name: "Waferganh"
}, {
    match: /\bAgn\w+t\b/i,
    name: "Agnusopwit"
}, {
    match: /\bT[ae]y\w+y\b/i,
    name: "Teyaypilny"
}, {
    match: /\bZal\w+m\b/i,
    name: "Zalienkosm"
}, {
    match: /\bLadg\w+f\b/i,
    name: "Ladgudiraf"
}, {
    match: /\bMus\w+e\b/i,
    name: "Mushonponte"
}, {
    match: /\bAms\w+z\b/i,
    name: "Amsentisz"
}, {
    match: /\bFla\w+m\b/i,
    name: "Fladiselm"
}, {
    match: /\bLaa\w+b\b/i,
    name: "Laanawemb"
}, {
    match: /\bIlk\w+r\b/i,
    name: "Ilkerloor"
}, {
    match: /\bDav\w+i\b/i,
    name: "Davanossi"
}, {
    match: /\bPlo\w+u\b/i,
    name: "Ploehrliou"
}, {
    match: /\bCor\w+a\b/i,
    name: "Corpinyaya"
}, {
    match: /\bLec\w+m\b/i,
    name: "Leckandmeram"
}, {
    match: /\bQuu\w+s\b/i,
    name: "Quulngais"
}, {
    match: /\bNok\w+l\b/i,
    name: "Nokokipsechl"
}, {
    match: /\bRinb\w+a\b/i,
    name: "Rinblodesa"
}, {
    match: /\bLoyd\w+n\b/i,
    name: "Loydporpen"
}, {
    match: /\bIbt\w+p\b/i,
    name: "Ibtrevskip"
}, {
    match: /\bElko\w+b\b/i,
    name: "Elkowaldb"
}, {
    match: /\bHeh\w+o\b/i,
    name: "Heholhofsko"
}, {
    match: /\bYebr\w+d\b/i,
    name: "Yebrilowisod"
}, {
    match: /\bHus\w+i\b/i,
    name: "Husalvangewi"
}, {
    match: /\bOvn[\w'’]+d\b/i,
    name: "Ovna'uesed"
}, {
    match: /\bBah\w+y\b/i,
    name: "Bahibusey"
}, {
    match: /\bNuy\w+e\b/i,
    name: "Nuybeliaure"
}, {
    match: /\bDos\w+c\b/i,
    name: "Doshawchuc"
}, {
    match: /\bRuc\w+h\b/i,
    name: "Ruckinarkh"
}, {
    match: /\bTho\w+c\b/i,
    name: "Thorettac"
}, {
    match: /\bNupo\w+u\b/i,
    name: "Nuponoparau"
}, {
    match: /\bMog\w+l\b/i,
    name: "Moglaschil"
}, {
    match: /\bUiw\w+e\b/i,
    name: "Uiweupose"
}, {
    match: /\bNas\w+e\b/i,
    name: "Nasmilete"
}, {
    match: /\bEkd\w+n\b/i,
    name: "Ekdaluskin"
}, {
    match: /\bHak\w+y\b/i,
    name: "Hakapanasy"
}, {
    match: /\bDim\w+a\b/i,
    name: "Dimonimba"
}, {
    match: /\bCaj\w+i\b/i,
    name: "Cajaccari"
}, {
    match: /\bOlo\w+o\b/i,
    name: "Olonerovo"
}, {
    match: /\bUml\w+k\b/i,
    name: "Umlanswick"
}, {
    match: /\bHen\w+m\b/i,
    name: "Henayliszm"
}, {
    match: /\bUtz\w+e\b/i,
    name: "Utzenmate"
}, {
    match: /\bUmi\w+a\b/i,
    name: "Umirpaiya"
}, {
    match: /\bPah\w+g\b/i,
    name: "Paholiang"
}, {
    match: /\bIae\w+a\b/i,
    name: "Iaereznika"
}, {
    match: /\bYud\w+h\b/i,
    name: "Yudukagath"
}, {
    match: /\bBoe\w+j\b/i,
    name: "Boealalosnj"
}, {
    match: /\bYae\w+o\b/i,
    name: "Yaevarcko"
}, {
    match: /\bCoe\w+p\b/i,
    name: "Coellosipp"
}, {
    match: /\bWay\w+u\b/i,
    name: "Wayndohalou"
}, {
    match: /\bSmo\w+l\b/i,
    name: "Smoduraykl"
}, {
    match: /\bApm\w+u\b/i,
    name: "Apmaneessu"
}, {
    match: /\bHic\w+v\b/i,
    name: "Hicanpaav"
}, {
    match: /\bAkv\w+a\b/i,
    name: "Akvasanta"
}, {
    match: /\bTuy\w+r\b/i,
    name: "Tuychelisaor"
}, {
    match: /\bRiv\w+e\b/i,
    name: "Rivskimbe"
}, {
    match: /\bDak\w+x\b/i,
    name: "Daksanquix"
}, {
    match: /\bKiss\w+n\b/i,
    name: "Kissonlin"
}, {
    match: /\bAed\w+l\b/i,
    name: "Aediabiel"
}, {
    match: /\bUlo\w+k\b/i,
    name: "Ulosaginyik"
}, {
    match: /\bRoc\w+r\b/i,
    name: "Roclaytonycar"
}, {
    match: /\bKic\w+a\b/i,
    name: "Kichiaroa"
}, {
    match: /\bIrc\w+y\b/i,
    name: "Irceauffey"
}, {
    match: /\bNud\w+e\b/i,
    name: "Nudquathsenfe"
}, {
    match: /\bGet\w+l\b/i,
    name: "Getaizakaal"
}, {
    match: /\bHans\w+n\b/i,
    name: "Hansolmien"
}, {
    match: /\bBloy\w+a\b/i,
    name: "Bloytisagra"
}, {
    match: /\bLads\w+y\b/i,
    name: "Ladsenlay"
}, {
    match: /\bLuyu\w+r\b/i,
    name: "Luyugoslasr"
}, {
    match: /\bUbre\w+k\b/i,
    name: "Ubredhatk"
}, {
    match: /\bCido\w+a\b/i,
    name: "Cidoniana"
}, {
    match: /\bJasi\w+a\b/i,
    name: "Jasinessa"
}, {
    match: /\bTorw\w+f\b/i,
    name: "Torweierf"
}, {
    match: /\bSaff\w+m\b/i,
    name: "Saffneckm"
}, {
    match: /\bThni\w+r\b/i,
    name: "Thnistner"
}, {
    match: /\bDotu\w+g\b/i,
    name: "Dotusingg"
}, {
    match: /\bLule\w+s\b/i,
    name: "Luleukous"
}, {
    match: /\bJelm\w+n\b/i,
    name: "Jelmandan"
}, {
    match: /\bOtim\w+o\b/i,
    name: "Otimanaso"
}, {
    match: /\bEnja\w+o\b/i,
    name: "Enjaxusanto"
}, {
    match: /\bSezv\w+w\b/i,
    name: "Sezviktorew"
}, {
    match: /\bZike\w+m\b/i,
    name: "Zikehpm"
}, {
    match: /\bBeph\w+h\b/i,
    name: "Bephembah"
}, {
    match: /\bBroo\w+i\b/i,
    name: "Broomerrai"
}, {
    match: /\bMexi\w+a\b/i,
    name: "Meximicka"
}, {
    match: /\bVene\w+a\b/i,
    name: "Venessika"
}, {
    match: /\bGait\w+g\b/i,
    name: "Gaiteseling"
}, {
    match: /\bZosa\w+o\b/i,
    name: "Zosakasiro"
}, {
    match: /\bDraj\w+s\b/i,
    name: "Drajayanes"
}, {
    match: /\bOoib\w+r\b/i,
    name: "Ooibekuar"
}, {
    match: /\bUrck\w+i\b/i,
    name: "Urckiansi"
}, {
    match: /\bDozi\w+o\b/i,
    name: "Dozivadido"
}, {
    match: /\bEmie\w+s\b/i,
    name: "Emiekereks"
}, {
    match: /\bMeyk\w+r\b/i,
    name: "Meykinunukur"
}, {
    match: /\bKimy\w+h\b/i,
    name: "Kimycuristh"
}, {
    match: /\bRoan\w+n\b/i,
    name: "Roansfien"
}, {
    match: /\bIsga\w+o\b/i,
    name: "Isgarmeso"
}, {
    match: /\bDait\w+i\b/i,
    name: "Daitibeli"
}, {
    match: /\bGucu\w+k\b/i,
    name: "Gucuttarik"
}, {
    match: /\bEnla\w+e\b/i,
    name: "Enlaythie"
}, {
    match: /\bDrew\w+e\b/i,
    name: "Drewweste"
}, {
    match: /\bAkbu\w+i\b/i,
    name: "Akbulkabi"
}, {
    match: /\bHoms\w+w\b/i,
    name: "Homskiw"
}, {
    match: /\bZava\w+i\b/i,
    name: "Zavainlani"
}, {
    match: /\bJewi\w+s\b/i,
    name: "Jewijkmas"
}, {
    match: /\bItlh\w+a\b/i,
    name: "Itlhotagra"
}, {
    match: /\bPoda\w+s\b/i,
    name: "Podalicess"
}, {
    match: /\bHivi\w+r\b/i,
    name: "Hiviusauer"
}, {
    match: /\bHals\w+k\b/i,
    name: "Halsebenk"
}, {
    match: /\bPuik\w+c\b/i,
    name: "Puikitoac"
}, {
    match: /\bGayb\w+a\b/i,
    name: "Gaybakuaria"
}, {
    match: /\bGrbo\w+e\b/i,
    name: "Grbodubhe"
}, {
    match: /\bRyce\w+r\b/i,
    name: "Rycempler"
}, {
    match: /\bIndj\w+a\b/i,
    name: "Indjalala"
}, {
    match: /\bFont\w+k\b/i,
    name: "Fontenikk"
}, {
    match: /\bPasy\w+e\b/i,
    name: "Pasycihelwhee"
}, {
    match: /\bIkba\w+t\b/i,
    name: "Ikbaksmit"
}, {
    match: /\bTeli\w+s\b/i,
    name: "Telicianses"
}, {
    match: /\bOyle\w+n\b/i,
    name: "Oyleyzhan"
}, {
    match: /\bUage\w+t\b/i,
    name: "Uagerosat"
}, {
    match: /\bImpo\w+n\b/i,
    name: "Impoxectin"
}, {
    match: /\bTwoo\w+d\b/i,
    name: "Twoodmand"
}, {
    match: /\bHilf\w+s\b/i,
    name: "Hilfsesorbs"
}, {
    match: /\bEzda\w+t\b/i,
    name: "Ezdaranit"
}, {
    match: /\bWien\w+e\b/i,
    name: "Wiensanshe"
}, {
    match: /\bEwhe\w+c\b/i,
    name: "Ewheelonc"
}, {
    match: /\bLitz\w+a\b/i,
    name: "Litzmantufa"
}, {
    match: /\bEmar\w+i\b/i,
    name: "Emarmatosi"
}, {
    match: /\bMufi\w+i\b/i,
    name: "Mufimbomacvi"
}, {
    match: /\bWong\w+m\b/i,
    name: "Wongquarum"
}, {
    match: /\bHapi\w+a\b/i,
    name: "Hapirajua"
}, {
    match: /\bIgbi\w+a\b/i,
    name: "Igbinduina"
}, {
    match: /\bWepa\w+s\b/i,
    name: "Wepaitvas"
}, {
    match: /\bStha\w+i\b/i,
    name: "Sthatigudi"
}, {
    match: /\bYeka\w+n\b/i,
    name: "Yekathsebehn"
}, {
    match: /\bEbed\w+t\b/i,
    name: "Ebedeagurst"
}, {
    match: /\bNoli\w+a\b/i,
    name: "Nolisonia"
}, {
    match: /\bUlex\w+b\b/i,
    name: "Ulexovitab"
}, {
    match: /\bIodh\w+s\b/i,
    name: "Iodhinxois"
}, {
    match: /\bIrro\w+s\b/i,
    name: "Irroswitzs"
}, {
    match: /\bBifr\w+t\b/i,
    name: "Bifredait"
}, {
    match: /\bBeir\w+e\b/i,
    name: "Beiraghedwe"
}, {
    match: /\bYeon\w+k\b/i,
    name: "Yeonatlak"
}, {
    match: /\bCugn\w+h\b/i,
    name: "Cugnatachh"
}, {
    match: /\bNozo\w+i\b/i,
    name: "Nozoryenki"
}, {
    match: /\bEbra\w+i\b/i,
    name: "Ebralduri"
}, {
    match: /\bEvci\w+j\b/i,
    name: "Evcickcandj"
}, {
    match: /\bZiyb\w+n\b/i,
    name: "Ziybosswin"
}, {
    match: /\bHepe\w+t\b/i,
    name: "Heperclait"
}, {
    match: /\bSugi\w+m\b/i,
    name: "Sugiuniam"
}, {
    match: /\bAase\w+h\b/i,
    name: "Aaseertush"
}, {
    match: /\bUgly\w+a\b/i,
    name: "Uglyestemaa"
}, {
    match: /\bHore\w+h\b/i,
    name: "Horeroedsh"
}, {
    match: /\bDrun\w+o\b/i,
    name: "Drundemiso"
}, {
    match: /\bItya\w+t\b/i,
    name: "Ityanianat"
}, {
    match: /\bPurn\w+e\b/i,
    name: "Purneyrine"
}, {
    match: /\bDoki\w+t\b/i,
    name: "Dokiessmat"
}, {
    match: /\bNupi\w+h\b/i,
    name: "Nupiacheh"
}, {
    match: /\bDihe\w+j\b/i,
    name: "Dihewsonj"
}, {
    match: /\bRudr\w+k\b/i,
    name: "Rudrailhik"
}, {
    match: /\bTwer\w+t\b/i,
    name: "Tweretnort"
}, {
    match: /\bSnat\w+e\b/i,
    name: "Snatreetze"
}, {
    match: /\bIwun\w+s\b/i,
    name: "Iwunddaracos"
}, {
    match: /\bDiga\w+a\b/i,
    name: "Digarlewena"
}, {
    match: /\bErqu\w+a\b/i,
    name: "Erquagsta"
}, {
    match: /\bLogo\w+n\b/i,
    name: "Logovoloin"
}, {
    match: /\bBoya\w+h\b/i,
    name: "Boyaghosganh"
}, {
    match: /\bKuol\w+u\b/i,
    name: "Kuolungau"
}, {
    match: /\bPehn\w+t\b/i,
    name: "Pehneldept"
}, {
    match: /\bYeve\w+n\b/i,
    name: "Yevettiiqidcon"
}, {
    match: /\bSahl\w+u\b/i,
    name: "Sahliacabru"
}, {
    match: /\bNogg\w+r\b/i,
    name: "Noggalterpor"
}, {
    match: /\bChma\w+i\b/i,
    name: "Chmageaki"
}, {
    match: /\bVeti\w+a\b/i,
    name: "Veticueca"
}, {
    match: /\bVitt\w+l\b/i,
    name: "Vittesbursul"
}, {
    match: /\bNoot\w+e\b/i,
    name: "Nootanore"
}, {
    match: /\bInne\w+h\b/i,
    name: "Innebdjerah"
}, {
    match: /\bKisv\w+i\b/i,
    name: "Kisvarcini"
}, {
    match: /\bCuzc\w+r\b/i,
    name: "Cuzcogipper"
}, {
    match: /\bPama\w+u\b/i,
    name: "Pamanhermonsu"
}, {
    match: /\bBrot\w+k\b/i,
    name: "Brotoghek"
}, {
    match: /\bMibi\w+a\b/i,
    name: "Mibittara"
}, {
    match: /\bHuru\w+i\b/i,
    name: "Huruahili"
}, {
    match: /\bRald\w+n\b/i,
    name: "Raldwicarn"
}, {
    match: /\bEzda\w+c\b/i,
    name: "Ezdartlic"
}, {
    match: /\bBade\w+a\b/i,
    name: "Badesclema"
}, {
    match: /\bIsen\w+n\b/i,
    name: "Isenkeyan"
}, {
    match: /\bIado\w+u\b/i,
    name: "Iadoitesu"
}, {
    match: /\bYagr\w+i\b/i,
    name: "Yagrovoisi"
}, {
    match: /\bEwco\w+o\b/i,
    name: "Ewcomechio"
}, {
    match: /\bInun\w+a\b/i,
    name: "Inunnunnoda"
}, {
    match: /\bDisc\w+n\b/i,
    name: "Dischiutun"
}, {
    match: /\bYuwa\w+a\b/i,
    name: "Yuwarugha"
}, {
    match: /\bIalm\w+a\b/i,
    name: "Ialmendra"
}, {
    match: /\bRepo\w+e\b/i,
    name: "Reponudrle"
}, {
    match: /\bRinj\w+o\b/i,
    name: "Rinjanagrbo"
}, {
    match: /\bZezi\w+h\b/i,
    name: "Zeziceloh"
}, {
    match: /\bOeil\w+c\b/i,
    name: "Oeileutasc"
}, {
    match: /\bZicn\w+s\b/i,
    name: "Zicniijinis"
}, {
    match: /\bDugn\w+a\b/i,
    name: "Dugnowarilda"
}, {
    match: /\bNeux\w+n\b/i,
    name: "Neuxoisan"
}, {
    match: /\bIlme\w+n\b/i,
    name: "Ilmenhorn"
}, {
    match: /\bRukw\w+u\b/i,
    name: "Rukwatsuku"
}, {
    match: /\bNepi\w+u\b/i,
    name: "Nepitzaspru"
}, {
    match: /\bChce\w+g\b/i,
    name: "Chcehoemig"
}, {
    match: /\bHaff\w+n\b/i,
    name: "Haffneyrin"
}, {
    match: /\bUlic\w+i\b/i,
    name: "Uliciawai"
}, {
    match: /\bTuhg\w+d\b/i,
    name: "Tuhgrespod"
}, {
    match: /\bIous\w+a\b/i,
    name: "Iousongola"
}, {
    match: /\bOdya\w+i\b/i,
    name: "Odyalutai"
}]
