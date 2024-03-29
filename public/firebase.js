import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js"
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js"
// import { } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js"

var fbconfig = {
    apiKey: FIREBASE_API,
    authDomain: "nms-bhs.firebaseapp.com",
    databaseURL: "https://nms-bhs.firebaseio.com",
    projectId: "nms-bhs",
    storageBucket: "cdn.nmsce.com",
    messagingSenderId: FIREBASE_MSGID,
};

export const App = initializeApp(fbconfig);
export const Auth = getAuth(App);
export const Firestore = getFirestore(App);
export const Storage = getStorage(App);
