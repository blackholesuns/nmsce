import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js"
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js"
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js"
// import { } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js"

var fbconfig = {
    apiKey: FIREBASE_API,
    authDomain: "nmsce.com",
    databaseURL: "https://nms-bhs.firebaseio.com",
    projectId: "nms-bhs",
    storageBucket: "cdn.nmsce.com",
    messagingSenderId: FIREBASE_MSGID,
};

export const App = initializeApp(fbconfig);
export const Auth = getAuth(App);
export const Firestore = getFirestore(App);
export const Storage = getStorage(App);
