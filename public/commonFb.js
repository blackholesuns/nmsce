'use strict';
import { getAuth, signInWithRedirect, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
import { Timestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
import { buildGalaxyInfo } from "./commonNms.js";
import { App, Auth, Firestore, Storage } from "./firebase.js";

// Copyright 2019-2023 Black Hole Suns
// Written by Stephen Piper

export var bhs;

export function startUp() {
    $("#javascript").remove()
    $("#jssite").show()


    // Bad hack to make bhs global. Should not be used
    window.bhs = bhs = new blackHoleSuns()
    bhs.init()
    bhs.initFirebase()

    $("#bhsmenus").load("bhsmenus.html", () => {
        let page = window.location.pathname.replace(/(.*)\//, "$1")
        page = page === "" ? "index" : page

        let loc = $("[href='" + page + "']")
        $("#pagename").html(loc.text())

        $("#banner").on("load", () => {
            let width = $("body").width()
            loc = $("[src='images/bhs-banner.jpg']")
            let iwidth = loc.width()
            let iheight = loc.height() * width / iwidth

            loc.width(width)
            loc.height(iheight)
        })
    })

    $("#footer").load("footer.html")

    $("body").tooltip({
        selector: '[data-toggle="tooltip"]'
    })
}

export class blackHoleSuns {
    user = {};
    unsub = {};
    fbauth = null;
    fs = null;
    fbstorage = null;
    app = null;

    init() {
        buildGalaxyInfo()
        this.user = this.userInit()
    }

    userInit() {
        let user = {}
        user.uid = null
        user.role = "user"
        user._name = ""
        user.platform = ""
        user.galaxy = ""
        user.assigned = false
        user.org = ""

        return user
    }

    initFirebase() {
        this.app = App
        this.fbauth = Auth
        this.fs = Firestore
        this.fbstorage = Storage

        this.fbauth.onAuthStateChanged(this.onAuthStateChanged.bind(this))
    }

    logIn() {
        $("#loginpnl").show()
        $("#jssite").hide()

        $("#lcancel").click(() => {
            $("#loginpnl").hide()
            $("#jssite").show()
        })

        $("#lgoogle").click(() => {
            var provider = new GoogleAuthProvider()
            provider.addScope('profile')
            provider.addScope('email')
            signInWithRedirect(getAuth(), provider)
        })

        $("#lgithub").click(() => {
            var provider = new GithubAuthProvider()
            signInWithRedirect(getAuth(), provider)
        })

        $("#ltwitch").click(() => { })

        $("#ldiscord").click(() => { })

        $("#lreddit").click(() => { })
    }

    logOut() {
        // this.unsubscribe()
        this.fbauth.signOut()
    }

    async onAuthStateChanged(usr) {
        if (usr) {
            let profilePicUrl = usr.photoURL
            let userName = usr.displayName
            let user = this.userInit()
            user.uid = usr.uid

            $("#userpic").attr('src', profilePicUrl || '/images/body_image.png')
            $("#username").text(userName)

            let ref = doc(this.fs, "users", user.uid)
            try {
                let doc = await getDoc(ref);
                if (doc.exists())
                    user = doc.data()
                else {
                    user.firsttime = Timestamp.now()
                    user.page = window.location.pathname
                }
            } catch {
                user.firsttime = Timestamp.now()
                user.page = window.location.pathname
            }

            user.email = usr.email
            if (usr.displayName)
                user.displayName = usr.displayName

            user.role = 'user';
            user.lasttime = Timestamp.now()
            this.updateUser(user)

            this.doLoggedin(user)
            this.navLoggedin()
        } else {
            this.navLoggedout()
            this.user = this.userInit()
            this.doLoggedout()
        }
    }

    navLoggedin() {
        $("#loggedout").hide()
        $("#loggedin").show()
        $("#login").hide()
        $("#usermenu").show()
    }

    navLoggedout() {
        $("#loggedout").show()
        $("#loggedin").hide()
        $("#login").show()
        $("#usermenu").hide()
    }

    async updateUser(user) {
        this.user = Object.assign(this.user, user)

        if (this.user.uid) {
            let ref = doc(this.fs, "users", bhs.user.uid)
            return await setDoc(ref, this.user, {
                merge: true
            }).then(() => {
                return true
            }).catch(err => {
                if (this.status)
                    this.status("ERROR: " + err)

                console.log(err)
                return false
            })
        } else
            return false
    }

    // async getUser(displayFcn) {
    //     if (this.user.uid && typeof displayFcn !== "undefined" && displayFcn) {
    //         let ref = doc(this.fs, "users", bhs.user.uid)
    //         ref.get().then(doc=>{
    //             displayFcn(doc.data())
    //         })

    //         // this.subscribe("user", ref, displayFcn)
    //     }
    // }

    // subscribe(what, ref, displayFcn) {
    //     if (displayFcn) {
    //         this.unsubscribe(what)
    //         this.unsub[what] = onSnapshot(ref, snapshot => {
    //             if (typeof snapshot.exists !== "undefined") {
    //                 if (snapshot.exists())
    //                     displayFcn(snapshot.data(), snapshot.ref.path)
    //             } else
    //                 snapshot.docChanges().forEach(change => {
    //                     displayFcn(change.doc.data(), change.doc.ref.path)
    //                 })
    //         }, err => {
    //             console.log(err)
    //         })
    //     }
    // }

    // unsubscribe(m) {
    //     let ulist = Object.keys(this.unsub)
    //     for (let i = 0; i < ulist.length; ++i) {
    //         let x = ulist[i]
    //         if (!m || x == m) {
    //             this.unsub[x]()
    //             delete this.unsub[x]
    //         }
    //     }
    // }

    validateUser(user) {
        let ok = true

        if (!user._name || user._name == "" || user._name.match(/unknown traveler/i)) {
            this.status("Error: Missing or invalid player name. Changes not saved.", 0)
            ok = false
        }

        if (ok && !user.galaxy) {
            this.status("Error: Missing galaxy. Changes not saved.", 0)
            ok = false
        }

        // if (ok && !user.platform) {
        //     this.status("Error: Missing platform. Changes not saved.", 0)
        //     ok = false
        // }
    
        return ok
    }
}
