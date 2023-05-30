const admin = require('firebase-admin')
var serviceAccount = require("./nms-bhs-8025d3f3c02d.json")
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})
require('events').EventEmitter.defaultMaxListeners = 0

// recalc all totals
// copy votes but not common to get rid of galaxy. copy to new db collection
// delete "old"+type when copy to new db collection

// *** done ***
// validate galaxies delete invalid inc images
// move living ships to normal ships
// fix resources on planets, tags to resources. e.g. faecium
// rewrite fauna type to be description
// update version for verified tags, *** add to main site somehow ***
// tags to element=true instead of arrays
// clean up garbage in seed

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

async function combineGalaxies() {
    let ref = admin.firestore().collection("nmsce")
    let galaxies = await ref.listDocuments()
    let count = 0
    let totals = {}

    for (let g of galaxies) {
        let ref = admin.firestore().doc(g.path)
        let types = await ref.listCollections()

        for (let t of types) {
            if (t.id === "Living-Ship")
                continue

            let ref = admin.firestore().collection(t.path)
            let items = await ref.get()

            for (let doc of items.docs) {
                let d = doc.data()
                console.log(g.id, t.id, d.id)

                let keys = Object.keys(d)
                for (let key of keys)
                    if (key.startsWith("old"))
                        delete d[key]

                let ref = admin.firestore().doc("nmsceCombined/" + d.id)

                // let dup = await ref.get()
                // if (dup.exists) {
                //     console.log("duplicate", g.id, t.id, d.id)
                //     continue
                // }

                // await ref.set(d)

                // let votes = await doc.ref.collection("votes").get()
                // for (let vdoc of votes.docs) 
                //     await ref.collection("votes").doc(v.uid).set(vdoc.data())

                if (typeof totals[d.uid] === "undefined")
                    totals[d.uid] = {}

                if (typeof totals[d.uid][d.type] === "undefined")
                    totals[d.uid][d.type] = 0

                totals[d.uid][d.type]++

                ++count
            }

            if (count > 200)
                break
        }

        if (count > 200)
            break
    }

    //write totals
}
// combineGalaxies()

async function getseeds() {
    let ref = admin.firestore().collection("nmsce")
    let galaxies = await ref.listDocuments()

    for (let g of galaxies) {
        let ref = admin.firestore().collection(g.path + "/Ship")
        ref = ref.where("Seed", ">", "0x")
        ref = ref.where("Type", "=", "Fighter")
        let snapshot = await ref.get()

        for (let doc of snapshot.docs) {
            let d = doc.data()
            let parts = Object.keys(d.parts)
            let stripped = []
            for (let p of parts)
                stripped.push(parseInt(p.slice(1)))
            stripped = stripped.sort((a, b) => a - b)
            let color = Object.keys(d.Color).sort()
            console.log(stripped, BigInt(d.Seed).toString(2).padStart(64, '0'))//, d.Seed, color, "https://cdn.nmsce.com/nmsce/disp/thumb/" + d.Photo)
        }
    }
}
getseeds()


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
