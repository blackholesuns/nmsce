require('events').EventEmitter.defaultMaxListeners = 0
var serviceAccount = require("./nms-bhs-8025d3f3c02d.json")
const admin = require('firebase-admin')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

main()
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

        console.log("ships", snapshot.docs.length)

    if (snapshot.docs.length === 0) {
        console.log("snapshots === 0")
        return
    }

    for (let d of snapshot.docs) {
        let e = d.data()
        let sys = systems.find(x => typeof x.addr !== "undefined" && x.addr === e.addr)

        if (!sys) {
            sys = {}
            sys.addr = e.addr
            sys.fab = []
            systems.push(sys)
        }

        for (let f of fab) {
            let match = 0

            for (let p of f.parts) {
                if (e.parts[p])
                    ++match
                else
                    break
            }

            if (match < f.parts.length)
                continue

         if (f.exclude && !sys.fab.includes(f.old)) {
                let nomatch = false

                for (let ex of f.exclude)
                    if (e.parts[ex])
                        nomatch = true

                if (!nomatch && !sys.fab.includes(f.old)) {
                    sys.fab.push(f.old)
                    // console.log(f.old)
                }
            }
            else if (!sys.fab.includes(f.old)) {
                sys.fab.push(f.old)
                // console.log(f.old)
            }
        }
    }

    let fabL = []

    for (let f of fab) 
        fabL.push(f.old)

    systems.sort((a, b) => b.fab.length - a.fab.length )

    console.log("systems", Object.keys(systems).length)

    systems[0].diff = difference(fabL, systems[0].fab)
    systems[0].used = true

    let min = systems[0]
    let last

    do {
        last = min

        console.log(min.addr, "total", min.fab.length, "remaining", min.diff.length, JSON.stringify(min.fab))

        for (let sys of systems) {
            if (sys.used)
                continue

            sys.diff = difference(min.diff, sys.fab)
        }

        min = arrayMin(systems)
        min.used = true

    } while (last.addr !== min.addr && min.diff.length > 0)

    if (min.diff.length > 0)
        console.log(JSON.stringify(min.diff))
}

function arrayMin(sys) {
    let max = Infinity
    let out = null

    for (let i of sys) 
        if (i.diff.length < max) {
            max = i.diff.length
            out = i
        }

    return out
}

function symDifference(a, b) {
    return a.filter(x => !b.includes(x)).concat(b.filter(x => !a.includes(x)))
}

function difference(a, b) {
    return a.filter(x => !b.includes(x))
}

function intersection(a, b) {
    return a.filter(x => b.includes(x))
}

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
    parts: ["h104"]
}, {
    old: "Shockwave + Serenity",
    new: "Afterburner",
    exclude: ["h12"],
    parts: ["h3", "h27"]
}, {
    old: "Tie + Serenity",
    new: "Afterburner C",
    exclude: ["h12"],
    parts: ["h13", "h27"]
}, {
    old: "E-Wing + Serenity",
    new: "Afterburner E",
    exclude: ["h12"],
    parts: ["h117", "h27"]
}, {
    old: "V-Bowie + Serenity",
    new: "Afterburner V",
    exclude: ["h12"],
    parts: ["h7", "h27"]
}, {
    old: "Droid",
    new: "Droid",
    exclude: ["h12"],
    parts: ["h20"]
}, {
    old: "Droid + Tie",
    new: "Droid C",
    exclude: ["h12"],
    parts: ["h20", "h13"]
}, {
    old: "Droid + E-Wing",
    new: "Droid E",
    exclude: ["h12"],
    parts: ["h20", "h117"]
}, {
    old: "Droid + Shockwave",
    new: "Droid S",
    exclude: ["h12"],
    parts: ["h20", "h3"]
}, {
    old: "Droid + V-Bowie",
    new: "Droid V",
    exclude: ["h12"],
    parts: ["h20", "h7"]
}, {
    old: "Gull + Firefly",
    new: "Gull",
    exclude: ["h12"],
    parts: ["h25", "h19"]
}, {
    old: "Heavy",
    new: "Hardframe",
    exclude: ["h12"],
    parts: ["h2"]
}, {
    old: "Heavy + Tie",
    new: "Hardframe C",
    exclude: ["h12"],
    parts: ["h2", "h13"]
}, {
    old: "Heavy + E-Wing",
    new: "Hardframe E",
    exclude: ["h12"],
    parts: ["h2", "h117"]
}, {
    old: "Heavy + Shockwave",
    new: "Hardframe S",
    exclude: ["h12"],
    parts: ["h2", "h3"]
}, {
    old: "Heavy + V-Bowie",
    new: "Hardframe V",
    exclude: ["h12"],
    parts: ["h2", "h7"]
}, {
    old: "Horizon",
    new: "Horizon",
    exclude: ["h12"],
    parts: ["h10"]
}, {
    old: "V-Bowie + (arm)",
    new: "Palisade",
    exclude: ["h12"],
    parts: ["h11", "h7"]
}, {
    old: "Quasar",
    new: "Quasar",
    exclude: ["h12"],
    parts: ["h18"]
}, {
    old: "Star Jumper",
    new: "Radiant",
    exclude: ["h12"],
    parts: ["h9"]
}, {
    old: "Tie + (arm)",
    new: "Stardancer",
    exclude: ["h12"],
    parts: ["h11", "h13"]
}, {
    old: "Vector",
    new: "Vector",
    exclude: ["h12"],
    parts: ["h6"]
}, {
    old: "Firefly + Aftershock",
    new: "Vesper (Fin)",
    parts: ["h25", "h4"]
}, {
    old: "Vulture + Serenity",
    new: "Vulture",
    exclude: ["h12"],
    parts: ["h28", "h27"]
}, {
    old: "Shockwave + Serenity + Fin",
    new: "Afterburner + Fin",
    parts: ["h3", "h27", "h12"]
}, {
    old: "Tie + Serenity + Fin",
    new: "Afterburner C + Fin",
    parts: ["h13", "h27", "h12"]
}, {
    old: "E-Wing + Serenity + Fin",
    new: "Afterburner E + Fin",
    parts: ["h117", "h27", "h12"]
}, {
    old: "V-Bowie + Serenity + Fin",
    new: "Afterburner V + Fin",
    parts: ["h7", "h27", "h12"]
}, {
    old: "Droid + Fin",
    new: "Droid + Fin",
    parts: ["h20", "h12"]
}, {
    old: "Droid + Tie + Fin",
    new: "Droid C + Fin",
    parts: ["h20", "h13", "h12"]
}, {
    old: "Droid + E-Wing + Fin",
    new: "Droid E + Fin",
    parts: ["h20", "h117", "h12"]
}, {
    old: "Droid + Shockwave + Fin",
    new: "Droid S + Fin",
    parts: ["h20", "h3", "h12"]
}, {
    old: "Droid + V-Bowie + Fin",
    new: "Droid V + Fin",
    parts: ["h20", "h7", "h12"]
}, {
    old: "Heavy + Fin",
    new: "Hardframe + Fin",
    parts: ["h2", "h12"]
}, {
    old: "Heavy + Tie + Fin",
    new: "Hardframe C + Fin",
    parts: ["h2", "h13", "h12"]
}, {
    old: "Heavy + E-Wing + Fin",
    new: "Hardframe E + Fin",
    parts: ["h2", "h117", "h12"]
}, {
    old: "Heavy + Shockwave + Fin",
    new: "Hardframe S + Fin",
    parts: ["h2", "h3", "h12"]
}, {
    old: "Heavy + V-Bowie + Fin",
    new: "Hardframe V + Fin",
    parts: ["h2", "h7", "h12"]
}, {
    old: "Horizon + Fin",
    new: "Horizon + Fin",
    parts: ["h10", "h12"]
}, {
    old: "V-Bowie + (arm) + Fin",
    new: "Palisade + Fin",
    parts: ["h11", "h7", "h12"]
}, {
    old: "Quasar + Fin",
    new: "Quasar + Fin",
    parts: ["h18", "h12"]
}, {
    old: "Star Jumper + Fin",
    new: "Radiant + Fin",
    parts: ["h9", "h12"]
}, {
    old: "Tie + (arm) + Fin",
    new: "Stardancer + Fin",
    parts: ["h11", "h13", "h12"]
}, {
    old: "Vector + Fin",
    new: "Vector + Fin",
    parts: ["h6", "h12"]
}, {
    old: "Vulture + Serenity + Fin",
    new: "Vulture + Fin",
    parts: ["h28", "h27", "h12"]
}, {
    old: "Starscream + Shockwave",
    new: "Vesper (Swept)",
    parts: ["h29", "h3"]
}, {
    old: "Firefly + H-Bowie",
    new: "Vigil",
    parts: ["h25", "h8"]
}, {
    old: "Starscream",
    new: "Vesper",
    parts: ["h29"]
}, {
    old: "Mecha-3",
    new: "Swept (low)",
    parts: ["h16", "h12"],
    exclude: ["h15", "h14"]
}, {
    old: "Mecha-5",
    new: "Swept (mid)",
    parts: ["h16", "h14", "h12"],
    exclude: ["h15"]
}, {
    old: "Mecha-7",
    new: "Swept (full)",
    parts: ["h16", "h15", "h14", "h12"]
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
