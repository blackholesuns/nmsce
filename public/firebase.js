import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js"
import { getAuth, getRedirectResult, signInWithRedirect, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js"
import { getFirestore, Timestamp, enableIndexedDbPersistence, collection, query, where, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,  onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js"
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js"
import { buildGalaxyInfo, validateAddress, fcedata, fnmsce, fsearch, ftotals, mergeObjects } from "./commonNms.js";
import { platformList } from "./constants.js";

var fbconfig = {
    apiKey: FIREBASE_API,
    authDomain: "nms-bhs.firebaseapp.com",
    databaseURL: "https://nms-bhs.firebaseio.com",
    projectId: "nms-bhs",
    storageBucket: "nms-bhs.appspot.com",
    messagingSenderId: FIREBASE_MSGID,
};

export const App = initializeApp(fbconfig);
export const Auth = getAuth(App);
export const Firestore = getFirestore(App);
export const Storage = getStorage(App);