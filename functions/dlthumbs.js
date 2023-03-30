'use strict'

const admin = require('firebase-admin')
var serviceAccount = require("./nms-bhs-8025d3f3c02d.json")
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})
const bucket = admin.storage().bucket('gs://cdn.nmsce.com')
require('events').EventEmitter.defaultMaxListeners = 0
const thumbPath = "nmsce/disp/thumb/"

async function main() {
    // let ref = admin.firestore().collectionGroup("nmsceCommon")
    // ref = ref.where("type", "==", "Ship")
    // ref = ref.where("_name", "==", "Bad Wolf")
    // ref.get().then(async snapshot => {
    //     for (let doc of snapshot.docs) {
    //         let e = doc.data()
    let e = {Photo:"1be98bbe-c6f5-4fd0-b793-0d24739d5ba5.jpg"}
    
    const thumbPath = "nmsce/disp/"

            const dest = ".\\"+e.Photo
            console.log(dest)

            await bucket.file(thumbPath+e.Photo).download({
                destination: dest
            }).catch(err=>console.log(JSON.stringify(err)))
    //     }
    // })
}

main()
