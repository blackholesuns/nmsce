const admin = require('firebase-admin')
var serviceAccount = require("./nms-bhs-8025d3f3c02d.json")
const { object } = require('firebase-functions/v1/storage')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})
require('events').EventEmitter.defaultMaxListeners = 0

// *** Most of this file was outdated by the db change to a combined galaxy list. Save for reference 
// add all parts & colors to ships so they can be searched for false.
// remove orphaned images. check for images used by multiple entries
// recalculate votes. some favorites are < 0. some favorites are true instead of 1

// *** done ***
// update version for verified tags, *** add to main site somehow ***

// delete/rename collection votes on nmsce after last copy (make backup first)
// recalc all totals
// fix duplicate ids
// validate galaxies delete invalid inc images
// move living ships to normal ships
// fix resources on planets, tags to resources. e.g. faecium
// rewrite fauna type to be description
// tags to element=true instead of arrays
// clean up garbage in seed
// Fix type & Type for living ships in nmsceCombined
// copy votes but not common to get rid of galaxy. copy to new db collection
// delete "old"+type when copy to new db collection
// copy all items after switching to new code jic some were entered between states

async function padParts() {
    let ref = admin.firestore().collection("nmsceCombined")
    ref = ref.where("type", "==", "Ship")
    ref = ref.limit(5)

    let snapshot = await ref.get()

    for (let d of snapshot.docs) {
        let doc = fixParts(d.data())
        console.log(doc)

        // d.ref.set(doc, { merge: true })
    }

    ref = admin.firestore().collection("nmsceCombined")
    ref = ref.where("type", "==", "Freighter")
    ref = ref.limit(5)

    snapshot = await ref.get()

    for (let d of snapshot.docs) {
        let doc = fixParts(d.data())
        console.log(doc)

        // d.ref.set(doc, { merge: true })
    }
}
padParts()

function fixParts(doc) {
    let d = {}

    let merge = function (d, obj) {
        let keys = Object.keys(obj)

        for (let k of keys)
            d[k] = true

        return d
    }

    if (typeof doc.Color !== "undefined")
        d.Color = merge(doc.Color, colors)

    if (typeof doc.Sail !== "undefined")
        d.Sail = merge(doc.Sail, colors)

    if (typeof doc.Type !== "undefined")
        d.parts = merge(doc.parts, parts[doc.Type])

    else if (doc.type === "Freighter")
        d.parts = merge(doc.parts, parts[doc.type])

    return d
}

// async function fixTotals() {
//     let users = {}
//     let all = {}
//     all.Ship = 0
//     all.Freighter = 0
//     all.Frigate = 0
//     all["Multi-Tool"] = 0
//     all.Fauna = 0
//     all.Planet = 0
//     all.Base = 0

//     let ref = admin.firestore().collection("nmsceCombined")
//     let docs = await ref.listDocuments(ref)
//     console.log("total entries", docs.length)
//     all.Total = docs.length

//     let count = 0

//     for (let d of docs) {
//         let ref = admin.firestore().doc(d.path)
//         let snapshot = await ref.get()

//         let doc = snapshot.data()
//         if (typeof users[doc.uid] === "undefined") {
//             users[doc.uid] = {}
//             users[doc.uid].Ship = 0
//             users[doc.uid].Freighter = 0
//             users[doc.uid].Frigate = 0
//             users[doc.uid]["Multi-Tool"] = 0
//             users[doc.uid].Fauna = 0
//             users[doc.uid].Planet = 0
//             users[doc.uid].Base = 0

//             users[doc.uid].name = doc._name
//         }

//         users[doc.uid][doc.type]++
//         all[doc.type]++

//         // if (++count > 500)
//         //     break
//     }

//     let ids = Object.keys(users)

//     for (let uid of ids) {
//         let types = Object.keys(users[uid])

//         for (let t of types)
//             if (users[uid][t] === 0)
//                 delete users[uid][t]
//     }

//     ref = admin.firestore().doc("bhs/nmsceTotals")
//     all = mergeObjects(all, users)
//     // console.log(all)
//     ref.set(all)

//     console.log("contributing users", ids.length)

//     for (let id of ids) {
//         let ref = admin.firestore().doc("users/" + id)
//         delete users[id].name

//         let u = {}
//         u.nmsceTotals = users[id]
//         console.log(u)
//         ref.set(u, { merge: true })
//     }
// }
// fixTotals()

// async function combineGalaxies() {
//     let ref = admin.firestore().collection("nmsce")
//     let galaxies = await ref.listDocuments()

//     ref = admin.firestore().collection("nmsceCombined")
//     let cids = await ref.listDocuments()

//     for (let g of galaxies) {
//         if (g.id < "Euclid")
//             continue

//         let ref = admin.firestore().doc(g.path)
//         let types = await ref.listCollections()

//         for (let t of types) {
//             if (t.id === "Living-Ship")
//                 continue

//             let ref = admin.firestore().collection(t.path)
//             let tids = await ref.listDocuments()

//             for (let item of tids) {
//                 if (cids.find(elem => elem.id === item.id)) {
//                     console.error("duplicate", g.id, t.id, item.id)
//                     continue
//                 }

//                 let doc = await ref.doc(item.id).get()
//                 if (!doc.exists) {
//                     console.error("!exist", g.id, t.id, item.id)
//                     continue
//                 }

//                 let d = doc.data()

//                 let keys = Object.keys(d)
//                 for (let key of keys)
//                     if (key.startsWith("old")) // old tag copies
//                         delete d[key]

//                 if (d.type === "Living-Ship") {
//                     d.type = "Ship"
//                     d.Type = "Living"
//                 }

//                 console.log("copy", g.id, t.id, d.id)
//                 let newref = admin.firestore().doc("nmsceCombined/" + d.id)
//                 await newref.set(d)

//                 let votes = await doc.ref.collection("votes").get()
//                 for (let vdoc of votes.docs) {
//                     let v = vdoc.data()
//                     await newref.collection("votes").doc(v.uid).set(v)
//                 }
//             }
//         }
//     }
// }
// combineGalaxies()

function mergeObjects(o, n) {
    if (typeof n !== "object") {
        o = n
    } else if (n) {
        if (typeof o === "undefined")
            o = {}
        for (let x of Object.keys(n))
            o[x] = mergeObjects(o[x], n[x])
    }

    return o
}

// async function fixLs() {
//     let ref = admin.firestore().collection("nmsceCombined")
//     ref = ref.where("type", "==", "Living-Ship")
//     let snapshot = await ref.get()

//     console.log('Living ships', snapshot.docs.length)

//     for (let doc of snapshot.docs) {
//         let d = doc.data()
//         d.type = "Ship"
//         d.Type = "Living"
//         doc.ref.set(d)
//     }
// }
// fixLs()

// const duplicates = [
//     { id: "5f2b6925-825e-4fee-bba5-d076310b626f", path: ["nmsce/Eissentam/Ship", "nmsce/Eissentam/Freighter"] },
//     { id: "8ae898da-84b6-4cca-b989-6f79ff68b014", path: ["nmsce/Eissentam/Ship", "nmsce/Eissentam/Planet"] },
//     { id: "1008b970-063f-4eb0-ba73-8468d4efda35", path: ["nmsce/Euclid/Planet", "nmsce/Euclid/Fauna"] },
//     { id: "47d36dcc-b11e-4275-af97-f5f8161cf7a3", path: ["nmsce/Euclid/Planet", "nmsce/Euclid/Base"] },
//     { id: "0630-0080-0179-0074-dance-of-the-robeo", path: ["nmsce/Euclid/Ship", "nmsce/Euclid/Planet"] },
//     { id: "2782a1cb-642b-4b85-b6a2-2d673ef77a13", path: ["nmsce/Euclid/Ship", "nmsce/Euclid/Frigate"] },
//     { id: "3a534034-f3b0-4a64-9e2b-203e901148b9", path: ["nmsce/Euclid/Ship", "nmsce/Euclid/Multi-Tool"] },
//     { id: "9efc237a-9642-4539-a072-7d5fb5ae5e3c", path: ["nmsce/Euclid/Ship", "nmsce/Eissentam/Ship"] },
//     { id: "bc44b33d-461b-4e86-9deb-720b547f6b05", path: ["nmsce/Euclid/Ship", "nmsce/Eissentam/Ship"] },
//     { id: "e2e9a2b2-b39f-4f3d-87eb-1c7453759fa2", path: ["nmsce/Euclid/Ship", "nmsce/Euclid/Freighter"] },
//     { id: "0a59d848-e98c-4143-a172-443d55eb02b5", path: ["nmsce/Hilbert Dimension/Ship", "nmsce/Eissentam/Ship"] },
//     { id: "b8c5ecba-8437-4f2c-a4bf-4352f2823e8c", path: ["nmsce/Paholiang/Planet", "nmsce/Paholiang/Fauna"] }]

// async function fixDuplicates() {
//     for (let i of duplicates) {
//         let ref = admin.firestore().doc(i.path[1] + "/" + i.id)
//         let doc = await ref.get()

//         if (doc.exists) {
//             let d = doc.data()
//             let ref = admin.firestore().doc("nmsceCombined/" + d.id)
//             console.log(d.id, i.id)
//             await ref.set(d)
//         }
//     }
// }
// fixDuplicates()

// async function checkDuplicateIDs() {
//     let ref = admin.firestore().collection("nmsce")
//     let galaxies = await ref.listDocuments()
//     let tids = {}
//     let all = {}

//     for (let g of galaxies) {
//         let ref = admin.firestore().doc(g.path)
//         let types = await ref.listCollections()

//         for (let t of types) {
//             if (t.id === "Living-Ship")
//                 continue

//             let ref = admin.firestore().collection(t.path)
//             tids[t.path] = await ref.listDocuments()

//             for (let i of tids[t.path])
//                 if (typeof all[i.id] !== "undefined") {
//                     console.log(i.id, t.path, all[i.id])
//                 }
//                 else
//                     all[i.id] = t.path
//         }
//     }

//     let keys = Object.keys(tids)
//     console.log(keys)
// }
// checkDuplicateIDs()

// async function addLStoShipTotals() {
//     let ref = admin.firestore().collection("users")
//     ref = ref.where("nmsceTotals.Living-Ship", ">", 0)
//     let items = await ref.get()

//     for (let doc of items.docs) {
//         let d = doc.data()
//         if (typeof d.nmsceTotals.Ship !== "undefined")
//             d.nmsceTotals.Ship += d.nmsceTotals["Living-Ship"]
//         else
//             d.nmsceTotals.Ship = d.nmsceTotals["Living-Ship"]
//         delete d.nmsceTotals["Living-Ship"]
//         console.log(d.nmsceTotals)
//         doc.ref.set(d)
//     }
// }
// addLStoShipTotals()

// async function getseeds() {
//     let ref = admin.firestore().collection("nmsce")
//     let galaxies = await ref.listDocuments()

//     for (let g of galaxies) {
//         let ref = admin.firestore().collection(g.path + "/Ship")
//         ref = ref.where("Seed", ">", "0x")
//         ref = ref.where("Type", "=", "Fighter")
//         let snapshot = await ref.get()

//         for (let doc of snapshot.docs) {
//             let d = doc.data()
//             let parts = Object.keys(d.parts)
//             let stripped = []
//             for (let p of parts)
//                 stripped.push(parseInt(p.slice(1)))
//             stripped = stripped.sort((a, b) => a - b)
//             let color = Object.keys(d.Color).sort()
//             console.log(stripped, BigInt(d.Seed).toString(2).padStart(64, '0'))//, d.Seed, color, "https://cdn.nmsce.com/nmsce/disp/thumb/" + d.Photo)
//         }
//     }
// }
// getseeds()

// async function fixTags() {
//     let ref = admin.firestore().collection("nmsce")
//     let galaxies = await ref.listDocuments()

//     for (let g of galaxies) {
//         if (g.id < "Euclid")
//             continue

//         let ref = admin.firestore().doc(g.path)
//         let types = await ref.listCollections()

//         for (let t of types) {
//             if (t.id === "Living-Ship" || g.id === "Euclid" && t.id < "Ship")
//                 continue

//             let tref = admin.firestore().doc("tags/" + t.id)
//             let tags = await tref.get()
//             tags = tags.data().tags // filter bad tags

//             let ref = admin.firestore().collection(t.path)
//             let items = await ref.get()

//             // rewrites every single entry in the db
//             for (let doc of items.docs) {
//                 let d = doc.data()

//                 for (let type of ["Sail", "Color", "Markings", "Tags", "Resources"])
//                     if (typeof d["old" + type] === "undefined" && typeof d[type] !== "undefined") {
//                         d["old" + type] = d[type]
//                         d[type] = {}

//                         try {
//                             for (let l of d["old" + type])
//                                 if (type !== "Tags" || tags.indexOf(l) !== -1)
//                                     d[type][l] = true
//                         }
//                         catch (err) { console.log(err, JSON.stringify(d)) }

//                         if (d["old" + type].length > 0)
//                             console.log(d.galaxy, d.type, d.id, JSON.stringify(d["old" + type]), JSON.stringify(d[type]))
//                     }

//                 await doc.ref.set(d)
//             }
//         }
//     }
// }
// fixTags()

// async function updateVersion() {
//     let ref = admin.firestore().collection("nmsce")
//     let galaxies = await ref.listDocuments()

//     for (let g of galaxies) {
//         let types = await admin.firestore().doc(g.path).listCollections()

//         for (let t of types) {
//             console.log(t.path)
//             let snapshot = await admin.firestore().collection(t.path).where("Tags", "array-contains", "interceptor verified").get()

//             for (let doc of snapshot.docs) {
//                 let d = doc.data()

//                 let i = d.Tags.indexOf("interceptor verified")
//                 d.Tags.splice(i, 1)
//                 d.version = "interceptor"

//                 doc.ref.set(d)
//             }
//         }
//     }
// }

// async function fixFauna() {
//     let ref = admin.firestore().collection("nmsce")
//     let galaxies = await ref.listDocuments()

//     for (let g of galaxies) {
//         if (galaxyList.includes(g.id)) {
//             let ref = admin.firestore().collection(g.path + "/Fauna")
//             let snapshot = await ref.get()

//             console.log(g.id, snapshot.docs.length)

//             for (let doc of snapshot.docs) {
//                 let d = doc.data()
//                 let i = FaunaList.indexOf(d.Genus)
//                 if (d.Type) 
//                     i = oldFaunaList.indexOf(d.Type)

//                 d.Genus = newFaunaList[i]

//                 if (i === -1 || !d.Genus)
//                     continue

//                 console.log(d.Genus)
//                 doc.ref.set(d)
//             }
//         }
//     }
// }

// async function fixResources() {
//     let ref = admin.firestore().collection("nmsce")
//     let galaxies = await ref.listDocuments()
//     console.log(galaxies.length)

//     for (let g of galaxies) {
//         if (galaxyList.includes(g.id)) {
//             let ref = admin.firestore().collection(g.path + "/Planet")
//             ref = ref.where("Tags", "array-contains", "faecium")
//             let snapshot = await ref.get()

//             console.log(g.id, snapshot.docs.length)

//             for (let doc of snapshot.docs) {
//                 let d = doc.data()
//                 d.Resources.push("Faecium")
//                 d.Resources.sort()

//                 let i = d.Tags.indexOf("faecium")
//                 d.Tags.splice(i, 1)

//                 doc.ref.set(d)
//             }
//         }
//     }
// }

// async function livingShips() {
//     let groupref = admin.firestore().collectionGroup("nmsceCommon")

//     snapshot = await groupref.where("type", "==", "Living-Ship").get()
//     console.log(snapshot.docs.length, "Living-Ship")

//     for (let d of snapshot.docs) {
//         let common = d.data()

//         let doc = await admin.firestore().doc("nmsce/" + common.galaxy + "/Living-Ship/" + common.id).get()
//         let item = doc.data()

//         item.type = "Ship"
//         item.Type = "Living"
//         common.type = "Ship"
//         common.Type = "Living"

//         await admin.firestore().doc("nmsce/" + common.galaxy + "/Ship/" + item.id).set(item)
//         await admin.firestore().doc("nmsce/" + common.galaxy + "/Ship/" + item.id + "/nmsceCommon/" + item.id).set(common)

//         let votes = await admin.firestore().collection("nmsce/" + common.galaxy + "/Living-Ship/" + common.id + "/votes").get()

//         for (let d of votes.docs) {
//             let vote = d.data()
//             vote.type = "Ship"
//             vote.Type = "Living"

//             await admin.firestore().doc("nmsce/" + common.galaxy + "/Ship/" + item.id + "/votes/" + vote.uid).set(vote)
//         }

//         console.log(common.galaxy, item.id, votes.docs.length)
//     }
// }

const colors = {
    Black: false, Blue: false, Brown: false, Chrome: false, Cream: false,
    Gold: false, Green: false, Grey: false, Orange: false, Pink: false, Purple: false,
    Red: false, Silver: false, Tan: false, Teal: false, White: false, Yellow: false,
}

const parts = {
    Exotic: {
        h10: false, h11: false, h12: false, h13: false, h14: false, h2: false, h3: false, h4: false, h5: false, h6: false, h7: false, h8: false, h9: false,
    }, Interceptor: {
        h1: false, h10: false, h11: false, h12: false, h13: false, h14: false, h15: false, h16: false, h17: false, h18: false, h19: false, h2: false, h20: false,
        h21: false, h22: false, h24: false, h25: false, h26: false, h27: false, h28: false, h29: false, h3: false, h30: false, h31: false, h32: false, h33: false,
        h34: false, h35: false, h36: false, h37: false, h38: false, h39: false, h4: false, h40: false, h41: false, h42: false, h43: false, h44: false, h45: false,
        h46: false, h47: false, h48: false, h49: false, h5: false, h50: false, h51: false, h52: false, h53: false, h54: false, h55: false, h56: false, h57: false,
        h58: false, h59: false, h6: false, h60: false, h61: false, h62: false, h63: false, h64: false, h65: false, h66: false, h68: false, h69: false, h7: false,
        h71: false, h72: false, h8: false, h9: false,
    }, Living: {
        h1: false, h10: false, h11: false, h12: false, h13: false, h14: false, h15: false, h2: false, h3: false, h4: false, h5: false, h6: false, h7: false, h8: false, h9: false,
    }, Hauler: {
        h10: false, h102: false, h103: false, h104: false, h105: false, h106: false, h107: false, h108: false, h109: false, h11: false, h110: false, h111: false,
        h113: false, h114: false, h115: false, h116: false, h117: false, h118: false, h119: false, h12: false, h13: false, h14: false, h15: false, h16: false,
        h17: false, h18: false, h2: false, h3: false, h4: false, h5: false, h6: false, h7: false, h8: false, h9: false,
    }, Freighter: {
        h10: false, h102: false, h103: false, h104: false, h105: false, h106: false, h107: false, h108: false, h109: false, h11: false, h110: false, h112: false,
        h113: false, h114: false, h115: false, h120: false, h13: false, h14: false, h15: false, h16: false, h17: false, h18: false, h19: false, h2: false, h20: false,
        h21: false, h22: false, h23: false, h24: false, h25: false, h3: false, h30: false, h4: false, h40: false, h42: false, h6: false, h7: false, h8: false, h9: false,
    }, Explorer: {
        h10: false, h105: false, h107: false, h11: false, h113: false, h114: false, h115: false, h116: false, h117: false, h118: false, h119: false, h12: false,
        h120: false, h121: false, h122: false, h123: false, h124: false, h125: false, h126: false, h127: false, h128: false, h129: false, h13: false, h130: false,
        h131: false, h14: false, h15: false, h150: false, h16: false, h17: false, h18: false, h19: false, h20: false, h21: false, h22: false, h23: false, h24: false,
        h25: false, h26: false, h27: false, h28: false, h29: false, h3: false, h30: false, h31: false, h33: false, h4: false, h5: false, h50: false, h6: false, h7: false,
        h8: false, h9: false,
    }, Solar: {
        h1: false, h10: false, h11: false, h12: false, h13: false, h14: false, h15: false, h16: false, h17: false, h18: false, h19: false, h2: false, h20: false, h3: false,
        h4: false, h5: false, h6: false, h7: false, h8: false, h9: false,
    }, Fighter: {
        h10: false, h102: false, h103: false, h104: false, h105: false, h106: false, h107: false, h108: false, h109: false, h11: false, h110: false, h111: false,
        h112: false, h113: false, h117: false, h12: false, h13: false, h14: false, h15: false, h16: false, h17: false, h18: false, h19: false, h2: false, h20: false,
        h21: false, h25: false, h27: false, h28: false, h29: false, h3: false, h4: false, h6: false, h7: false, h8: false, h9: false,
    }, Shuttle: {
        h10: false, h102: false, h103: false, h104: false, h105: false, h106: false, h107: false, h108: false, h109: false, h11: false, h110: false, h111: false,
        h112: false, h113: false, h118: false, h119: false, h12: false, h120: false, h121: false, h122: false, h123: false, h124: false, h125: false, h126: false,
        h13: false, h14: false, h15: false, h16: false, h17: false, h18: false, h19: false, h2: false, h21: false, h22: false, h23: false, h24: false, h25: false,
        h26: false, h27: false, h28: false, h29: false, h3: false, h30: false, h31: false, h32: false, h33: false, h4: false, h40: false, h41: false, h6: false, h7: false,
        h8: false, h9: false,
    }
}

const newFaunaList = [
    " Nothing Selected",
    "Striders",
    "Anomalous",
    "Spider",
    "Beetle, flying",
    "Beetle",
    "Cat",
    "Cat, hexapodal",
    "Cow, hexapodal",
    "Blob",
    "Antelope, robot",
    "Grunt",
    "Bonecat",
    "Plough",
    "Rodent",
    "Protoroller",
    "Protodigger",
    "Diplo",
    "Antelope, bipedal",
    "Drill",
    "Mole",
    "Antelope",
    "Triceratop",
    "Tyrannosaurus rex",
    "Cow",
    "Rodent, swimming",
    "Crab, underwater",
    "Jellyfish",
    "Fish",
    "Shark, eel, seasnake",
    "Cow, swimming",
    "Bird",
    "Lizard, flying",
    "Wraith / snake, flying",
    "Protoflyer",
    "Butterfly"
]

const oldFaunaList = [
    " Nothing Selected",
    "Anastomus - Striders",
    "Anomalous",
    "Bos - Spiders",
    "Bosoptera - Flying beetles",
    "Conokinis - Swarming beetles",
    "Felidae - Cat",
    "Felihex - Hexapodal cat",
    "Hexungulatis - Hexapodal cow",
    "Lok - Blobs",
    "Mechanoceris - Robot antelopes",
    "Mogara - Grunts, bipedal species",
    "Osteofelidae - Bonecats",
    "Prionterrae - Ploughs",
    "Procavya - Rodents",
    "Protosphaeridae - Protorollers",
    "Prototerrae - Protodiggers",
    "Rangifae - Diplos",
    "Reococcyx - Bipedal antelopes",
    "Spiralis - Drills",
    "Talpidae - Moles",
    "Tetraceris - Antelopes",
    "Theroma - Triceratops",
    "Tyranocae - Tyrannosaurus rex-like",
    "Ungulatis - Cow",
    "Procavaquatica - Swimming rodents",
    "Bosaquatica - Underwater crabs",
    "Chrysaora - Jellyfish",
    "Ictaloris - Fish",
    "Prionace - Sharks, eels, seasnakes",
    "Prionacefda - Swimming cows",
    "Agnelis - Birds",
    "Cycromys - Flying Lizard",
    "Oxyacta - Wraiths / flying snake",
    "Protocaeli - Protoflyers",
    "Rhopalocera - Butterflies"
]

const galaxyList = [
    "Euclid",
    "Hilbert Dimension",
    "Calypso",
    "Hesperius Dimension",
    "Hyades",
    "Ickjamatew",
    "Budullangr",
    "Kikolgallr",
    "Eltiensleen",
    "Eissentam",
    "Elkupalos",
    "Aptarkaba",
    "Ontiniangp",
    "Odiwagiri",
    "Ogtialabi",
    "Muhacksonto",
    "Hitonskyer",
    "Rerasmutul",
    "Isdoraijung",
    "Doctinawyra",
    "Loychazinq",
    "Zukasizawa",
    "Ekwathore",
    "Yeberhahne",
    "Twerbetek",
    "Sivarates",
    "Eajerandal",
    "Aldukesci",
    "Wotyarogii",
    "Sudzerbal",
    "Maupenzhay",
    "Sugueziume",
    "Brogoweldian",
    "Ehbogdenbu",
    "Ijsenufryos",
    "Nipikulha",
    "Autsurabin",
    "Lusontrygiamh",
    "Rewmanawa",
    "Ethiophodhe",
    "Urastrykle",
    "Xobeurindj",
    "Oniijialdu",
    "Wucetosucc",
    "Ebyeloofdud",
    "Odyavanta",
    "Milekistri",
    "Waferganh",
    "Agnusopwit",
    "Teyaypilny",
    "Zalienkosm",
    "Ladgudiraf",
    "Mushonponte",
    "Amsentisz",
    "Fladiselm",
    "Laanawemb",
    "Ilkerloor",
    "Davanossi",
    "Ploehrliou",
    "Corpinyaya",
    "Leckandmeram",
    "Quulngais",
    "Nokokipsechl",
    "Rinblodesa",
    "Loydporpen",
    "Ibtrevskip",
    "Elkowaldb",
    "Heholhofsko",
    "Yebrilowisod",
    "Husalvangewi",
    "Ovna'uesed",
    "Bahibusey",
    "Nuybeliaure",
    "Doshawchuc",
    "Ruckinarkh",
    "Thorettac",
    "Nuponoparau",
    "Moglaschil",
    "Uiweupose",
    "Nasmilete",
    "Ekdaluskin",
    "Hakapanasy",
    "Dimonimba",
    "Cajaccari",
    "Olonerovo",
    "Umlanswick",
    "Henayliszm",
    "Utzenmate",
    "Umirpaiya",
    "Paholiang",
    "Iaereznika",
    "Yudukagath",
    "Boealalosnj",
    "Yaevarcko",
    "Coellosipp",
    "Wayndohalou",
    "Smoduraykl",
    "Apmaneessu",
    "Hicanpaav",
    "Akvasanta",
    "Tuychelisaor",
    "Rivskimbe",
    "Daksanquix",
    "Kissonlin",
    "Aediabiel",
    "Ulosaginyik",
    "Roclaytonycar",
    "Kichiaroa",
    "Irceauffey",
    "Nudquathsenfe",
    "Getaizakaal",
    "Hansolmien",
    "Bloytisagra",
    "Ladsenlay",
    "Luyugoslasr",
    "Ubredhatk",
    "Cidoniana",
    "Jasinessa",
    "Torweierf",
    "Saffneckm",
    "Thnistner",
    "Dotusingg",
    "Luleukous",
    "Jelmandan",
    "Otimanaso",
    "Enjaxusanto",
    "Sezviktorew",
    "Zikehpm",
    "Bephembah",
    "Broomerrai",
    "Meximicka",
    "Venessika",
    "Gaiteseling",
    "Zosakasiro",
    "Drajayanes",
    "Ooibekuar",
    "Urckiansi",
    "Dozivadido",
    "Emiekereks",
    "Meykinunukur",
    "Kimycuristh",
    "Roansfien",
    "Isgarmeso",
    "Daitibeli",
    "Gucuttarik",
    "Enlaythie",
    "Drewweste",
    "Akbulkabi",
    "Homskiw",
    "Zavainlani",
    "Jewijkmas",
    "Itlhotagra",
    "Podalicess",
    "Hiviusauer",
    "Halsebenk",
    "Puikitoac",
    "Gaybakuaria",
    "Grbodubhe",
    "Rycempler",
    "Indjalala",
    "Fontenikk",
    "Pasycihelwhee",
    "Ikbaksmit",
    "Telicianses",
    "Oyleyzhan",
    "Uagerosat",
    "Impoxectin",
    "Twoodmand",
    "Hilfsesorbs",
    "Ezdaranit",
    "Wiensanshe",
    "Ewheelonc",
    "Litzmantufa",
    "Emarmatosi",
    "Mufimbomacvi",
    "Wongquarum",
    "Hapirajua",
    "Igbinduina",
    "Wepaitvas",
    "Sthatigudi",
    "Yekathsebehn",
    "Ebedeagurst",
    "Nolisonia",
    "Ulexovitab",
    "Iodhinxois",
    "Irroswitzs",
    "Bifredait",
    "Beiraghedwe",
    "Yeonatlak",
    "Cugnatachh",
    "Nozoryenki",
    "Ebralduri",
    "Evcickcandj",
    "Ziybosswin",
    "Heperclait",
    "Sugiuniam",
    "Aaseertush",
    "Uglyestemaa",
    "Horeroedsh",
    "Drundemiso",
    "Ityanianat",
    "Purneyrine",
    "Dokiessmat",
    "Nupiacheh",
    "Dihewsonj",
    "Rudrailhik",
    "Tweretnort",
    "Snatreetze",
    "Iwunddaracos",
    "Digarlewena",
    "Erquagsta",
    "Logovoloin",
    "Boyaghosganh",
    "Kuolungau",
    "Pehneldept",
    "Yevettiiqidcon",
    "Sahliacabru",
    "Noggalterpor",
    "Chmageaki",
    "Veticueca",
    "Vittesbursul",
    "Nootanore",
    "Innebdjerah",
    "Kisvarcini",
    "Cuzcogipper",
    "Pamanhermonsu",
    "Brotoghek",
    "Mibittara",
    "Huruahili",
    "Raldwicarn",
    "Ezdartlic",
    "Badesclema",
    "Isenkeyan",
    "Iadoitesu",
    "Yagrovoisi",
    "Ewcomechio",
    "Inunnunnoda",
    "Dischiutun",
    "Yuwarugha",
    "Ialmendra",
    "Reponudrle",
    "Rinjanagrbo",
    "Zeziceloh",
    "Oeileutasc",
    "Zicniijinis",
    "Dugnowarilda",
    "Neuxoisan",
    "Ilmenhorn",
    "Rukwatsuku",
    "Nepitzaspru",
    "Chcehoemig",
    "Haffneyrin",
    "Uliciawai",
    "Tuhgrespod",
    "Iousongola",
    "Odyalutai",
    "Yilsrussimil",
    "Loqvishess",
    "Enyokudohkiw",
    "Helqvishap",
    "Usgraikik",
    "Hiteshamij",
    "Uewamoisow",
    "Pequibanu"
]
