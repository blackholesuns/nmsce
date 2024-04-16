const admin = require('firebase-admin')
var serviceAccount = require("./nms-bhs-8025d3f3c02d.json")

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

require('events').EventEmitter.defaultMaxListeners = 0

async function main() {
    let ref = admin.firestore().collection("nmsceCombined")

    let systems = []

    snapshot = await ref.where("galaxy", "==", "Euclid")
        .where("type", "==", "Ship")
        .where("Type", "==", "Fighter")
        .where("_name", "==", "Bad Wolf")
        // .where("addr", "==", "0910:008F:08FF:021A")
        .limit(2000)
        .orderBy("created", "desc")
        .get()

    // console.log(snapshot.docs.length)

    if (snapshot.docs.length === 0)
        console.log("snapshots === 0")

    for (let d of snapshot.docs) {
        let e = d.data()
        let sys = systems.find(x => typeof x.addr !== "undefined" && x.addr === e.addr)

        if (!sys) {
            sys = {}
            sys.addr = e.addr
            sys.fab = {}
            sys.fin = {}
            systems.push(sys)
        }

        for (let f of fab) {
            // if (typeof sys.fab[f.old] === "undefined" || f.fin && typeof sys.fin[f.old] === "undefined") {
            let match = 0

            for (let p of f.parts) {
                if (e.parts[p])
                    ++match
                else
                    break
            }

            if (match < f.parts.length)
                continue

            if (f.fin) {
                if (e.parts[fin]) {
                    sys.fin[f.old] = true
                    // console.log(f.old)
                }
                else {
                    sys.fab[f.old] = true
                    // console.log(f.old)
                }
            }
            else if (f.exclude) {
                let nomatch = false

                for (let ex of f.exclude)
                    if (e.parts[ex])
                        nomatch = true

                if (!nomatch) {
                    sys.fab[f.old] = true
                    // console.log(f.old)
                }
            }
            else {
                sys.fab[f.old] = true
                // console.log(f.old)
            }
        }
        // }
    }

    for (let k = 0; k < systems.length; ++k)
        systems[k].count = Object.keys(systems[k].fin).length + Object.keys(systems[k].fab).length

    systems = systems.sort((a, b) => b.count - a.count)
    // console.log(systems)

    let fabL = new Set()
    let finL = new Set()

    for (let i = 0; i < fab.length; ++i) {
        fabL.add(fab[i].old)

        if (fab[i].fin)
            finL.add(fab[i].old)
    }

    console.log(fabL.size, finL.size)

    for (let k = 0; k < systems.length; ++k) {
        // console.log(systems[k])
        let added = 0

        let keys = Object.keys(systems[k].fab)
        for (let k of keys) {
            let l = fabL.indexOf(k)
            if (l >= 0) {
                fabL.splice(l, 1)
                ++added
            }
        }

        keys = Object.keys(systems[k].fin)
        for (let k of keys) {
            let l = finL.indexOf(k)
            if (l >= 0) {
                finL.splice(l, 1)
                ++added
            }
        }

        if (added)
            console.log(systems[k].addr, added)

        if (fabL.length === 0 && finL.length === 0) {
            console.log("done")
            break
        }
    }

    console.log(fabL, finL)

}

main()

const fin = "h12"

const fab = [{
    old: "Stubby",
    new: "Alpha",
    parts: ["h105"],
}, {
    old: "Long Nose",
    new: "Hotrod",
    parts: ["h110"]
}, {
    old: "Needle",
    new: "Needle",
    parts: ["h109"]
}, {
    old: "Alpha",
    new: "Omega",
    parts: ["h107"]
}, {
    old: "Stubby",
    new: "Alpha",
    parts: ["h105"]
}, {
    old: "Rasa",
    new: "Radiant",
    parts: ["h102"]
}, {
    old: "Jet",
    new: "Sleek",
    parts: ["h103"]
}, {
    old: "Snowspeeder",
    new: "Speeder",
    parts: ["h106"]
}, {
    old: "Barrel",
    new: "Turbine",
    parts: ["h108"]
}, {
    old: "Viper",
    new: "Vector",
    parts: ["h101"]
}, {
    old: "Shockwave + Serenity",
    new: "Afterburner",
    fin: "h12",
    parts: ["h3", "h27"]
}, {
    old: "Tie + Serenity",
    new: "Afterburner C",
    fin: "h12",
    parts: ["h13", "h27"]
}, {
    old: "E-Wing + Serenity",
    new: "Afterburner E",
    fin: "h12",
    parts: ["h117", "h27"]
}, {
    old: "Droid",
    new: "Droid",
    fin: "h12",
    parts: ["h20"]
}, {
    old: "Droid + Tie",
    new: "Droid C",
    fin: "h12",
    parts: ["h20", "h13"]
}, {
    old: "Droid + E-Wing",
    new: "Droid E",
    fin: "h12",
    parts: ["h20", "h117"]
}, {
    old: "Droid + Shockwave",
    new: "Droid S",
    fin: "h12",
    parts: ["h20", "h3"]
}, {
    old: "Droid + V-Bowie",
    new: "Droid V",
    fin: "h12",
    parts: ["h20", "h7"]
}, {
    old: "Gull + Firefly",
    new: "Gull",
    fin: "h12",
    parts: ["h25", "h19"]
}, {
    old: "Heavy",
    new: "Hardframe",
    fin: "h12",
    parts: ["h2"]
}, {
    old: "Heavy + Tie",
    new: "Hardframe C",
    fin: "h12",
    parts: ["h2", "h13"]
}, {
    old: "Heavy + E-Wing",
    new: "Hardframe E",
    fin: "h12",
    parts: ["h2", "h117"]
}, {
    old: "Heavy + Shockwave",
    new: "Hardframe S",
    fin: "h12",
    parts: ["h2", "h3"]
}, {
    old: "Heavy + V-Bowie",
    new: "Hardframe V",
    fin: "h12",
    parts: ["h2", "h7"]
}, {
    old: "Horizon",
    new: "Horizon",
    fin: "h12",
    parts: ["h10"]
}, {
    old: "V-Bowie + (arm)",
    new: "Palisade",
    fin: "h12",
    parts: ["h11", "h7"]
}, {
    old: "Quasar",
    new: "Quasar",
    fin: "h12",
    parts: ["h18"]
}, {
    old: "Star Jumper",
    new: "Radiant",
    fin: "h12",
    parts: ["h9"]
}, {
    old: "Tie + (arm)",
    new: "Stardancer",
    fin: "h12",
    parts: ["h11", "h13"]
}, {
    old: "Mecha-3",
    new: "Swept (low)",
    parts: ["h16", "h12"],
    exclude: ["h15", "h14"]
}, {
    old: "Mecha-5",
    new: "Swept (mid)",
    parts: ["h16", "h15", "h12"],
    exclude: ["h14"]
}, {
    old: "Mecha-7",
    new: "Swept (full)",
    parts: ["h16", "h15", "h14", "h12"]
}, {
    old: "Vector",
    new: "Vector",
    fin: "h12",
    parts: ["h6"]
}, {
    old: "Starscream",
    new: "Vesper",
    parts: ["h29"]
}, {
    old: "Firefly + Aftershock",
    new: "Vesper (Fin)",
    parts: ["h25", "h4"]
}, {
    old: "Starscream + Shockwave",
    new: "Vesper (Swept)",
    parts: ["h29", "h3"]
}, {
    old: "Firefly + H-Bowie",
    new: "Vigil",
    parts: ["h25", "h8"]
}, {
    old: "Vulture + Serenity",
    new: "Vulture",
    fin: "h12",
    parts: ["h28", "h27"]
}, {
    old: "Halo",
    new: "Halo",
    parts: ["h21"]
}, {
    old: "Box",
    new: "Vector Thruster",
    parts: ["h113"]
}, {
    old: "Tripple",
    new: "Tri-Booster",
    parts: ["h112"]
}, {
    old: "Single",
    new: "Mono-Thruster",
    parts: ["h111"]
}]
