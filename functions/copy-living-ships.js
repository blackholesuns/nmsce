const admin = require('firebase-admin')
var serviceAccount = require("./nms-bhs-8025d3f3c02d.json")
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})
require('events').EventEmitter.defaultMaxListeners = 0

async function main() {
    let groupref = admin.firestore().collectionGroup("nmsceCommon")

    snapshot = await groupref.where("type", "==", "Living-Ship").get()
    console.log(snapshot.docs.length, "Living-Ship")

    for (let d of snapshot.docs) {
        let common = d.data()

        let doc = await admin.firestore().doc("nmsce/" + common.galaxy + "/Living-Ship/" + common.id).get()
        let item = doc.data()

        item.type = "Ship"
        item.Type = "Living"
        common.type = "Ship"
        common.Type = "Living"

        await admin.firestore().doc("nmsce/" + common.galaxy + "/Ship/" + item.id).set(item)
        await admin.firestore().doc("nmsce/" + common.galaxy + "/Ship/" + item.id + "/nmsceCommon/" + item.id).set(common)

        let votes = await admin.firestore().collection("nmsce/" + common.galaxy + "/Living-Ship/" + common.id + "/votes").get()

        for (let d of votes.docs) {
            let vote = d.data()
            vote.type = "Ship"
            vote.Type = "Living"

            await admin.firestore().doc("nmsce/" + common.galaxy + "/Ship/" + item.id + "/votes/" + vote.uid).set(vote)
        }

        console.log(common.galaxy, item.id, votes.docs.length)
    }
}

main()
