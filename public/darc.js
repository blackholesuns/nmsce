'use strict'

import { collection, query, where, increment, doc, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"
import { httpsCallable, getFunctions } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js"
import { bhs, blackHoleSuns, startUp } from "./commonFb.js"
import { addGlyphButtons, addressToXYZ, addrToGlyph, calcDistXYZ, getIndex, reformatAddress, validateAddress } from "./commonNms.js"
import { galaxyList, platformList } from "./constants.js"
import { dispAddr } from "./glyph.js"
import { buildGlyphModal } from "./glyphReader.js"

// Hack to make the function global. Should be avoided and code should be reformatted to not use it
window.dispAddr = dispAddr;
window.dispGlyph = dispGlyph;

// Copyright 2019-2021 Black Hole Suns
// Written by Stephen Piper

$(document).ready(() => {
    startUp()

    bhs.buildDarcUserPnl()
    bhs.buildQueryPanel()
    bhs.buildDarcMap()

    //https://localhost:5000/preview.html?i=0547-0086-0E45-00A1-himodan-s-coup&g=Euclid&t=Ship
    let passed = {}
    let param = location.search.substring(1).split("&")

    for (let p of param) {
        if (p) {
            let obj = p.split("=")
            passed[unescape(obj[0])] = obj[1] ? unescape(obj[1]) : true
        }
    }

    if (passed.start && passed.end) {
        bhs.setAddress("start", passed.start)
        bhs.setAddress("end", passed.end)

        let i = passed.galaxy ? getIndex(galaxyList, "name", passed.galaxy) : -1
        $("#btn-Galaxy").text(i !== -1 ? galaxyList[i].number + " " + galaxyList[i].name : "Euclid")

    } else if (typeof (Storage) !== "undefined") {
        let route = window.localStorage.getItem('darcroute')

        if (route) {
            bhs.route = []
            bhs.route.push({
                route: JSON.parse(route)
            })
            bhs.displayResults(bhs.route)
        }
    }

    let gloc = $("[id='glyphbuttons']")
    addGlyphButtons(gloc, addGlyph)
    buildGlyphModal(dispGlyph)
})

function dispGlyph(evt, loc) {
    let glyph = typeof evt === "string" ? evt : $(evt).val().toUpperCase()
    if (glyph !== "") {
        if (loc)
            loc.closest("[id|='w']").find("#id-glyph").val(glyph)
        else
            $(evt).val(glyph)

        let id = loc ? loc.closest("[id|='w']").prop("id") : $(evt).closest("[id|='w']").prop("id")

        bhs.setAddress(id.stripID(), glyph)
    }
}

function setGlyphInput(evt) {
    if ($(evt).prop("checked")) {
        $("#id-glyphInput").show()
        $("#id-addrInput").hide()
        $("[id='ck-glyphs']").prop("checked", true)
    } else {
        $("#id-glyphInput").hide()
        $("#id-addrInput").show()
        $("[id='ck-glyphs']").prop("checked", false)
    }
}

function addGlyph(evt) {
    let loc = $(evt).closest("[id|='w']").find("#id-glyph")
    let a = loc.val() + $(evt).text().trim().slice(0, 1)
    loc.val(a)
    if (a.length === 12)
        dispGlyph(loc)
}

blackHoleSuns.prototype.buildDarcUserPnl = function () {
    let loc = $("#pnl-user")
    bhs.buildMenu(loc, "Platform", platformList, bhs.setGP, {
        required: true
    })
    bhs.buildMenu(loc, "Galaxy", galaxyList, bhs.setGP, {
        tip: "Empty - blue<br>Harsh - red<br>Lush - green<br>Normal - teal",
        required: true
    })
}

blackHoleSuns.prototype.setGP = function () {
    let g = $("#btn-Galaxy").text()
    let p = $("#btn-Platform").text()

    if (g === "" || p === "")
        return

    g = g.stripNumber()

    if (typeof bhs.orgList !== "undefined") {
        let loc = $("#menu-Civ-Org")
        for (let e of bhs.orgList) {
            let itm = loc.find("#item-" + e.name.nameToId())
            if (e.galaxy === g && e[p] === true)
                itm.css("background-color", "#c0f0ff")
            else
                itm.css("background-color", "#ffc0c0")
        }
    }

    if (typeof bhs.poiList !== "undefined") {
        let loc = $("#menu-POI")
        for (let e of bhs.poiList) {
            let itm = loc.find("#item-" + e.name.nameToId())
            if (e.galaxy === g && e.platform === p)
                itm.css("background-color", "#c0f0ff")
            else
                itm.css("background-color", "#ffc0c0")
        }
    }

    // bhs.status("caching")
    if (typeof (Storage) !== "undefined" && !bhs.user.uid) {
        window.localStorage.setItem('galaxy', g)
        window.localStorage.setItem('platform', p)
    }

    var calcRoute = httpsCallable(getFunctions(), 'calcRoute')
    calcRoute({
        galaxy: g,
        platform: p,
        preload: true
    }).then(res => {
        // bhs.status("complete " + res.data.preload)
    })
        .catch(err => {
            console.log(err)
        })
}

blackHoleSuns.prototype.buildQueryPanel = async function () {
    let pnl = $("#pnl-query")

    await bhs.getPoiList(true)
    bhs.buildMenu(pnl, "POI", bhs.poiList, bhs.select, {
        tip: "Points of Interest list maintained by Black Hole Suns. Blue items are in your current galaxy. Red are not.",
        labelsize: "col-md-6 col-sm-3 col-6",
        menusize: "col-8"
    })

    await bhs.getOrgList(true)
    bhs.buildMenu(pnl, "Civ/Org", bhs.orgList, bhs.select, {
        tip: "Civilizations & Organizations list is mainly from the NMS wiki. Blue items are in your current galaxy. Red are not.",
        labelsize: "col-md-6 col-sm-3 col-6",
        menusize: "col-8"
    })
}

blackHoleSuns.prototype.setAddress = function (evt, addr) {
    if (!addr)
        addr = $(evt).val()

    if (addr !== "") {
        addr = reformatAddress(addr)
        let err = validateAddress(addr, true)
        if (err !== "")
            bhs.status(err)
        else {
            let id = typeof evt === "string" ? evt : $(evt).closest("[id|='w']").prop("id").stripID()
            let glyph = addrToGlyph(addr)
            let loc = $("#id-addrInput #w-" + id)
            loc.find("#id-addr").val(addr)
            loc.find("#id-glyph").text(glyph)
            loc.find("#id-hex").text(glyph)

            loc = $("#id-glyphInput #w-" + id)
            loc.find("#id-addr").text(addr)
            loc.find("#id-glyph").val(glyph)
        }
    }
}

blackHoleSuns.prototype.select = function (btn) {
    let name = btn.text()
    let id = btn.prop("id").stripID()
    if (id === "POI") {
        let i = getIndex(bhs.poiList, "_name", name)
        let itm = bhs.poiList[i]
        bhs.setAddress("end", itm.addr)
        $("#btn-Civ-Org").text("")
        bhs.showPOI(name)
    } else {
        let i = getIndex(bhs.orgList, "_name", name)
        let itm = bhs.orgList[i]
        bhs.setAddress("end", itm.addr)
        $("#btn-Points-Of-Interest").text("")
        bhs.showOrg(name)
    }
}

blackHoleSuns.prototype.switchSE = function () {
    let s = $("#id-addrInput #w-start #id-addr").val()
    let e = $("#id-addrInput #w-end #id-addr").val()

    bhs.setAddress("start", e)
    bhs.setAddress("end", s)
}

blackHoleSuns.prototype.saveDarcSettings = function (evt) {
    let user = {}
    user.darcSettings = {}
    user.darcSettings.galalxy = $("#btn-Galaxy").text()
    user.darcSettings.platform = $("#btn-Platform").text()
    user.darcSettings.range = $("#id-range").val()
    user.darcSettings.useBases = $("#ck-useBases").prop("checked")
    user.darcSettings.nearPath = $("#ck-nearPath").prop("checked")
    user.darcSettings.maxJumps = $("#id-maxJumps").val()
    user.darcSettings.start = $("#id-addrInput #w-start #id-addr").val()
    user.darcSettings.end = $("#id-addrInput #w-end #id-addr").val()

    if (typeof (Storage) !== "undefined" && !bhs.user.uid)
        window.localStorage.setItem('darcsettings', JSON.stringify(user.darcSettings))
    else if (bhs.user.uid)
        bhs.updateUser(user)
}

blackHoleSuns.prototype.updateDarcSettings = function () {
    if (typeof (Storage) !== "undefined" && typeof bhs.user.darcSettings === "undefined") {
        let settings = window.localStorage.getItem('darcsettings')

        if (settings)
            bhs.user.darcSettings = JSON.parse(settings)
    }

    if (typeof bhs.user.darcSettings !== "undefined") {
        $("#btn-Galaxy").text(typeof bhs.user.darcSettings.galalxy === "undefined" ? bhs.user.galaxy : bhs.user.darcSettings.galalxy)
        $("#btn-Platform").text(typeof bhs.user.darcSettings.platform === "undefined" ? bhs.user.platform : bhs.user.darcSettings.platform)
        $("#id-range").val(typeof bhs.user.darcSettings.range !== "undefined" ? bhs.user.darcSettings.range : 2000)
        $("#ck-useBases").prop("checked", bhs.user.uid && bhs.user.darcSettings.useBases)
        $("#ck-nearPath").prop("checked", bhs.user.darcSettings.nearPath)
        $("#id-maxJumps").val(typeof bhs.user.darcSettings.maxJumps !== "undefined" ? bhs.user.darcSettings.maxJumps : 20)
        bhs.setAddress("start", typeof bhs.user.darcSettings.start !== "undefined" ? bhs.user.darcSettings.start : "")
        bhs.setAddress("end", typeof bhs.user.darcSettings.end !== "undefined" ? bhs.user.darcSettings.end : "")
    }

    if (typeof (Storage) !== "undefined") {
        let nmsce = window.localStorage.getItem('nmsce-addr')
        if (nmsce)
            $("#id-end").val(reformatAddress(nmsce))

        window.localStorage.removeItem('nmsce-addr')
    }
}

blackHoleSuns.prototype.showPOI = function (name) {
    const img = `<img id="img-pic" height="auto" width="wsize" />`
    let w = Math.min($("#id-input").height() + 20, screen.width - 30)
    let h = /wsize/[Symbol.replace](img, w + "px")

    $("#plymap").hide()
    $("#navcanvas").hide()
    $("#navHowto").hide()
    $("#navse").hide()
    let loc = $("#image")
    loc.empty()
    loc.show()
    loc.append(h)

    getDocs(query(collection(bhs.fs, "poi"), where("name", "==", name))).then(snapshot => {
        if (!snapshot.empty) {
            let e = snapshot.docs[0].data()

            getDownloadURL(ref(bhs.fbstorage, e.img)).then(url => {
                loc.find("#img-pic").attr("src", url)
            })
        }
    })
}

blackHoleSuns.prototype.showOrg = function (name) {
    const img = `<img id="img-pic" height="auto" width="wsize" />`
    let w = Math.min($("#id-input").height() + 20, screen.width - 30)
    let h = /wsize/[Symbol.replace](img, w + "px")

    $("#plymap").hide()
    $("#navcanvas").hide()
    $("#navHowto").hide()
    $("#navse").hide()
    let loc = $("#image")
    loc.empty()
    loc.show()
    loc.append(h)

    getDocs(query(collection(bhs.fs, "org"), where("name", "==", name))).then(snapshot => {
        if (!snapshot.empty) {
            let e = snapshot.docs[0].data()

            getDownloadURL(ref(bhs.fbstorage, e.img)).then(url => {
                loc.find("#img-pic").attr("src", url)
            })
        }
    }).catch(err => console.log(err.code))
}

blackHoleSuns.prototype.calcroute = async function (proximity) {
    bhs.status("starting", true)
    let loc = $("#resItems")
    loc.empty()

    let start = $("#id-addrInput #w-start #id-addr").val()
    let end = $("#id-addrInput #w-end #id-addr").val()

    let err = validateAddress(start)
    if (err !== "") {
        bhs.status(err, true)
        return
    }

    err = validateAddress(end, true)
    if (err !== "") {
        bhs.status(err)
        return
    }

    bhs.saveDarcSettings()

    const incrementRef = increment(1)

    let darc = {}
    darc.routeGen = incrementRef

    let d = new Date()
    let n = d.getFullYear() + "-" + (d.getMonth() + 1)
    darc[n] = incrementRef

    if (bhs.user.uid === "")
        darc.noLogin = incrementRef

    setDoc(doc(bhs.fs, "bhs/pageTotals"),{
        darc: darc
    }, {
        merge: true
    })

    var calcRoute = httpsCallable(getFunctions(), 'calcRoute');
    calcRoute({
        start: start,
        end: end,
        range: $("#id-range").val(),
        maxJumps: $("#id-maxJumps").val(),
        galaxy: $("#btn-Galaxy").text().stripNumber(),
        platform: $("#btn-Platform").text(),
        proximity: proximity,
        user: typeof bhs.user.uid === "undefined" ? "" : bhs.user.uid,
        usebases: $("#ck-useBases").prop("checked"),
        nearPath: $("#ck-nearPath").prop("checked")
    }).then(async res => {
        if (typeof res.data.err !== "undefined")
            bhs.status("ERROR: " + res.data.err)
        else {
            bhs.route = res.data.route
            bhs.status(" done " + res.data.calc)
            bhs.displayResults(bhs.route)
        }
    })
        .catch(err => {
            console.log(err)
            bhs.status("ERROR: " + (typeof err.code !== "undefined" ? err.code : JSON.stringify(err)))
        })
}

const restable = [{
    title: "Description",
    name: "desc",
    format: "col-lg-3 col-md-4 col-14"
}, {
    title: "Distance",
    name: "dist",
    field: "dist",
    format: "col-lg-3 col-md-4 col-14"
}, {
    title: "Coordinates",
    name: "addr",
    field: "addr",
    format: "col-lg-8 col-md-4 col-14 monospace"
}, {
    title: "Glyph",
    name: "glyph",
    field: "addr",
    format: "col-lg-9 col-md-14 col-14 clr-blue txt-glyph-disp"
}, {
    title: "System",
    name: "sys",
    field: "system",
    format: "col-lg-2 col-md-4 col-14 txt-label-def"
}, {
    title: "Region",
    name: "reg",
    field: "region",
    format: "col-lg-2 col-md-4 col-14"
}, {
    name: "newrow",
}, {
    title: "&nbsp;&nbsp;&nbsp;--&nbsp;Exit",
    name: "blank",
    format: "col-lg-6 col-md-8 col-14"
}, {
    name: "x-addr",
    id: "addr",
    field: "addr",
    format: "col-lg-3 col-md-4 col-14 monospace"
}, {
    name: "x-sys",
    id: "sys",
    field: "system",
    format: "col-lg-2 col-md-4 col-14"
}, {
    name: "x-reg",
    id: "reg",
    field: "region",
    format: "col-lg-2 col-md-4 col-14"
},]

blackHoleSuns.prototype.displayResults = function (routes) {
    const hdr = $("#resHeader")

    const block = `
        <div id="id-rindex" class="row pl-30 txt-def border-top-gold" onclick="selectRoute(this)"></div>
        <div id="block-rindex" style="display:none;">`
    const row = `<div id="id-addr" class="row pl-15 txt-input-def" onclick="mapRow(this)">`
    const itm = `<div id="itm-field" class="format">title</div>`
    const enddiv = `</div>`
    let h = ""

    for (let f of restable) {
        if (f.name === "newrow")
            break
        else {
            let l = /field/[Symbol.replace](itm, f.name)
            l = /format/[Symbol.replace](l, f.format)
            // l = /txt-input-def/ [Symbol.replace](l, "")
            // l = /h4/ [Symbol.replace](l, "")
            l = /title/[Symbol.replace](l, f.title)
            h += l
        }
    }

    hdr.empty()
    hdr.append(h + enddiv)

    let idx = 0

    for (let rte of routes) {
        let route = rte.route

        let h = /index/g[Symbol.replace](block, idx)

        let loc = $("#resItems")
        let range = $("#id-range").val()
        let b = false
        let poi = 0

        for (let i = 0; i < route.length; ++i) {
            let r = route[i]
            let finished = false

            let l = /addr/[Symbol.replace](row, r.what === "teleport" ? r.exit.addr : r.addr)
            h += /row/[Symbol.replace](l, b ? "row bkg-vlight-gray" : "row bkg-white")
            b = !b
            let warp

            for (let f of restable) {
                let end = false
                let l = /field/[Symbol.replace](itm, typeof f.id !== "undefined" ? f.id : f.name)
                l = /format/[Symbol.replace](l, f.format)

                switch (f.name) {
                    case "desc":
                        warp = false
                        switch (r.what) {
                            case "bh":
                                if (r.dist === 0 && r.addr === r.exit.addr)
                                    l = /title/[Symbol.replace](l, "Transit black hole")
                                else {
                                    l = /title/[Symbol.replace](l, "Warp to black hole")
                                    warp = true
                                }
                                break
                            case "start":
                                l = /title/[Symbol.replace](l, "Start")
                                break
                            case "teleport":
                                l = /title/[Symbol.replace](l, "<div class='row'>Teleport to&nbsp;&nbsp;<div class=' txt-label-def'>" + r.name + "</div></div>")
                                r = r.exit
                                break
                            case "end":
                                finished = true
                                if (r.dist === 0) {
                                    l = /title/[Symbol.replace](l, "<h5>Arrived at destination</h5>")
                                    end = true
                                } else {
                                    l = /title/[Symbol.replace](l, "Warp to destination")
                                    warp = true
                                }
                                break
                            case "poi":
                                l = /title/[Symbol.replace](l, "<div class='row text-danger h6'>POI: " + r.name + "</div>")
                                poi++
                                break
                            default:
                                l = ""
                                end = true
                                break
                        }
                        break

                    case "dist":
                        if (typeof r.dist === "undefined" || i === 0)
                            l = /title/[Symbol.replace](l, "")
                        else if (r.dist === 0)
                            l = /title/[Symbol.replace](l, "Same Region")
                        else
                            l = /title/[Symbol.replace](l, r.dist.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "ly or " + r.jumps + " jumps")
                        break

                    case "glyph":
                        l = /title/[Symbol.replace](l, r.what === "poi" || warp ? addrToGlyph(r[f.field], r.planet) : "")
                        break

                    case "x-addr":
                    case "addr":
                        l = /title/[Symbol.replace](l, r[f.field])
                        break

                    case "x-sys":
                        l = /txt-label-def/[Symbol.replace](l, "")
                    case "sys":
                        if (!warp)
                            l = /txt-label-def/[Symbol.replace](l, "")
                        l = /title/[Symbol.replace](l, typeof r[f.field] !== "undefined" && r[f.field] ? r[f.field] : typeof r.name !== "undefined" && r.name ? r.name : "")
                        break

                    case "x-reg":
                    case "reg":
                        l = /title/[Symbol.replace](l, typeof r.owner !== "undefined" && r.owner ? r.owner : typeof r[f.field] !== "undefined" && r[f.field] ? r[f.field] : "")
                        break

                    case "blank":
                        l = /title/[Symbol.replace](l, typeof f.title !== "undefined" ? f.title : "")
                        break

                    case "newrow":
                        if (typeof r.exit === "undefined") {
                            l = ""
                            end = true
                        } else if (r.what !== "teleport") {
                            r = r.exit
                            h += enddiv
                            l = /addr/[Symbol.replace](row, r.addr)
                            l = /row/[Symbol.replace](l, !b ? "row bkg-vlight-gray border-top border-white" : "row bkg-white border-top")
                        } else
                            l = ""
                        break
                }

                h += l
                if (end)
                    break
            }

            h += enddiv
            if (finished)
                break
        }

        loc.append(h + enddiv)

        const res = `
            <div class="col-md-4 col-14">
                <div class="row h5">title</div>
            </div>
            <div class="col clr-cream">
                <div id="res-row" class="row"></div>
            </div>`

        const resrow = `<div class="col-md-7 col-14">title</div>`

        const r = route[route.length - 1]
        h = /title/[Symbol.replace](res, typeof r.name !== "undefined" ? r.name : typeof r.system !== "undefined" ? r.system : r.addr)

        const rloc = loc.find("#id-r" + idx)
        rloc.html(h)

        let dist = parseInt(calcDistXYZ(route[0].coords, route[route.length - 1].coords) * 400)
        const calc = Math.ceil(dist / range)
        dist = dist.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        const per = parseInt((1 - rte.jumps / calc) * 100)

        h = ""

        if (rte.jumps < calc) {
            h += /title/[Symbol.replace](resrow, rte.jumps + " jumps for DARC vs. " + calc + " direct warp jumps.")
            h += /title/[Symbol.replace](resrow, "Original warp distance " + dist + " light years.")
            h += /title/[Symbol.replace](resrow, "A " + per + "% savings.")
            if (rte.bh > 0)
                h += /title/[Symbol.replace](resrow, "Cornell Index of " + rte.bh + " black holes.")
        } else {
            let l = /col-md-7/[Symbol.replace](resrow, "col-md-9")
            h += /title/[Symbol.replace](l, calc + " direct warp jumps, distance " + dist + " light years.")
        }
        if ($("#ck-nearPath").prop("checked") && poi > 0)
            h += /title/[Symbol.replace](resrow, poi + " additional POI along route.")

        rloc.find("#res-row").append(h)
        idx++
    }

    if (routes.length === 1)
        selectRoute("#id-r0")
}

var selected

function selectRoute(evt) {
    let idx = $(evt).prop("id").stripID()
    selected = idx.slice(1)
    $("[id|='block']").hide()
    $("#block-" + idx).show()

    bhs.setAddress("start", bhs.route[selected].route[0].addr)
    bhs.setAddress("end", bhs.route[selected].route[bhs.route[selected].route.length - 1].addr)

    mapRoute(bhs.route[selected].route)

    if (typeof (Storage) !== "undefined")
        window.localStorage.setItem('darcroute', JSON.stringify(bhs.route[selected].route))
}

blackHoleSuns.prototype.buildDarcMap = function () {
    let w = $("#maplogo").parent().width()
    $("#logo").width(Math.min(w, 120))
    $("#logo").height(Math.min(w, 120))

    let zero = {
        x: 2048,
        y: 128,
        z: 2048,
    }

    let layout = changeMapLayout()
    let data = []
    let out = initout()
    pushentry(out, zero, "Galactic Center")
    data.push(makedata(out, 2, "#c0c0c0"))

    Plotly.newPlot('plymap', data, layout)
}

function redraw() {
    mapRoute(bhs.route[selected].route)
}

function mapRoute(route) {
    $("#image").hide()
    $("#navcanvas").hide()
    $("#navHowto").hide()
    $("#navse").hide()
    $("#plymap").show()

    let data = []

    let zero = {
        x: 2048,
        y: 128,
        z: 2048,
    }

    let truezero = {
        x: 0,
        y: 0,
        z: 0,
    }

    let out = initout()
    pushentry(out, truezero)
    pushentry(out, zero)
    data.push(makedata(out, 4, "#d0d0d0"))

    for (let i = 0; i < route.length; ++i) {
        let r = route[i]
        let l = route[i - 1]
        out = initout()

        switch (r.what) {
            case "start":
                pushentry(out, r.coords, r.addr + (r.region ? "<br>" + r.region : "") + (r.system ? "<br>" + r.system : ""))
                data.push(makedata(out, 5, "#00ff00"))
                break

            case "end":
                if (typeof l.exit !== "undefined")
                    l = l.exit
                pushentry(out, l.coords, l.addr + (l.region ? "<br>" + l.region : "") + (l.system ? "<br>" + l.system : ""))
                pushentry(out, r.coords, r.addr + (r.region ? "<br>" + r.region : "") + (r.system ? "<br>" + r.system : ""))
                data.push(makedata(out, 4, "#ff0000", "#ff0000"))

                out = initout()
                pushentry(out, r.coords, r.addr + (r.region ? "<br>" + r.region : "") + (r.system ? "<br>" + r.system : ""))
                data.push(makedata(out, 5, "#ff0000"))
                break

            case "teleport":
            case "bh":
                if (typeof l.exit !== "undefined")
                    l = l.exit
                pushentry(out, l.coords, l.addr + (l.region ? "<br>" + l.region : "") + (l.system ? "<br>" + l.system : ""))
                pushentry(out, r.coords, r.addr + (r.region ? "<br>" + r.region : "") + (r.system ? "<br>" + r.system : ""))
                data.push(makedata(out, 4, "#ff0000", "#ff0000"))

                out = initout()
                pushentry(out, r.coords, r.addr + (r.region ? "<br>" + r.region : "") + (r.system ? "<br>" + r.system : ""))
                r = r.exit
                pushentry(out, r.coords, r.addr + (r.region ? "<br>" + r.region : "") + (r.system ? "<br>" + r.system : ""))
                data.push(makedata(out, 4, "#00ff00", "#00ff00"))
                break

            case "poi":
        }
    }

    Plotly.react('plymap', data, changeMapLayout())
}

function mapRow(evt) {
    let sloc = $(evt)
    let line = sloc.hasClass("bkg-white")
    let start = sloc.prop("id").stripID()
    let sxyz = addressToXYZ(start)

    let eloc = $(evt).next()
    let pair = line === eloc.hasClass("bkg-white")
    let end = eloc.prop("id")
    if (typeof end === "undefined")
        return
    end = end.stripID()
    let exyz = addressToXYZ(end)

    $("#navse").text(start + " to " + end)
    $("#plymap").hide()
    $("#navcanvas").show()
    $("#navHowto").show()
    $("#navse").show()

    let a = calcAngles(sxyz, exyz)
    mapAngles("navcanvas", a)

    $('html, body').animate({
        scrollTop: $("#navcanvas").offset().top
    }, 500)

    $("#image").hide()
}

function pushentry(out, xyz, label) {
    out.x.push(xyz.x)
    out.y.push(4095 - xyz.z)
    out.z.push(xyz.y)
    out.t.push(label ? label : "")
}

function initout(out) {
    out = {}
    out.x = []
    out.y = []
    out.z = []
    out.t = []

    return out
}

function changeMapLayout(zoom, saddr, eaddr) {
    let xstart = 0
    let xctr = 2048
    let xend = 4095

    let zstart = 0
    let zctr = 128
    let zend = 255

    let ystart = 0
    let yctr = 2048
    let yend = 4095

    if (zoom) {
        let sxyz = addressToXYZ(saddr)
        let exyz = addressToXYZ(eaddr)
        let d = Math.ceil(calcDistXYZ(sxyz, exyz))

        xctr = sxyz.x
        yctr = 4095 - sxyz.z
        zctr = sxyz.y

        xstart = xctr - d
        xend = xctr + d

        ystart = yctr - d
        yend = yctr + d

        zstart = zctr - d
        zend = zctr + d

        if (xstart < 0)
            xstart = 0
        if (xend > 4095)
            xend = 4095

        if (ystart < 0)
            ystart = 0
        if (yend > 4095)
            yend = 4095

        if (zstart < 0)
            zstart = 0
        if (zend > 255)
            zend = 255
    }

    let layout = {
        hovermode: "closest",
        showlegend: false,
        paper_bgcolor: "#000000",
        plot_bgcolor: "#000000",
        scene: {
            camera: {
                up: {
                    x: 0,
                    y: 0,
                    z: 1
                },
                center: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                eye: {
                    x: 0,
                    y: -.01,
                    z: 2,
                }
            },
            zaxis: {
                backgroundcolor: "#000000",
                gridcolor: "#c0c0c0",
                zerolinecolor: "#c0c0c0",
                showbackground: true,
                title: {
                    text: "Y",
                    font: {
                        color: "#c0c0c0",
                    }
                },
                range: [zstart, zend],
                tickvals: [zstart, zctr, zend],
                ticktext: [zstart.toString(16), zctr.toString(16), zend.toString(16)],
                tickfont: {
                    color: "#c0c0c0"
                },
                tickangle: 45,
            },
            xaxis: {
                backgroundcolor: "#000000",
                gridcolor: "#c0c0c0",
                zerolinecolor: "#c0c0c0",
                showbackground: true,
                title: {
                    text: "X",
                    font: {
                        color: "#c0c0c0",
                    }
                },
                range: [xstart, xend],
                tickvals: [xstart, xctr, xend],
                ticktext: [xstart.toString(16), xctr.toString(16), xend.toString(16)],
                tickfont: {
                    color: "#c0c0c0"
                },
                tickangle: 45,
            },
            yaxis: {
                backgroundcolor: "#000000",
                gridcolor: "#c0c0c0",
                zerolinecolor: "#c0c0c0",
                title: {
                    text: "Z",
                    font: {
                        color: "#c0c0c0",
                    }
                },
                showbackground: true,
                range: [ystart, yend],
                tickvals: [ystart, yctr, yend],
                ticktext: [yend.toString(16), yctr.toString(16), ystart.toString(16)],
                tickfont: {
                    color: "#c0c0c0"
                },
                tickangle: 45,
            },
        },
    }

    layout.margin = {
        l: 0,
        r: 0,
        b: 0,
        t: 0
    }

    let w = Math.min($("#plymap").parent().width(), screen.width - 30)
    layout.width = w
    layout.height = w

    return layout
}

function makedata(out, size, color, linecolor) {
    let line = {
        x: out.x,
        y: out.y,
        z: out.z,
        text: out.t,
        mode: 'markers',
        marker: {
            size: size,
            color: color,
            opacity: 0.6,
        },
        type: "scatter3d",
        hoverinfo: 'text',
    }

    if (linecolor) {
        line.mode = 'lines+markers'
        line.line = {
            color: linecolor,
            width: 2,
            opacity: 0.4,
        }
    }

    return line
}

blackHoleSuns.prototype.status = function (str, clear) {
    if (clear)
        $("#status").empty()

    $("#status").append("<h6>" + str + "</h6>")
}