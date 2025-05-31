'use strict'

import { setLogLevel } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
import {
    getCountFromServer, Timestamp, collection, collectionGroup, query, where, orderBy, increment,
    arrayUnion, startAfter, limit, doc, getDoc, getDocs, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"
import { bhs, blackHoleSuns, startUp } from "./commonFb.js";
import {
    addGlyphButtons, addressToXYZ, addrToGlyph, fcedata, fnmsce, fpreview, getIndex, mergeObjects,
    reformatAddress, uuidv4, validateAddress
} from "./commonNms.js";
import {
    biomeList, classList, colorList, economyList, economyListTier, faunaList, faunaProductTamed,
    fontList, frigateList, galaxyList, latestversion, lifeformList, modeList, resourceList, sentinelList,
    shipList, versionList
} from "./constants.js";
import { calcImageSize } from "./imageSizeUtil.js";
import { CollateChangeLog, Version } from "./metadata.js";
import {
    DeleteImages, GetDisplayPath, GetDisplayUrl, GetOriginalPath, GetOriginalUrl, GetThumbnailPath,
    GetThumbnailUrl, UploadImages
} from "./storage.js";

if (window.location.hostname === "localhost")
    setLogLevel("verbose");

// Copyright 2019-2025 Black Hole Suns
// Written by Stephen Piper

export var nmsce;
// Does nothing. Purely for consistency
window.nmsce = nmsce;

$(document).ready(() => {
    startUp();

    $("#cemenus").load("header.html", () => {
        $("#version-number").text("v" + Version);
        $("#changelogpnlcontent").append(CollateChangeLog())

        $("#changelog").click(() => {
            let panel = $("#changelogpnl");
            $("#changelogpnlexit").click(() => panel.hide())
            $(document).on('keydown', function (event) {
                if (event.key == "Escape") {
                    panel.hide();
                }
            });
            panel.show();
        });

        let loc = fnmsce ? $("#searchpage") : fcedata ? $("#entrypage") : []
        if (loc.length > 0) {
            loc.css("border-color", "red")
            loc.css("border-width", "3px")
        }
    })

    // Bad hack. Should not be used
    window.nmsce = nmsce = new NMSCE()
    nmsce.last = {}

    if (!fpreview) {
        nmsce.buildPanels()
        nmsce.buildTypePanels()

        if (fnmsce) {
            nmsce.buildResultsList()
            nmsce.buildTotals()
            // nmsce.buildPatron()

            nmsce.getTotals()
            nmsce.getResultsLists()

            nmsce.expandPanels(false)
        }

        if (fcedata) {
            nmsce.buildImageText()
            tmImage.load("/bin/model.json", "/bin/metadata.json").then(model => nmsce.model = model)
            nmsce.buildDisplayList()
        }

        nmsce.clearPanel(true)

        // set default
        let loc = $("#hdr-Ship #menu-Type")
        loc.val("Fighter")
        nmsce.selectSublist(loc)
    }

    //https://localhost:5000/preview?i=0547-0086-0E45-00A1-himodan-s-coup
    let passed = {}
    let param = location.search.substring(1).split("&")

    for (let p of param) {
        if (p) {
            let obj = p.split("=")
            passed[decodeURI(obj[0])] = obj[1] ? decodeURI(obj[1]) : true
            if (obj[0] === 'g') {
                let i = getIndex(galaxyList, "name", passed.g.idToName())
                if (i >= 0)
                    passed.g = galaxyList[i].name
            }
        }
    }

    if (passed.state && passed.code)
        nmsce.redditLoggedIn(passed.state, passed.code)

    else if (passed.s && passed.g) {
        nmsce.last = {}
        nmsce.last.addr = reformatAddress(passed.s)
        nmsce.last.galaxy = passed.g
        nmsce.searchSystem()

    } else if (passed.r && passed.g) {
        nmsce.last = {}
        nmsce.last.addr = reformatAddress(passed.r)
        nmsce.last.galaxy = passed.g
        nmsce.searchRegion()

    } else if (passed.i) {
        getDoc(doc(bhs.fs, "nmsceCombined/" + passed.i)).then(doc => {
            if (doc.exists) {
                if (fnmsce || fpreview)
                    nmsce.displaySelected(doc.data())
                else if (fcedata)
                    nmsce.displaySingle(doc.data())
            }
        })
    } else if (passed.s && passed.t) {
        nmsce.last.addr = reformatAddress(passed.s)
        nmsce.last.Type = passed.t
        nmsce.searchType()

    } else if (passed.f) {
        nmsce.last.Genus = passed.f
        nmsce.searchFauna()
    }
})

const planetNumTip = `This is the first glyph in the portal address. Assigned to each celestial body according to their aphelion.`

let nav = `
    <a id="tab-idname" class="nav-item nav-link txt-def h6 rounded-top active" style="border-color:black;" 
        data-toggle="tab" href="#hdr-idname" role="tab" aria-controls="hdr-idname" aria-selected="true">
        title
    </a>`
let header = `
    <div id="hdr-idname" class="tab-pane active" role="tabpanel" aria-labelledby="tab-idname">
        <div id="pnl-idname" class="row"></div>
    </div>`
let mapHeader = `<div id="pnl-idname" class="border rounded" style="display:none;"></div>`
const tSubList = `<div id="slist-idname" class="row pl-10" style="display:none"></div>`
const tReq = `&nbsp;<font style="color:red">*</font>`
const tText = `&nbsp;
    <span data-toggle="tooltip" data-html="true" data-placement="bottom" title="ttext">
        <i class="bx bx-help-circle text-danger h6"></i>
    </span>`
const inpHdr = `<div class="col-lg-7 col-14" data-allowhide="ihide">`
const inpLongHdr = `<div class="col-14" data-allowhide="ihide">`
const inpEnd = `</div>`
const tString = `
    <div id="row-idname" data-type="string" data-req="ifreq" class="row">
        <div class="col-lg-6 col-4 txt-label-def">titlettip&nbsp;</div>
        <input id="id-idname" class="rounded col-lg-7 col-9">&nbsp;
        <!--i class="bx bx-check text-success hidden"></i-->
    </div>`
const tMap = `<div id="row-idname" class="" data-type="map"></div>`
const tLongString = `
    <div id="row-idname" data-type="string" data-allowhide="ihide" data-req="ifreq" class="row">
        <div class="col-lg-6 col-4 pl-15 txt-label-def">titlettip&nbsp;</div>
        <input id="id-idname" class="rounded col">
    </div>`
const tNumber = `
    <div id="row-idname" data-type="number" data-allowhide="ihide" data-req="ifreq" data-search="stype" class="row">
        <div class="col-lg-6 col-4 txt-label-def">titlettip&nbsp;</div>
        <input id="id-idname" type="number" class="rounded col-lg-7 col-9" min=-1 max=range value=-1>
    </div>`
const tFloat = `
    <div id="row-idname" data-type="float" data-allowhide="ihide" data-req="ifreq" data-search="stype" class="row">
        <div class="col-lg-6 col-4 txt-label-def">titlettip&nbsp;</div>
        <input id="id-idname" type="number" class="rounded col-lg-7 col-9" step=0.01 max=range value=-1>
    </div>`
const tTags = `
    <div id="row-idname" class="row pl-10 pr-10" data-type="tags" data-allowhide="ihide" data-req="ifreq">
        <div id="id-idname" class="col-lg-6 col-md-6 col-sm-7 col-14"></div>
        <div id="newtag-idname" class="col-7 row hidden">
            <input id="txt-idname" type="text" class="col-5"></input>
            <button id="add-idname" type="text" class="col-4 btn btn-def btn-sm" onclick="nmsce.newTag(this)">Add</button>
            <button id="cancel-idname" type="text" class="col-4 btn btn-def btn-sm" onclick="nmsce.cancelTag(this)">Cancel</button>
        </div>
        <div id="box-idname" class="col-lg-5 col-md-6 col-sm-7 col-14 border">
            <div id="list-idname" class="row"></div>
        </div>
    </div>`
const tTag = `<div id="tag-idname" class="border pointer txt-input-def" style="border-radius:8px; background-color:#d0d0d0" onclick="$(this).remove()">&nbsp;title&nbsp;<i class="bx bx-x-circle" style="color:#ffffff;"></i>&nbsp;</div>&nbsp;`;
const tExact = `
    <label id="id-match" class="col-lg-3 col-sm-4 col-14 txt-label-def">
        Exact Match&nbsp
        <input id="ck-match" type="checkbox">
    </label>`
const tMenu = `
    <div id="row-idname" data-type="menu" data-allowhide="ihide" data-req="ifreq">
        <div id="id-idname"></div>
    </div>`
const tRadio = `
    <div id="row-idname" data-type="radio" data-allowhide="ihide" data-req="ifreq" class="row pl-0">
        <div class="radio col-lg-5 col-5 txt-label-def">titlettip</div>
        <div class="col">
            <div id="list" class="row"></div>
        </div>&nbsp;
    </div>`
const tRadioItem = `
    <label class="col h6 txt-blue">
        <input type="radio" class="radio txt-label-def" id="rdo-tname" data-last=false onclick="nmsce.toggleRadio(this)">
        &nbsp;titlettip
    </label>`
const tCkItem = `
    <div id="row-idname" data-type="checkbox" data-allowhide="ihide" data-req="false">
        <label id="id-idname" class=" txt-label-def">
            titlettip&nbsp
            <input id="ck-idname" type="checkbox">
        </label>
    </div>`
const tImg = `
    <div id="row-idname" data-req="ifreq" data-type="img" class="row">
        <div class="col-lg-2 col-4 txt-label-def">titlettip&nbsp;</div>
        <input id="id-idname" type="file" class="col form-control form-control-sm" 
            accept="image/*" name="files[]"  data-type="img" onchange="nmsce.loadScreenshot(this)">&nbsp
    </div>`
const resultsItem = `
    <div id="row-idname" class="col-lg-p250 col-md-p333 col-sm-7 col-14 pointer bkg-white txt-label-def border rounded h6">
        <div class="row">
            <div class="col-12" onclick="nmsce.selectResult(this)" style="pad-bottom:3px">
                galaxy
            </div>
        </div>
        <div class="row">
            <div class="col-12" onclick="nmsce.selectResult(this)" style="pad-bottom:3px">
                byname<br>
                date<br>
            </div>
            <div class="col-1">
                <i id="favorite-idname" class="bx bx-like h3" style="color:grey" onclick="nmsce.vote(this)"></i>
            </div>
        </div>
        <div class="pl-15 pr-5 row" style="min-height:20px" onclick="nmsce.selectResult(this)">
            <img id="img-idname" src="imgsrc" style="width: 97%;">
        </div>
    </div>`

function showLatLong() {
    let loc = $("#typePanels #hdr-Ship")
    let type = loc.find("#menu-Type").val()
    type = loc.find("#slist-" + type)
    let chk = type.find("#ck-Crashed")

    if (!chk.length || chk.prop("checked")) {
        type.find("#row-Latitude").show()
        type.find("#row-Longitude").show()
        type.find("#row-Planet-Index").show()
        type.find("#row-Planet-Name").show()
        type.find("#row-Class").show()
    } else {
        type.find("#row-Latitude").hide()
        type.find("#row-Longitude").hide()
        type.find("#row-Planet-Index").hide()
        type.find("#row-Planet-Name").hide()
        type.find("#row-Class").hide()
    }
}

class NMSCE {
    buildPanels() {
        const addRadioList = function (loc, label, list, ttip) {
            let h = /ifreq/[Symbol.replace](tRadio, "")
            h = /idname/g[Symbol.replace](h, label.nameToId())
            h = /ttip/g[Symbol.replace](h, ttip ? ttip : "")
            h = /title/g[Symbol.replace](h, label)

            loc.append(h)
            loc = loc.find("#list")
            h = ""

            for (let i of list) {
                let l = /ifreq/[Symbol.replace](tRadioItem, "")
                l = /idname/g[Symbol.replace](l, label.nameToId())
                l = /title/g[Symbol.replace](l, i.name)
                l = /tname/[Symbol.replace](l, i.name.nameToId())

                if (i.ttip) {
                    l = /ttip/[Symbol.replace](l, tText)
                    l = /ttext/[Symbol.replace](l, i.ttip)
                } else
                    l = /ttip/[Symbol.replace](l, "")

                h += l
            }

            loc.append(h)
        }

        addRadioList($("#id-Economy"), "Economy", economyListTier)
        addRadioList($("#id-Lifeform"), "Lifeform", lifeformList)
        // addRadioList($("#id-Platform"), "Platform", platformListAll)

        if (fnmsce)
            galaxyList.unshift({ name: "Search All" })

        bhs.buildMenu($("#panels"), "Galaxy", galaxyList, this.setGalaxy.bind(this), {
            tip: "Empty - blue<br>Harsh - red<br>Lush - green<br>Normal - teal",
            required: true,
            labelsize: "col-md-5 col-4",
            menusize: "col",
        })

        if (fnmsce) {
            bhs.setMenu($("#menu-Galaxy"), "Search All")

            bhs.buildMenu($("#panels"), "Version", versionList, null, {
                labelsize: "col-md-5 col-4",
                menusize: "col",
            })
        }

        addGlyphButtons($("#glyphbuttons"), this.addGlyph.bind(this))

        if (fcedata) {
            let rloc = $("#panels")
            rloc.find("input").change(updateImageText.bind(this))
            rloc.find("button").click(updateImageText.bind(this))

            let img = $("#id-canvas")
            let lastDownTarget
            let canvas = document.getElementById("id-canvas")

            img.on("touchstart", event => {
                event.offsetX = event.targetTouches[0].pageX - img.offset().left
                event.offsetY = event.targetTouches[0].pageY - img.offset().top

                this.imageMouseDown(event)
            })
            img.on("touchmove", event => {
                event.offsetX = event.targetTouches[0].pageX - img.offset().left
                event.offsetY = event.targetTouches[0].pageY - img.offset().top

                this.imageMouseMove(event)
            })
            img.on("touchend", event => {
                this.imageMouseUp(event)
            })
            img.mouseout(event => {
                this.imageMouseOut(event)
            })
            img.mousedown(event => {
                lastDownTarget = canvas
                this.imageMouseDown(event)
            })
            img.mousemove(event => {
                this.imageMouseMove(event)
            })
            img.mouseup(event => {
                this.imageMouseUp(event)
            })

            document.addEventListener('mousedown', (event) => {
                lastDownTarget = event.target
            }, true)

            document.addEventListener('keydown', (e) => {
                if (lastDownTarget == canvas)
                    this.imageKeypress(e)
            }, true)
        }
    }

    setGalaxy(evt) {
        let galaxy = bhs.getMenu($("#menu-Galaxy"))

        if (galaxy)
            if (fcedata) {
                bhs.updateUser({
                    galaxy: galaxy
                })
            } else {
                let g = {}
                g.nmscesettings = {}
                g.nmscesettings.searchGalaxy = galaxy
                bhs.updateUser(g)
            }
    }

    setGlyphInput(evt, noupdate) {
        let checked = $(evt).prop("checked")

        if (!noupdate && bhs.user.uid) {
            if (typeof bhs.inputSettings === "undefined" || bhs.inputSettings.glyph !== checked) {
                bhs.updateUser({
                    inputSettings: {
                        glyph: checked
                    }
                })
            }
        }

        if (checked) {
            $("[id='id-glyphInput']").show()
            $("[id='id-addrInput']").hide()
            $("[id='ck-glyphs']").prop("checked", true)
        } else {
            $("[id='id-glyphInput']").hide()
            $("[id='id-addrInput']").show()
            $("[id='ck-glyphs']").prop("checked", false)
        }
    }

    addGlyph(evt) {
        let a = $(evt).text().trim().slice(0, 1)
        let loc = $("#id-glyphInput").find("#id-glyph")

        // loc.trigger($.Event("keydown", {keyCode: a}))

        let start = loc[0].selectionStart
        let end = loc[0].selectionEnd
        let val = loc.val()
        val = (val.slice(0, start) + a + val.slice(end)).slice(0, 12)
        loc.val(val)
        loc.focus()
        loc[0].setSelectionRange(start + 1, start + 1)
        loc.blur()

        if (val.length === 12)
            this.changeAddr(loc)
    }

    changeAddr(evt, a, entry) {
        let glyphs = evt && ($(evt).prop("id") === "id-glyph")
        let addr = a ? a : entry ? entry.addr : $(evt).val()
        let idx = $("[role='tabpanel'] [id='id-Planet-Index']")
        let planet = idx.val()

        if (addr !== "") {
            if (addr.length === 12 && !entry) {
                planet = addr.slice(0, 1)
                if (planet !== "0") {
                    idx.val(planet)

                    if (fcedata)
                        getPlanet(idx)
                }
            }

            if (glyphs) {
                if (addr.length < 12)
                    return

                addr = addr.slice(0, 12)
            }

            addr = reformatAddress(addr)
            let pnl = $("#panels")

            this.dispAddr(pnl, addr)
            this.restoreImageText(null, true)

            if (fcedata) {
                pnl.find("#foundreg").hide()
                pnl.find("#foundsys").hide()

                if (entry)
                    this.last = mergeObjects({}, entry)

                if (typeof this.last === "undefined")
                    this.last = {}

                let ref = query(collection(bhs.fs, "nmsceCombined"),
                    where("galaxy", "==", bhs.user.galaxy),
                    where("addr", "==", addr),
                    limit(1))

                if (!entry || !entry.sys) {
                    getDocs(ref, query(where("sys", "!=", ""))).then(snapshot => {
                        if (!snapshot.empty) {
                            let e = snapshot.docs[0].data()
                            this.last.sys = e.sys
                            this.displaySys(this.last)

                            if (entry && e.sys)
                                setDoc(snapshot.docs[0].ref, { sys: e.sys }, { merge: true })
                        }
                    })
                }

                if (!entry || !entry.Lifeform) {
                    getDocs(ref, query(where("Lifeform", "!=", ""))).then(snapshot => {
                        if (!snapshot.empty) {
                            let e = snapshot.docs[0].data()
                            this.last.Lifeform = e.Lifeform
                            setRadio($("#id-Lifeform"), e.Lifeform)

                            if (entry && e.Lifeform)
                                setDoc(snapshot.docs[0].ref, { Lifeform: e.Lifeform }, { merge: true })
                        }
                    })
                }

                if (!entry || !entry.Economy) {
                    getDocs(ref, query(where("Economy", "!=", ""))).then(snapshot => {
                        if (!snapshot.empty) {
                            let e = snapshot.docs[0].data()
                            this.last.Economy = e.Economy
                            setRadio($("#id-Economy"), e.Economy)

                            if (entry && e.Economy)
                                setDoc(snapshot.docs[0].ref, { Economy: e.Economy }, { merge: true })
                        }
                    })
                }

                if (!entry || !entry.reg) {
                    let xyz = addressToXYZ(addr)

                    let ref = query(collection(bhs.fs, "nmsceCombined"),
                        where("galaxy", "==", bhs.user.galaxy),
                        where("xyzs.x", "==", xyz.x),
                        where("xyzs.y", "==", xyz.y),
                        where("xyzs.z", "==", xyz.z),
                        where("reg", "!=", ""),
                        limit(1))

                    getDocs(ref).then(snapshot => {
                        if (!snapshot.empty) {
                            let e = snapshot.docs[0].data()
                            this.last.reg = e.reg
                            this.displayReg(this.last)

                            if (entry && e.reg)
                                setDoc(doc(bhs.fs, "nmsceCombined/" + entry.id), { reg: e.reg }, { merge: true })
                        }
                    })
                }
            }
        }
    }

    dispAddr(pnl, addr) {
        let glyph = addrToGlyph(addr)
        let loc = pnl.find("#id-glyphInput")
        loc.find("#id-addr").text(addr)
        loc.find("#id-glyph").val(glyph)
        loc.find("#id-hex").text(glyph)

        loc = pnl.find("#id-addrInput")
        loc.find("#id-addr").val(addr)
        loc.find("#id-glyph").text(glyph)
        loc.find("#id-hex").text(glyph)
    }

    displayReg(entry) {
        if (entry.reg) {
            let loc = $("#panels")
            loc.find("#id-reg").val(entry.reg)
            let l = loc.find("#foundreg")
            loc.find("#foundreg").show()
        }
    }

    displaySys(entry) {
        if (entry.sys) {
            let loc = $("#panels")
            loc.find("#id-sys").val(entry.sys)
            let l = loc.find("#foundsys")
            loc.find("#foundsys").show()
        }
    }

    displaySystem(entry) {
        let loc = $("#panels")

        bhs.setMenu($("#menu-Galaxy"), entry.galaxy)

        this.dispAddr(loc, entry.addr)

        loc.find("#id-sys").val(entry.sys)
        loc.find("#id-reg").val(entry.reg)

        // if (entry.sys)
        //     loc.find("#foundsys").show()

        // if (entry.reg)
        //     loc.find("#foundreg").show()

        // loc.find("#id-by").html("<h6>" + entry.sys ? entry._name : "" + "</h6>")

        setRadio($("#id-Economy"), entry.Economy)
        setRadio($("#id-Lifeform"), entry.Lifeform)
        // setRadio($("#id-Platform"), entry.Platform)
    }

    showSearchPanel(evt) {
        if ($(evt).prop("checked")) {
            $("#searchPanel").css("display", "inherit")

            // let loc = $("#typePanels .active")
            // loc = loc.find("#menu-Type")
            // if (loc.length > 0) {
            //     let btn = loc.find("[id|='btn']")
            //     if (btn.text().stripMarginWS() === "")
            //         loc.find("[id|='item']").first().click()
            // }
        } else
            $("#searchPanel").hide()
    }

    // hideSelf(evt) {
    //     let hide = $(evt).prop("checked")

    //     if (bhs.user.uid) {
    //         if (hide !== bhs.user.nmscesettings.hideSelf) {
    //             let settings = {}
    //             settings.hideSelf = hide

    //             let ref = doc(bhs.fs, "users/" + bhs.user.uid)
    //             setDoc(ref, { nmscesettings: settings }, { merge: true })
    //         }

    //         let loc = $("#list-Latest")
    //         let latest = nmsce.entries["Latest"]
    //         let last

    //         for (let item of latest) {
    //             last = loc.find("#row-" + item.id)

    //             if (bhs.user.uid === item.uid && hide)
    //                 last.hide()
    //             else
    //                 last.show()
    //         }

    //         if (hide) 
    //             nmsce.getWithObserver({target:last[0]})
    //     }
    // }

    expandPanels(show) {
        if (show) {
            $('[data-hide=true]').hide()
            $('[data-allowhide=true]').show()
        } else {
            $('[data-hide=true]').show()
            $('[data-allowhide=true]').hide()
        }
    }

    displayUser() {
        if (bhs.user.uid && fcedata) {
            this.restoreImageText(bhs.user.imageText)

            if (typeof this.entries === "undefined")
                this.getEntries()

            this.updateTotals()

            bhs.setMenu($("#menu-Galaxy"), bhs.user.galaxy)

            $("#id-Player").val(bhs.user._name)
        } else if (fnmsce) {
            if (bhs.user.uid) {
                // if (typeof bhs.user.nmscesettings.hideSelf === "undefined")
                //     bhs.user.nmscesettings.hideSelf = false

                // $("#ck-hideself").prop("checked", bhs.user.nmscesettings.hideSelf)
                // this.hideSelf($("#ck-hideself"))

                let tabs = Object.keys(this.entries)
                for (let t of tabs) {
                    if (t !== "My Favorites") {
                        for (let l of this.entries[t])
                            this.getVotes(l)
                    }
                }

                if (typeof this.entries["My Favorites"] === "undefined")
                    this.getResultsLists("My Favorites")

                if (bhs.user.nmscesettings && bhs.user.nmscesettings.searchGalaxy)
                    bhs.setMenu($("#menu-Galaxy"), bhs.user.nmscesettings.searchGalaxy)
                else
                    bhs.setMenu($("#menu-Galaxy"), "Search All")
            }
        }

        this.expandPanels(fcedata || (bhs.user.nmscesettings && bhs.user.nmscesettings.expandPanels))

        if (bhs.user.inputSettings) {
            let loc = $("#id-addrInput #ck-glyphs")
            loc.prop("checked", bhs.user.inputSettings.glyph)
            this.setGlyphInput(loc, true)
        }

        $("#searchlocaltt").hide()
        $("#searchlocal").hide()
        $("#row-savesearch").show()

        if (bhs.isPatreon(2))
            $("#id-notifySearch").show()

        this.getSearches()
    }

    updateTotals() {
        let loc = $("#id-table")
        let t = 0
        for (let k of Object.keys(bhs.user.nmsceTotals)) {
            t += bhs.user.nmsceTotals[k]
            let tloc = loc.find("#tot-" + k)

            if (tloc.length > 0)
                tloc.text(bhs.user.nmsceTotals[k])
        }
    }

    clearPanel(all) {
        const clr = (pnl) => {
            pnl.find("input").each(function () {
                let id = $(this).attr("id").stripID()
                if (id === "glyphs" || id === "PC" || id === "XBox" || id === "PS4" || fcedata && id === "Player")
                    return

                let type = $(this).prop("type")
                if (type === "checkbox")
                    $(this).prop("checked", false)
                else if (type === "radio") {
                    $(this).prop("checked", false)
                    $(this).data("last", false)
                } else if (id != "Galaxy")
                    $(this).val("")

                if (type === "string")
                    $(this).next().hide()
            })

            pnl.find("[id|='menu']").each(function () {
                let id = $(this).attr("id").stripID()
                if ((!fcedata || all || id !== "Type") && id != "Galaxy")
                    $(this).val("")
            })
        }

        clr($("#typePanels"))

        if (all) {
            let loc = $("#panels")
            loc.find("#foundreg").hide()
            loc.find("#foundsys").hide()
            // loc.find("#id-by").empty()

            loc.find("#id-glyphInput #id-addr").empty()
            loc.find("#id-glyphInput #id-hex").empty()
            loc.find("#id-addrInput #id-glyph").empty()
            loc.find("#id-addrInput #id-hex").empty()

            $("#pnl-map [id|='slist']").hide()
            $("#pnl-map [id|='pnl']").hide()

            clr($("#panels"))

            if (fnmsce) {
                $("#id-Player").val("")
                $("#menu-Version").val("-Nothing-Selected")
            }
        }

        let loc = $("#pnl-map [id|='map']")
        loc.find("*").css("stroke", mapColors.enabled)
        $("[id='asym-checkmark']").hide()

        for (let p of Object.keys(nmsce)) {
            let map = nmsce[p]
            if (map && map.type === "map")
                for (let p of Object.keys(map))
                    if (p !== "type")
                        map[p].state = "enabled"
        }

        loc = $("#typePanels #hdr-Ship")
        loc.find("#row-Latitude").hide()
        loc.find("#row-Longitude").hide()
        loc.find("#row-Planet-Index").hide()
        loc.find("#row-Planet-Name").hide()
        loc.find("#row-Class").hide()

        $("#id-ss1Image").hide()
        $("#id-ss1Image").attr("src", "")
        $("#redditlink").val("")
        $("#posted").empty()
        $("#imgtable").hide()
        $("#imageTextBlock").hide()
        $("#updateScreenshot").hide()
        $("#ck-private").prop("checked", false)

        let tags = $("[data-type='tags']")

        for (let loc of tags) {
            let id = $(loc).attr("id").stripID()

            $(loc).find("#newtag-" + id).hide()
            $(loc).find("#menu-" + id).val("")
            $(loc).find("#list-" + id).empty()
        }

        let tab = $("#typeTabs .active").attr("id").stripID()
        if (tab === "Freighter")
            $("#pnl-map #pnl-Freighter").show()

        // if (tab === "Living-Ship")
        //     $("#pnl-map #pnl-Living-Ship").show()

        this.last.id = null
        this.last.created = null
        this.last.Photo = null
        this.last.reddit = null
        this.last.redditlink = null

        if (fcedata) {
            let canvas = document.getElementById("id-canvas")
            let ctx = canvas.getContext("2d")
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // $("#save-system").text("Save System")
            $("#save").text("Save All")
            // $("#delete-system").addClass("disabled")
            // $("#delete-system").prop("disabled", true)
            $("#delete-item").addClass("disabled")
            $("#delete-item").prop("disabled", true)

            $("#openReddit").addClass("disabled")
            $("#openReddit").prop("disabled", true)
            $("#redditPost").hide()
        }
    }

    extractSystem() {
        let entry = {}
        let ok = true

        let loc = $("#panels")

        entry._name = this.last._name ? this.last._name : bhs.user._name
        entry.uid = this.last.uid ? this.last.uid : bhs.user.uid
        entry.version = this.last.version ? this.last.version : latestversion
        entry.galaxy = bhs.user.galaxy  // allows galaxy edit

        entry.id = this.last.id ? this.last.id : null
        entry.created = this.last.created ? new Timestamp(this.last.created.seconds, this.last.created.nanoseconds) : null
        entry.Photo = this.last.Photo ? this.last.Photo : null
        entry.reddit = this.last.reddit ? this.last.reddit : null
        entry.redditlink = this.last.redditlink ? this.last.redditlink : null

        entry.page = "nmsce"

        loc = $("#panels")
        entry.addr = loc.find("#id-addr").val()
        entry.sys = loc.find("#id-sys").val()
        entry.reg = loc.find("#id-reg").val()

        loc = loc.find("#row-Lifeform :checked")
        if (loc.length > 0) {
            entry.Lifeform = loc.attr("id").stripID()
            entry.life = entry.Lifeform
        }

        loc = $("#panels").find("#row-Economy :checked")
        if (loc.length > 0)
            entry.Economy = loc.attr("id").stripID()

        entry.xyzs = addressToXYZ(entry.addr)
        let err = validateAddress(entry.addr)
        if (err) {
            bhs.status(err)
            ok = false
        }

        return ok ? entry : null
    }

    async extractEntry() {
        let entry = this.extractSystem()
        let ok = entry !== null

        if (ok) {
            entry.private = $("#id-private").is(":visible") && $("#ck-private").prop("checked") && bhs.isPatreon(3)

            let tab = $("#typeTabs .active").attr("id").stripID()
            let pnl = $("#typePanels #pnl-" + tab)
            entry.type = tab

            let list = pnl.find("[id|='row']")
            for (let rloc of list) {
                let loc = $(rloc)
                if (!loc.is(":visible"))
                    continue

                let id = loc.attr("id").stripID()
                let data = loc.data()

                if (typeof data === "undefined")
                    continue

                switch (data.type) {
                    case "number":
                    case "float":
                    case "string":
                        entry[id] = loc.find("input").val()
                        break
                    case "tags":
                        entry[id] = {}

                        if (id === "Color" || id === "Sail" || id === "Markings")
                            for (let i of colorList)
                                if (i.name !== " Nothing Selected")
                                    entry[id][i.name] = false

                        let tloc = loc.find("[id|='tag']")

                        for (let loc of tloc) {
                            let t = $(loc).attr("id").stripID().idToName()
                            if (t)
                                entry[id][t] = true
                        }
                        break
                    case "menu":
                        if (loc.attr("id").search("menu") < 0)
                            loc = loc.find("[id|='menu']")

                        entry[id] = bhs.getMenu(loc)
                        break
                    case "checkbox":
                        entry[id] = loc.find("input").prop("checked")
                        break
                    case "radio":
                        loc = loc.find(":checked")
                        if (loc.length > 0)
                            entry[id] = loc.attr("id").stripID().nameToId()
                        break
                    // case "img":
                    //     if (!fnmsce) {
                    //         let canvas = $("#id-canvas")[0]
                    //         if (typeof canvas !== "undefined" && typeof entry[id] === "undefined")
                    //             entry[id] = uuidv4() + ".jpg"
                    //     }
                    //     break
                }

                if (ok && data.req && !fnmsce) {
                    ok = typeof entry[id] !== "undefined"

                    if (ok)
                        switch (data.type) {
                            case "string":
                            case "menu":
                            case "checkbox":
                            case "radio":
                                // case "img":
                                ok = entry[id] !== ""
                                break
                            case "number":
                            case "float":
                                ok = entry[id] !== -1 && entry[id] !== ""
                                break
                            case "tags":
                                ok = Object.keys(entry[id]).length > 0
                                break
                        }

                    if (!ok) {
                        bhs.status(id + " required. Entry not saved.")
                        break
                    }
                }
            }
        }

        if (ok) {
            if (entry.type === "Planet")
                entry["Planet-Name"] = entry.Name

            let parts = nmsce[(entry.Type ? entry.Type : entry.type).toLowerCase()]
            if (parts) {
                entry.parts = {}

                for (let p of Object.keys(parts))
                    if (p !== "type")
                        entry.parts[p] = parts[p].state === "selected"
            }

            entry.redditlink = $("#redditlink").val()
            entry.imageText = bhs.user.imageText
            this.initVotes(entry)

            if (typeof this.last.uid === "undefined" || this.last.uid === bhs.user.uid || bhs.isRole("admin")) {
                if (typeof this.entries === "undefined")
                    this.entries = []

                ok = $("#id-canvas").is(":visible") || entry.Photo // do we have an image to upload?

                if (ok)
                    this.updateEntry(entry)
                else
                    bhs.status("ERROR: screenshot required")
            } else {
                bhs.status("ERROR: Entry not saved. " + bhs.user._name + " is not creator of " + entry.type + " " + entry.Name)
                ok = false
            }
        }

        return ok
    }

    displaySingle(entry, noscroll) {
        if (!entry || !entry.type)
            return

        this.clearPanel(true)

        if (!noscroll)
            $('html, body').animate({
                scrollTop: $('#sysinfo').offset().top
            }, 500)

        let tloc = $("#tab-" + entry.type.nameToId())
        tloc.click()

        // old bhs db //
        if (!entry.Lifeform && entry.life)
            entry.Lifeform = entry.life

        if (!entry.Economy && entry.econ) {
            let i = getIndex(economyList, "name", entry.econ)
            if (i > 0 && economyList[i].number > 0)
                entry.Economy = "T" + economyList[i].number
        } else if (typeof entry.Economy === "number")
            entry.Economy = "T" + entry.Economy
        // **** //

        if (this.last) {
            if (this.last.addr === entry.addr) {
                if (!entry.sys && this.last.sys) entry.sys = this.last.sys
                if (!entry.Economy && this.last.Economy) entry.Economy = this.last.Economy
                if (!entry.Lifeform && this.last.Lifeform) entry.Lifeform = this.last.Lifeform
            }

            if (!entry.reg && this.last.reg) {
                if (entry.xyzs.x === this.last.xyzs.x &&
                    entry.xyzs.y === this.last.xyzs.y &&
                    entry.xyzs.z === this.last.xyzs.z)
                    entry.reg = this.last.reg
                else
                    entry.reg = ""
            }
        }

        this.last = mergeObjects({}, entry)

        this.displaySystem(entry)

        if (!entry.reg || !entry.sys || !entry.Economy || !entry.Lifeform)
            this.changeAddr(null, null, entry)

        let link = `/preview?i=${entry.id}`
        $("[id|='permalink']").attr("href", link)

        let disp = function (flds, pnltype, slist) {
            let pnl = $("#typePanels " + pnltype)
            if (slist)
                pnl = pnl.find(slist)

            for (let fld of flds) {
                let id = fld.name.nameToId()
                let row = pnl.find("#row-" + id)

                if (typeof entry[id] === "undefined")
                    continue

                switch (fld.type) {
                    case "number":
                        row.find("input").val(parseInt(entry[id]))
                        break
                    case "float":
                        row.find("input").val(parseFloat(entry[id]))
                        break
                    case "string":
                        row.find("input").val(entry[id])
                        break
                    case "tags":
                        row.find("#list-" + id).empty()
                        let keys = Object.keys(entry[id])

                        for (let t of keys)
                            if (typeof entry[id][t] !== "boolean" || entry[id][t]) {
                                let h = /idname/[Symbol.replace](tTag, t.nameToId())
                                h = /title/[Symbol.replace](h, t)
                                row.find("#list-" + id).append(h)
                            }
                        break
                    case "menu":
                        let menu = row.find("#menu-" + id.nameToId())
                        bhs.setMenu(menu, entry[id])

                        if (fld.sublist)
                            disp(fld.sublist, pnltype, "#slist-" + entry[id].nameToId())
                        break
                    case "radio":
                        if (entry[id]) {
                            row.find("input").prop("checked", false)
                            row.find("#rdo-" + entry[id].nameToId()).prop("checked", true)
                        }
                        break
                    case "checkbox":
                        if (entry[id] !== row.find("input").prop("checked"))
                            row.find("input").click()
                        break
                }
            }
        }

        let idx = getIndex(objectList, "name", entry.type)
        let obj = objectList[idx]

        disp(obj.fields, "#pnl-" + entry.type)

        let map = $("#pnl-map #pnl-" + entry.type)
        map.show()

        let loc = $("#pnl-" + entry.type + " #menu-Type")
        if (loc.length > 0) {
            nmsce.selectSublist(loc)
            map = map.find("#slist-" + entry.Type)
        }

        if (entry.parts) {
            let list = Object.keys(entry.parts)
            for (let i of list)
                if (entry.parts[i]) {
                    let loc = map.find("#map-" + i)
                    if (loc.length > 0)
                        this.selectMap(loc, "selected")
                }
        }

        if (entry.imageText)
            this.imageText = mergeObjects(this.imageText, entry.imageText)

        this.loadScreenshot(null, entry.Photo)

        $("#redditlink").val(entry.redditlink ? entry.redditlink : "")

        $("#save-system").text("UPDATE System")
        $("#save").text("UPDATE All")
        $("#delete-system").removeClass("disabled")
        $("#delete-system").removeAttr("disabled")
        $("#delete-item").removeClass("disabled")
        $("#delete-item").removeAttr("disabled")

        let r = entry.reddit
        let date = r ? "Posted " : ""
        if (r && typeof r.toDate !== "undefined")
            date += r.toDate().toDateLocalTimeString()

        $("#posted").html(date)

        $("#ck-private").prop("checked", entry.private)
    }

    displaySearch(search) {
        this.clearPanel(true)

        $("#searchname").val(search.name)

        bhs.setMenu($("#menu-Galaxy"), search.galaxy)

        $("#ck-notify").prop("checked", search.notify)
        if (search.page !== "/upload" && search._name !== bhs.user.name)
            $("#id-Player").text(search._name)

        let loc = $("#tab-" + search.type.nameToId())
        loc.click()

        loc = $("#typePanels #pnl-" + search.type.nameToId())

        let i = getIndex(search.search, "name", "Type")
        if (i >= 0) {
            let menu = loc.find("#menu-Type")
            bhs.setMenu(menu, search.search[i].val)
            nmsce.selectSublist(menu)
        }

        for (let itm of search.search) {
            switch (itm.type) {
                case "number":
                case "float":
                case "string":
                    loc.find("#id-" + itm.name.nameToId()).val(itm.val)
                    break
                case "date":
                    loc.find("#id-" + itm.name.nameToId()).val(itm.date)
                    break
                case "menu":
                    if (itm.name !== "Type") {
                        let menu = loc.find("#menu-" + itm.name.nameToId())
                        bhs.setMenu(menu, itm.val)
                    }
                    break
                case "checkbox":
                    loc.find("#ck-" + itm.val).prop("checked", true)
                    break
                case "radio":
                    loc.find("#rdo-" + itm.val).prop("checked", true)
                    break
                case "tags":
                    loc = loc.find("#menu-" + itm.name.nameToId())

                    for (let t of itm.list) {
                        bhs.setMenu(loc, t)
                        nmsce.addTag(loc)
                    }
                    break
                case "map":
                    let map = $("#pnl-map #pnl-" + itm.tab)
                    map.show()

                    if (itm.Type)
                        map = map.find("#slist-" + itm.Type)

                    for (let i of itm.list) {
                        let loc = map.find("#map-" + i)
                        this.selectMap(loc, "selected")
                    }
                    break
            }
        }
    }

    executeSearch(search, panel, dispFcn) {
        if (!search)
            return

        $("#status").empty()

        let ref = collection(bhs.fs, "nmsceCombined")

        let statements = [];

        if (search.galaxy !== "Search All")
            statements.push(where("galaxy", "==", search.galaxy))

        statements.push(where("type", "==", search.type))

        for (let q of search.search)
            switch (q.type) {
                case "tags":
                    // case "map":
                    for (let i of q.list)
                        statements.push(where(q.name + "." + i, "==", true))
                    break
                default:
                    statements.push(where(q.name, q.query ? q.query : "==", q.val))
            }

        // statements.push(orderBy("created", "desc")) would require index for every possible combination
        let q = query(ref, ...statements)

        getCountFromServer(q).then(snapshot => {
            let c = snapshot.data().count

            if (!c)
                bhs.status("Nothing matching selection found. Try selecting fewer items. To match an entry it must contain everything selected.", true)
            else
                bhs.status("Search found " + c + " matches.")
        })

        q = query(q, limit(25))

        this.getWithObserver(null, q, panel, true, dispFcn)
    }

    search(search) {
        if (typeof search === "undefined") {
            search = this.extractSearch()

            if (!search) {
                bhs.status("Nothing selected for search.", true)
                return
            }
        }

        let display = (list, type) => {
            $("#dltab-Search-Results").click()

            if (fnmsce)
                this.displayResultList(list, type)
            else
                this.displayList(list, type)
        }

        $("#list-Search-Results").empty()
        $("#dltab-Search-Results").show()
        this.entries["Search-Results"] = []

        this.executeSearch(search, "Search Results", display)
        return false;
    }

    saveSearch() {
        let search = this.extractSearch()
        if (!search)
            return

        if (search.list.length === 1) {
            bhs.status("Saved search requires more than 1 element.")
            return
        }

        search.saved = true
        search.page = window.location.pathname

        if (!bhs.user.uid || !bhs.isPatreon(2)) {
            if (typeof (Storage) !== "undefined") {
                window.localStorage.setItem('nmsce-search', JSON.stringify(search))
                bhs.status("Search saved.")
            }
        } else {
            search.uid = bhs.user.uid
            search._name = bhs.user._name
            search.email = bhs.user.email
            search.date = Timestamp.now()
            search.notify = $("#ck-notify").prop("checked")
            search.name = $("#searchname").val()

            if (search.name) {
                setDoc(doc(bhs.fs, "users/" + bhs.user.uid + "/nmsce-saved-searches/" + search.name.nameToId()), search, {
                    merge: true
                }).then(() => bhs.status(search.name + " saved."))
            } else {
                bhs.status("No save name specified.")
                return
            }

            let i = -1
            if (this.searchlist)
                i = getIndex(this.searchlist, "name", search.name)
            else
                this.searchlist = []

            if (i !== -1)
                this.searchlist[i] = search
            else {
                this.searchlist.push(search)

                let loc = $("#menu-Saved")
                if (loc.length > 0) {
                    const item = `<option value="idname" style=" cursor: pointer">iname</option>`;
                    let h = /idname/[Symbol.replace](item, search.name.nameToId())
                    h = /iname/[Symbol.replace](h, search.name)

                    loc.append(h)
                } else
                    bhs.buildMenu($("#row-Saved"), "Saved", this.searchlist, this.executeSaved, {
                        sort: true,
                        labelsize: "col-2",
                        menusize: "col"
                    })
            }
        }
    }

    deleteSearch() {
        if (bhs.user.uid) {
            let name = $("#searchname").val()

            if (!name) {
                bhs.status("No search name provided.")
                return
            }

            let i = getIndex(this.searchlist, "name", name)

            if (i !== -1) {
                deleteDoc(doc(bhs.fs, "users/" + bhs.user.uid + "/nmsce-saved-searches/" + name.nameToId())).then(() => {
                    bhs.status(name + " search deleted.")

                    this.searchlist.splice(i, 1)
                    let loc = $("#menu-Saved option:contains('" + name + ')')
                    loc.remove()
                })
            } else {
                bhs.status("Named search not found.")
            }
        }
    }

    getSearches() {
        if (!bhs.user.uid)
            return

        let ref = collection(bhs.fs, "users/" + bhs.user.uid + "/nmsce-saved-searches")

        getDocs(ref).then(snapshot => {
            this.searchlist = []
            for (let doc of snapshot.docs) {
                let s = doc.data()
                this.searchlist.push(s)
            }

            if (this.searchlist.length > 0)
                bhs.buildMenu($("#row-Saved"), "Saved", this.searchlist, this.executeSaved, {
                    sort: true
                })
        }).catch(err => console.log(err.message))
    }

    executeSaved(menu) {
        let name = bhs.getMenu(menu)
        let i = getIndex(nmsce.searchlist, "name", name)

        if (i !== -1) {
            nmsce.displaySearch(nmsce.searchlist[i])
            nmsce.search(nmsce.searchlist[i])
        }

        menu.val("")
    }

    searchLocal(evt) {
        if (typeof (Storage) !== "undefined") {
            let s = window.localStorage.getItem('nmsce-search')

            if (s) {
                s = JSON.parse(s)

                nmsce.displaySearch(s)
                nmsce.search(s)
            }
        }
    }

    extractSearch() {
        let galaxy = bhs.getMenu($("#menu-Galaxy"))
        let s = {}
        s.search = []
        let search = s.search

        let tab = $("#typeTabs .active").attr("id").stripID()
        let pnl = $("#typePanels #pnl-" + tab)

        s.galaxy = galaxy === "" ? "Search All" : galaxy
        s.type = tab

        let name = $("#id-Player").val()
        if (name)
            search.push({
                name: "_name",
                type: "string",
                id: "id-Player",
                val: name
            })

        let ver = bhs.getMenu($("#menu-Version"))
        if (ver) {
            search.push({
                name: "version",
                type: "menu",
                id: "menu-Version",
                val: ver
            })
        }

        let date = $("#id-Created").val()
        if (date)
            search.push({
                name: "created",
                type: "date",
                id: "id-Created",
                query: ">=",
                date: date,
                val: Timestamp.fromDate(new Date(date))
            })

        let obj = null
        let i = getIndex(objectList, "name", tab)
        if (i > -1)
            obj = objectList[i]

        for (let fld of obj.imgText) {
            if (fld.name === "Galaxy" || fcedata && fld.name === "Player")
                continue

            let loc = $(fld.id)

            let val = ""

            switch (fld.type) {
                case "menu":
                    if (!loc.attr("id").startsWith("menu"))
                        loc = loc.find("#menu-" + itm.name)

                    val = bhs.getMenu(loc)
                    break
                case "radio":
                    loc = loc.find(":checked")
                    if (loc.length > 0)
                        val = loc.parent().text().stripMarginWS()
                    break
                default:
                    val = loc.val()
                    break
            }

            if (val !== "") {
                search.push({
                    name: fld.field,
                    type: fld.type,
                    id: fld.id,
                    val: val
                })
            }
        }

        let list = pnl.find("[id|='row']")

        for (let rloc of list) {
            let loc = $(rloc)
            if (!loc.is(":visible"))
                continue

            let rdata = loc.data()

            if (typeof rdata === "undefined")
                continue

            let val

            let itm = {}
            itm.name = loc.attr("id").stripID()
            itm.type = rdata.type
            if (rdata.search)
                itm.query = rdata.search

            switch (rdata.type) {
                case "number":
                case "float":
                    val = loc.find("input").val()
                    if (val && val != -1) {
                        itm.val = val
                        search.push(itm)
                    }
                    break
                case "string":
                    val = loc.find("input").val()
                    if (val) {
                        itm.val = val
                        search.push(itm)
                    }
                    break
                case "tags":
                    let tlist = []

                    for (let tloc of loc.find("[id|='tag']")) {
                        let t = $(tloc).attr("id").stripID().idToName()
                        if (t && !tlist.includes(t))
                            tlist.push(t)
                    }

                    if (loc.find("#id-match input").prop("checked")) {
                        for (let l of loc.find("option"))
                            search.push({
                                name: itm.name + "." + l.text,
                                type: "exact",
                                val: tlist.includes(l.text)
                            })
                    } else if (name === "Color" || name === "Sail" || name === "Markings") {
                        for (let l of tlist)
                            search.push({
                                name: itm.name + "." + l,
                                type: "exact",
                                val: true
                            })

                    } else if (tlist.length > 0) {
                        itm.list = tlist
                        search.push(itm)
                    }
                    break
                case "menu":
                    if (!loc.attr("id").startsWith("menu"))
                        loc = loc.find("#menu-" + itm.name)

                    itm.val = bhs.getMenu(loc)

                    if (itm.val)
                        search.push(itm)
                    break
                case "checkbox":
                    if (fcedata) {
                        val = loc.find("input").prop("checked")
                        if (val) {
                            itm.val = val
                            search.push(itm)
                        }
                    } else {
                        loc = loc.find(":checked")
                        if (loc.length > 0) {
                            itm.val = loc.attr("id").stripID() === "True"
                            search.push(itm)
                        }
                    }
                    break
                case "radio":
                    loc = loc.find(":checked")
                    if (loc.length > 0) {
                        itm.val = loc.attr("id").stripID()
                        search.push(itm)
                    }
                    break
            }
        }

        list = []
        i = getIndex(search, "name", "Type")
        let parts = nmsce[(i >= 0 ? search[i].val : s.type).toLowerCase()]
        if (parts) {
            for (let p of Object.keys(parts)) {
                if (parts[p].state === "selected" || parts[p].state === "error")
                    search.push({
                        name: "parts." + p,
                        tab: s.type,
                        Type: i >= 0 ? search[i].val : "",
                        type: "map",
                        val: parts[p].state === "selected"
                    })
            }
        }

        if (s.search.length === 0) {
            bhs.status("No search selection.")
            return null
        }

        return s
    }

    openSearch() {
        window.open("/?s=" + this.last.addr.nameToId() + "&g=" + this.last.galaxy.nameToId(), '_self')
    }

    searchSystem() {
        if (!this.last)
            return

        this.entries["Search-Results"] = []

        let ref = query(collection(bhs.fs, "nmsceCombined"),
            where("galaxy", "==", this.last.galaxy),
            where("addr", "==", this.last.addr))

        getDocs(ref).then(snapshot => {
            let list = []
            for (let doc of snapshot.docs)
                list.push(doc.data())

            $("#dltab-Search-Results").click()
            $("#displayPanels #list-Search-Results").empty()
            this.displayResultList(list, "Search-Results")
        })
    }

    searchNMSTG() {
        this.last.galaxy = "Euclid"
        this.last.addr = reformatAddress("03FC01DDF571")

        this.searchRegion()
    }

    searchRegion() {
        if (!this.last)
            return

        this.entries["Search-Results"] = []
        let xyz = addressToXYZ(this.last.addr)

        let ref = query(collection(bhs.fs, "nmsceCombined"),
            where("galaxy", "==", this.last.galaxy),
            where("xyzs.x", "==", xyz.x),
            where("xyzs.y", "==", xyz.y),
            where("xyzs.z", "==", xyz.z))

        getDocs(ref).then(snapshot => {
            let list = []
            for (let doc of snapshot.docs)
                list.push(doc.data())

            $("#dltab-Search-Results").click()
            $("#displayPanels #list-Search-Results").empty()
            this.displayResultList(list, "Search-Results")
        })
    }

    searchType() {
        if (!this.last)
            return

        this.entries["Search-Results"] = []

        let ref = query(collection(bhs.fs, "nmsceCombined"),
            where("addr", "==", this.last.addr),
            where("Type", "==", this.last.Type))

        getDocs(ref).then(snapshot => {
            let list = []
            for (let doc of snapshot.docs)
                list.push(doc.data())

            $("#dltab-Search-Results").click()
            $("#displayPanels #list-Search-Results").empty()
            this.displayResultList(list, "Search-Results")
        })
    }

    searchFauna() {
        if (!this.last)
            return

        this.entries["Search-Results"] = []

        let ref = query(collection(bhs.fs, "nmsceCombined"),
            where("Genus", "==", nmsce.last.Genus))

        getDocs(ref).then(snapshot => {
            let list = []
            for (let doc of snapshot.docs)
                list.push(doc.data())

            $("#dltab-Search-Results").click()
            $("#displayPanels #list-Search-Results").empty()
            this.displayResultList(list, "Search-Results")
        })
    }

    /**
     * 
     * 
     * @param {Event} evt 
     * 
     * @memberOf NMSCE
     */
    saveEntry(evt) {
        let ok = bhs.user.uid

        if (typeof this.last.uid === "undefined" || this.last.uid === bhs.user.uid) {
            let user = this.extractUser()
            ok = bhs.validateUser(user)

            // if (ok && bhs.user._name !== user._name)
            //     ok = this.changeName(bhs.user.uid, user._name)

            if (ok) {
                bhs.user = mergeObjects(bhs.user, user)
                // bhs.user.imageText = this.extractImageText()

                let ref = doc(bhs.fs, "users", bhs.user.uid)
                setDoc(ref, bhs.user, {
                    merge: true
                }).then().catch(err => {
                    bhs.status("ERROR: " + err)
                })
            }
        }

        if (ok)
            this.extractEntry()
    }

    saveUserImageText() {
        bhs.user.imageText = this.extractImageText()

        let ref = doc(bhs.fs, "users", bhs.user.uid)
        setDoc(ref, bhs.user, {
            merge: true
        }).then().catch(err => {
            bhs.status("ERROR: " + err)
        })
    }

    loadUserImageText() {
        if (typeof bhs.user.imageText !== "undefined")
            this.restoreImageText(bhs.user.imageText, true)
        else {
            let ref = doc(bhs.fs, "users", bhs.user.uid)
            getDoc(ref).then(doc => {
                this.restoreImageText(doc.data().imageText, true)
            }).catch(err => {
                bhs.status("ERROR: " + err)
            })
        }
    }

    changeName(uid, newname) { }

    extractUser() {
        let loc = $("#panels")
        let u = {}

        u.version = latestversion
        u._name = loc.find("#id-Player").val()
        u.galaxy = bhs.getMenu(loc.find("#menu-Galaxy"))

        u.nmscesettings = {}
        u.nmscesettings.expandPanels = $("#hidden").is(":visible")

        return u
    }

    buildTypePanels() {
        let tabs = $("#typeTabs")
        let pnl = $("#typePanels")
        let first = true;
        let self = this;

        for (let obj of objectList) {
            let id = obj.name.nameToId()
            let h = /idname/g[Symbol.replace](nav, id)
            if (!first) {
                h = /active/[Symbol.replace](h, "")
                h = /true/[Symbol.replace](h, "false")
            }
            h = /title/[Symbol.replace](h, obj.name)
            tabs.append(h)

            h = /idname/g[Symbol.replace](header, id)
            if (!first)
                h = /active/[Symbol.replace](h, "")
            pnl.append(h)

            h = /idname/g[Symbol.replace](mapHeader, id)
            if (first)
                h = /display:none/g[Symbol.replace](h, "")
            $("#pnl-map").append(h)

            first = false

            this.addPanel(obj.fields, "pnl", id)
        }

        if (fnmsce)
            $("[id|='search']").show()

        $('a[data-toggle="tab"]').on('shown.bs.tab', function (evt) {
            let loc = $("#typePanels .active")
            let id = loc.attr("id").stripID()

            let mloc = $("#pnl-map")
            mloc.find("[id|='pnl']").hide()
            mloc = mloc.find("#pnl-" + id)
            mloc.show()

            loc = loc.find("#manu-Type")
            if (loc.length > 0) {
                let type = loc.val().stripMarginWS().replaceAll("-", " ")
                mloc = mloc.find("#slist-" + type)
                mloc.show()
            }

            self.setMapSize(mloc)
        })
    }

    addPanel(list, pnl, itmid, slist, pid) {
        let appenditem = (loc, add, title, id, ttip, req, long, hide) => {
            let l = /ihide/g[Symbol.replace](long ? long : inpHdr, hide ? true : false)
            let h = l

            l = /title/g[Symbol.replace](add, title + (req ? tReq : ""))

            if (ttip) {
                l = /ttip/[Symbol.replace](l, tText)
                l = /ttext/[Symbol.replace](l, ttip)
            } else
                l = /ttip/[Symbol.replace](l, "")

            l = /idname/g[Symbol.replace](l, id)
            l = /ifreq/[Symbol.replace](l, req ? true : false)
            l = /ihide/g[Symbol.replace](l, hide ? true : false)

            h += l + inpEnd
            loc.append(h)
        }

        let loc, itm = $("#" + pnl + "-" + itmid)
        for (let f of list) {
            if (fnmsce) {
                f.required = false
                if (!f.search)
                    continue
            }

            let l = ""
            let id = f.name.nameToId()

            switch (f.type) {
                case "link":
                    appenditem(itm, f.link, f.name, id, null, null, null, f.inputHide)
                    break
                case "number":
                    if (!f.sub || slist[f.sub]) {
                        l = /range/[Symbol.replace](tNumber, f.range)
                        l = /stype/[Symbol.replace](l, f.query ? f.query : "")
                        appenditem(itm, l, f.name, id, !f.sub ? f.ttip : slist[f.ttip], f.required, null, f.inputHide)
                    }
                    break
                case "float":
                    if (!f.sub || slist[f.sub]) {
                        l = /range/[Symbol.replace](tFloat, f.range)
                        l = /stype/[Symbol.replace](l, f.query ? f.query : "")
                        appenditem(itm, l, f.name, id, !f.sub ? f.ttip : slist[f.ttip], f.required, null, f.inputHide)
                    }
                    break
                case "img":
                    appenditem(itm, tImg, f.name, id, f.ttip, f.required, inpLongHdr, f.inputHide)
                    break
                case "checkbox":
                    if (!f.sub || slist[f.sub]) {
                        if (fnmsce) {
                            appenditem(itm, tRadio, f.name, id, f.ttip, null, null, f.inputHide)

                            let ckloc = itm.find("#row-" + id)
                            ckloc.attr("data-type", "checkbox")
                            ckloc = ckloc.find("#list")

                            let l = /title/g[Symbol.replace](tRadioItem, "True")
                            l = /ttip/g[Symbol.replace](l, "")
                            l = /idname/g[Symbol.replace](l, "True")
                            l = /tname/g[Symbol.replace](l, "True")
                            ckloc.append(l)

                            l = /title/g[Symbol.replace](tRadioItem, "False")
                            l = /ttip/g[Symbol.replace](l, "")
                            l = /idname/g[Symbol.replace](l, "False")
                            l = /tname/g[Symbol.replace](l, "False")
                            ckloc.append(l)
                        } else
                            appenditem(itm, tCkItem, f.name, id, f.ttip, f.required, null, f.inputHide)
                    }
                    break
                case "string":
                    if (!f.sub || slist[f.sub])
                        appenditem(itm, tString, f.name, id, f.ttip, f.required, null, f.inputHide)
                    break
                case "long string":
                    if (!f.sub || slist[f.sub])
                        appenditem(itm, tLongString, f.name, id, f.ttip, f.required, inpLongHdr, f.inputHide)
                    break
                case "blank":
                    itm.append(inpHdr + inpEnd)
                    break
                case "menu": {
                    appenditem(itm, tMenu, f.name, id, null, null, null, f.inputHide)
                    let lst = itm.find("#row-" + id)

                    if (f.ttip)
                        f.tip = slist ? slist[f.ttip] : f.ttip

                    f.labelsize = "col-5"
                    f.menusize = "col"
                    f.sort = true

                    let l = f.sub ? slist[f.sub] : f.list
                    if (l[0].name !== " Nothing Selected")
                        l.unshift({ name: " Nothing Selected" })

                    bhs.buildMenu(lst, f.name, f.sub ? slist[f.sub] : f.list, f.sublist ? this.selectSublist.bind(this) : null, f, f.onchange)

                    if (f.sublist) {
                        for (let s of f.list) {
                            let iid = s.name.nameToId()
                            appenditem(itm, tSubList, s.name, iid, null, null, inpLongHdr, f.inputHide)

                            let loc = $("#pnl-map #" + itm.attr("id"))
                            let l = /idname/[Symbol.replace](tSubList, s.name.nameToId())
                            loc.append(l)

                            this.addPanel(f.sublist, "slist", iid, s, itmid)
                        }
                    }
                    break
                }
                case "tags":
                    if (!f.sub || slist[f.sub]) {
                        appenditem(itm, tTags, "", id, f.ttip, f.required, inpLongHdr, f.inputHide)
                        loc = itm.find("#row-" + id)
                        if (f.max)
                            loc.data("max", f.max)

                        if (f.list) {
                            bhs.buildMenu(loc, f.name, f.list, nmsce.addTag, {
                                // nolabel: true,
                                ttip: f.ttip,
                                sort: true,
                                required: f.required,
                                labelsize: "col-lg-4 col-md-5 col-sm-6 col-7",
                                menusize: "col-4"
                            })

                            if (fnmsce && f.searchExact)
                                loc.find("#box-" + id).after(tExact)
                        } else {
                            let ref = doc(bhs.fs, "tags/" + itmid)
                            getDoc(ref).then(doc => {
                                let tags = []

                                if (doc.exists) {

                                    let list = doc.data()
                                    for (let t of list.tags)
                                        tags.push({
                                            name: t
                                        })

                                    tags = tags.sort((a, b) =>
                                        a.name.toLowerCase() > b.name.toLowerCase() ? 1 :
                                            a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 0)
                                }

                                if (fcedata)
                                    tags.unshift({
                                        name: "Add new tag"
                                    })

                                bhs.buildMenu(loc, f.name, tags, nmsce.addTag, {
                                    // nolabel: true,
                                    ttip: f.ttip,
                                    labelsize: "col-lg-4 col-md-5 col-sm-6 col-7",
                                    menusize: "col-7"
                                })
                            })
                        }
                    }
                    break
                case "radio":
                    if (!f.sub || slist[f.sub]) {
                        let list = []
                        if (f.list) {
                            appenditem(itm, tRadio, f.name, id, f.ttip, f.required, null, f.inputHide)
                            list = f.list

                        } else if (slist[f.sub]) {
                            appenditem(itm, tRadio, f.name, id, typeof slist[f.ttip] === "string" ? slist[f.ttip] : null, f.required, null, f.inputHide)
                            list = slist[f.sub]
                        }

                        loc = itm.find("#row-" + id + " #list")

                        for (let i of list) {
                            let l = /title/g[Symbol.replace](tRadioItem, i.name)
                            l = /ttip/[Symbol.replace](l, i.ttip ? "&nbsp;" + i.ttiip : "")
                            l = /idname/g[Symbol.replace](l, id)
                            l = /tname/g[Symbol.replace](l, i.name.nameToId())
                            loc.append(l)

                            let rdo = loc.find("#rdo-" + i.name)
                            if (fcedata) {
                                if (i.default)
                                    rdo.prop("checked", true)
                            }
                        }
                    }
                    break
                case "map":
                    if (f.map || slist && slist[f.sub]) {
                        let iid = itmid.nameToId()
                        let loc = $("#pnl-map #pnl-" + (pid ? pid + " #slist-" + slist.name.nameToId() : iid))

                        iid = f.name.nameToId()
                        l = /idname/[Symbol.replace](tMap, iid)
                        loc.append(l)

                        this.loadMap(loc.find("#row-" + iid), f.map ? f.map : slist[f.sub])
                    }
                    break
            }

            let rloc = itm.find("#row-" + id)

            if (f.onchange) {
                rloc.find("input").change(f.onchange)
                rloc.find("menu").change(f.onchange)
            }

            if (f.imgText || f.imgUpdate) {
                rloc.find("input").change(updateImageText.bind(this))
                rloc.find("button").click(updateImageText.bind(this))
            }

            if (f.startState === "hidden")
                rloc.hide()
        }

        let tloc = $("#item-Fighter")
        tloc.click()
    }

    addTag(evt) {
        let row = $(evt).closest("[id|='row']")
        let data = row.data()
        let text = $(evt).val().stripMarginWS().replaceAll("-", " ")
        let id = row.attr("id").stripID()
        let tags = row.find("[id|='tag']")

        if (data.max && tags.length >= data.max)
            return

        if (tags.length > 0)
            for (let t of tags)
                if ($(t).attr("id").stripID() === text) {
                    row.find("#btn-" + id).text(id.idToName())
                    return
                }

        if (text === "Add new tag")
            row.find("#newtag-" + id).show()
        if (text === "verified current version")
            nmsce.last.version = latestversion
        else {
            let h = /idname/[Symbol.replace](tTag, text.nameToId())
            h = /title/[Symbol.replace](h, text)

            row.find("#list-" + id).append(h)
            row.find("#btn-" + id).text(id.idToName())
        }
    }

    newTag(evt) {
        let row = $(evt).closest("[id|='row']")
        let id = row.attr("id").stripID()
        let text = row.find("[id|='txt']").val().toLowerCase()

        if (text !== "" && row.find("[value='" + text.nameToId() + "']").length === 0) {
            let pnl = $(evt).closest("[id|='pnl']").attr("id").stripID()

            setDoc(doc(bhs.fs, "tags/" + pnl), {
                tags: arrayUnion(text)
            }, {
                merge: true
            })

            let loc = row.find("[value='Add-new-tag']")
            let h = loc[0].outerHTML
            let id = text.nameToId()
            h = /Add-new-tag/[Symbol.replace](h, id)
            h = /Add new tag/[Symbol.replace](h, text)
            loc = loc.parent().append(h)

            h = /idname/[Symbol.replace](tTag, id)
            h = /title/[Symbol.replace](h, text)
            row.find("#list-" + row.attr("id").stripID()).append(h)
        }

        row.find("#newtag-" + id).hide()
        row.find("#txt-" + id).val("")
    }

    cancelTag(evt) {
        let row = $(evt).closest("[id|='row']")
        row.find("[id|='newtag']").hide()
        row.find("[id|='txt']").first().val("")
        row.find("[id|='btn']").first().text(row.attr("id").stripID())
    }

    toggleRadio(evt) {
        let data = $(evt).data()

        if (data.last) {
            $(evt).prop("checked", false)
            $(evt).data("last", false)
        } else {
            let loc = $(evt).closest("#list").find("input")
            loc.prop("checked", false)
            loc.data("last", false)
            $(evt).prop("checked", true)
            $(evt).data("last", true)
        }

        return false
    }

    setMapSize(loc) {
        let maps = loc.find("[id|='row']:visible")
        for (let l of maps) {
            let svg = $(l).find("svg")
            let svgw = parseInt(svg.attr("width"))
            let svgh = parseInt(svg.attr("height"))

            let h = $("#panels").height()
            let w = $(l).parent().width()
            let size = calcImageSize(svgw, svgh, w, h / maps.length, true)

            svg.attr("preserveAspectRatio", "xMidYMid meet")
            svg.attr("width", size.width)
            svg.attr("height", size.height)
        }
    }

    loadMap(loc, fname) {
        let self = this;
        loc.load(fname, () => {
            // loc.find("#layer1").hide()

            let bdr = loc.find("[id|='bdr']")
            bdr.css("stroke-opacity", "0")

            let map = loc.find("[id|='map']")
            map.find("*").css("stroke", mapColors.enabled)
            $("[id='asym-checkmark']").hide()

            let name = fname.replace(/\/.*\/(.*?)(?:-opt)?\..*/, "$1")
            if (typeof nmsce[name] === "undefined")
                nmsce[name] = {}

            for (let l of bdr) {
                let id = $(l).attr("id").stripID()
                let d = $(l).find("desc").text()
                nmsce[name][id] = {}

                if (d !== "") {
                    nmsce[name].type = "map"
                    nmsce[name][id] = JSON.parse(d)
                }

                let t = $(l).find("title").text()
                if (t !== "")
                    nmsce[name][id].title = t.stripMarginWS()
            }

            for (let l of map) {
                let id = $(l).attr("id").stripID()
                if (nmsce[name][id].type !== "map") {
                    nmsce[name].type = "map"
                    let d = $(l).find("desc").text()

                    if (d !== "")
                        nmsce[name][id] = JSON.parse(d)
                }

                nmsce[name][id].state = "enabled"
                nmsce[name][id].loc = $(l)
            }

            bdr.click(function () {
                self.selectMap(this)
            })

            bdr.mouseenter(function () {
                self.mapEnter(this)
            })

            bdr.mouseleave(function () {
                self.mapLeave(this)
            })
        })
    }

    selectMap(evt, set) {
        let evtid = $(evt).attr("id").stripID()
        let type = $(evt).closest("[id|='slist']")
        let pnl = $(evt).closest("[id|='pnl']")
        let asym = $("#typePanels #" + pnl.attr("id"))

        if (type.length !== 0) {
            asym = asym.find("#" + type.attr("id"))
            pnl = type
        }

        asym = fnmsce ? asym.find("#row-Asymmetric #rdo-True") : asym.find("#ck-Asymmetric")
        asym = asym.length > 0 ? asym.prop("checked") : false

        let pnlid = pnl.attr("id").stripID().toLowerCase()
        let parts = nmsce[pnlid]

        let part = parts[evtid]
        let partsList = Object.keys(parts)

        if (!set) {
            switch (part.state) {
                case "disabled":
                case "enabled":
                    part.state = "selected"
                    break
                case "selected":
                    part.state = fnmsce ? "error" : "enabled"
                    break
                case "error":
                    part.state = "enabled"
                    break
            }
        }
        else
            part.state = set

        for (let p of partsList)
            if (p !== "type") {
                parts[p].proc = false
                if (parts[p].state === "disabled")
                    parts[p].state = "enabled"
            }

        const setState = function (id, state) {
            let part = parts[id]

            if (!part.proc) {
                part.proc = true
                part.state = state

                selectRequired(id)

                if (!asym && !set && part.pair)
                    setState(part.pair, part.state)

                disableParts(id)
            }
        }

        const selectRequired = function (id) {
            let part = parts[id]
            if (part.requires)
                for (let p of part.requires) {
                    if (part.state === "selected")
                        setState(p, part.state)
                    else if (parts[p].requires && parts[p].requires.includes(id))
                        setState(p, part.state)
                }
        }

        let disableParts = function (id) {
            if (id !== "type") {
                let part = parts[id]
                if (part.state === "selected") {
                    if (part.group) {
                        for (let p of partsList)
                            if (p !== "type" && p !== id) {
                                let check = parts[p]

                                if (check.group) {
                                    let intersects = []
                                    if (part.okGroup)
                                        intersects = part.okGroup.intersects(check.group)

                                    if (intersects.length === 0) {
                                        intersects = part.group.intersects(check.group)

                                        if (intersects.length > 0 && !(part.requires && part.requires.includes(p)))
                                            setState(p, set && check.state === "selected" || check.state === "error" ? "error" : "disabled")
                                    }
                                }
                            }
                    }
                }
            }
        }

        setState(evtid, part.state)

        for (let p of partsList)
            disableParts(p)

        let max = ""
        let end = 0
        let endval = ""
        let slotsfound = false

        for (let p of partsList) {
            let part = parts[p]
            if (p !== "type" && part.slots) {
                slotsfound = true

                if (part.state === "selected") {
                    if (!max || part.slots > max)
                        max = part.slots
                    if (part.pos && end < part.pos) {
                        end = part.pos
                        endval = part.slots
                    }
                }
            }
        }

        if (slotsfound && fcedata) {
            let sloc = $("#typePanels [id|='row-Slots']")
            sloc.find("input").prop("checked", false)

            if (type.attr("id") === "slist-Hauler")
                sloc = sloc.find("[id|='rdo-" + (end > 0 ? endval : "T1") + "']")
            else
                sloc = sloc.find("[id|='rdo-" + (max ? max : "T1") + "']")

            sloc.prop("checked", true)
            this.restoreImageText(null, true)
        }

        colorMapParts(pnlid)
    }

    mapEnter(evt) {
        let id = $(evt).attr("id").stripID()
        let loc = $(evt).closest("[id|='row']").find("#map-" + id)
        loc.find("*").css("stroke", mapColors.hover)
    }

    mapLeave(evt) {
        let id = $(evt).attr("id").stripID()
        let pnl = $(evt).closest("[id|='slist']")
        let pnlid

        if (pnl.length > 0)
            pnlid = pnl.attr("id").stripID().toLowerCase()
        else
            pnlid = $(evt).closest("[id|='pnl']").attr("id").stripID().toLowerCase()

        colorMapPart(nmsce[pnlid][id])
    }

    selectSublist(menu) {
        let id = menu.val().stripMarginWS().nameToId()
        let type = menu.closest("[id|='pnl']").attr("id").stripID()

        let mloc = $("#pnl-map")
        mloc.find("[id|='slist']").hide()

        mloc = mloc.find("#pnl-" + type)
        mloc.show()
        mloc = mloc.find("#slist-" + id)
        mloc.show()

        this.setMapSize(mloc)

        mloc = $("#typePanels")
        mloc.find("[id|='slist']").hide()

        mloc = mloc.find("#pnl-" + type)
        mloc.show()
        mloc = mloc.find("#slist-" + id)
        mloc.show()

        showLatLong()
    }

    buildImageText() {
        const ckbox = `
        <label class="col-lg-2 col-md-3 col-sm-4 col-7">
            <input id="ck-idname" type="checkbox" ftype loc row sub onchange="nmsce.getImageText(this, true)">
            &nbsp;title
        </label>`
        const fieldinputs = `
        <label class="col-md-2 col-sm-7 txt-label-def ">
            <input id="ck-Text" type="checkbox" data-loc="#id-Text"
                onchange="nmsce.getImageText(this, true)">
            Text&nbsp;
            <i class="bx bx-help-circle text-danger h6" data-toggle="tooltip" data-html="false"
                data-placement="bottom" title="Use Line break, <br>, to separate multiple lines.">
            </i>&nbsp;
        </label>
        <input id="id-Text" class="rounded col-md-5 col-7" type="text"
            onchange="nmsce.getImageText(this, true)">

        <label class="col-md-2 col-sm-7 txt-label-def ">
            <input id="ck-myLogo" type="checkbox" data-loc="#id-myLogo" data-type="img"
                onchange="nmsce.getImageText(this, true)">
            Load Overlay&nbsp;
            <i class="bx bx-help-circle text-danger h6" data-toggle="tooltip" data-html="false"
                data-placement="bottom"
                title="Load a 2nd image as an overlay. You can resize and move the 2nd image."></i>&nbsp;
        </label>
        <input id="id-myLogo" type="file" class="col-md-5 col-sm-7 border rounded" accept="image/*"
            name="files[]" onchange="nmsce.loadMyLogo(this)">
        `

        let appenditem = (title, type, loc, row, sub) => {
            let h = /idname/[Symbol.replace](ckbox, title.nameToId())
            h = /title/[Symbol.replace](h, title)
            h = /ftype/[Symbol.replace](h, "data-type='" + type + "'")
            h = /loc/[Symbol.replace](h, "data-loc='" + loc + "'")
            h = /sub/[Symbol.replace](h, sub ? "data-sub='" + sub + "'" : "")
            h = /row/[Symbol.replace](h, row ? "data-row='" + row + "'" : "")
            $("#img-text").append(h)
        }

        $("#img-text").empty()
        $("#img-text").append(fieldinputs)

        this.imageText = {}
        this.initImageText("logo")

        // function drawInlineSVG(ctx, rawSVG, callback) {
        //     /// create Blob of inlined SVG
        //     svg = new Blob([rawSVG], { type: "image/svg+xml;charset=utf-8" }),
        //         /// create URL (handle prefixed version)
        //         domURL = self.URL || self.webkitURL || self,
        //         url = domURL.createObjectURL(svg),
        //         /// create Image
        //         img = new Image;

        //     /// handle image loading
        //     img.onload = function () {
        //         /// draw SVG to canvas
        //         ctx.drawImage(this, 0, 0);
        //         domURL.revokeObjectURL(url);
        //         callback(this);
        //     };

        //     img.src = url;
        // }

        // var rawSVG = '<svg ... >';
        // drawInlineSVG(ctx, rawSVG, function (img) {
        //     console.log('done!');
        // });

        let img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = this.onLoadLogo.bind(this);
        img.src = "/images/nmsce-app-logo-abrev.png"

        this.initImageText("Text")
        this.initImageText("myLogo")

        for (let obj of objectList) {
            for (let txt of obj.imgText)
                if (typeof this.imageText[txt.name.nameToId()] === "undefined") {
                    this.initImageText(txt.name.nameToId())
                    appenditem(txt.name, txt.type, txt.id)
                }

            for (let fld of obj.fields) {
                if (fld.imgText && typeof this.imageText[fld.name.nameToId()] === "undefined") {
                    this.initImageText(fld.name.nameToId())
                    appenditem(fld.name, fld.type, "#typePanels .active", "#row-" + fld.name.nameToId())
                }

                if (typeof fld.sublist !== "undefined")
                    for (let sub of fld.sublist)
                        if (sub.imgText && typeof this.imageText[sub.name.nameToId()] === "undefined") {
                            this.initImageText(sub.name.nameToId())
                            appenditem(sub.name, sub.type, "#typePanels .active", "#row-" + fld.name.nameToId(), "#row-" + sub.name.nameToId())
                        }
            }
        }

        let loc = $("#img-text")
        let next = loc.find("#id-myLogo").nextAll()
        let list = []
        for (let l of next) {
            list.push({
                id: $(l).find("input").attr("id"),
                html: l.outerHTML
            })
            $(l).remove()
        }

        list.sort((a, b) => a.id > b.id ? 1 : -1)
        for (let l of list)
            loc.append(l.html)

        bhs.buildMenu($("#imgtable"), "Font", fontList, this.setFont, {
            labelsize: "col-5",
            menusize: "col",
            sort: true,
            font: true,
        })

        $("[id|='color']").colorpicker({
            container: true,
            format: null,
            customClass: 'colorpicker-2x',
            sliders: {
                saturation: {
                    maxLeft: 200,
                    maxTop: 200
                },
                hue: {
                    maxTop: 200
                },
                alpha: {
                    maxTop: 200
                }
            },
            extensions: [{
                name: 'swatches', // extension name to load
                options: { // extension options
                    colors: {
                        '1': '#ffffff',
                        '2': '#ff0000',
                        '3': '#ff8000',
                        '4': '#ffff00',
                        // '5': '#80ff00',
                        '6': '#00ff00',
                        // '7': '#00ff80',
                        '8': '#00ffff',
                        // '9': '#0080ff',
                        '10': '#0000ff',
                        // '11': '#8000ff',
                        '12': '#ff00ff',
                        // '13': '#ff0080',
                        '14': '#000000',
                    },
                    namesAsValues: true
                }
            }]
        }).on('change', evt => {
            $(evt.target).css("background-color", evt.color.toRgbString())
            this.setColor($(evt.target).attr("id").stripID(), evt.color.toRgbString())
        })
    }

    initImageText(id) {
        if (typeof this.imageText === "undefined")
            this.imageText = {}

        if (typeof this.imageText[id] === "undefined")
            this.imageText[id] = {}

        switch (id) {
            case "logo":
                this.imageText[id] = {
                    ck: true,
                    type: "img",
                }
                break
            case "myLogo":
                this.imageText[id] = {
                    ck: false,
                    type: "img",
                }
                break
            default:
                this.imageText[id] = {
                    font: id === "Glyphs" ? "NMS Glyphs" : "Arial",
                    fSize: 24,
                    color: "#ffffff",
                    background: id === "Glyphs" ? "#000000" : "rgba(0,0,0,0)",
                    ck: false,
                    text: "",
                    type: "text"
                }
        }

        this.imageText[id].sel = false
        this.imageText[id].id = id
        this.imageText[id].x = 20
        this.imageText[id].y = 20

        return this.imageText[id]
    }

    getImageText(evt, draw) {
        let id = $(evt).attr("id").stripID()
        let ck = $(evt).prop("checked")

        if (ck) {
            let text = ""
            let data = $(evt).data()
            let loc = $(data.loc)
            let dloc = loc

            if (data.row)
                loc = loc.find(data.row)

            if (data.sub) {
                let btn = loc.find("[id|='menu']")
                btn = bhs.getMenu(btn)
                loc = $(data.loc).find("#slist-" + btn)
                loc = loc.find(data.sub)
            }

            if (loc.length === 0 && data.sub)    // planet name could be on sub because of crashed ships
                loc = dloc.find(data.sub)

            if (loc.length === 0)
                return

            switch (data.type) {
                case "menu":
                    if (loc.attr("id").search("menu") < 0)
                        loc = loc.find("[id|='menu']")
                    text = bhs.getMenu(loc)
                    break
                case "tags":
                    loc = loc.find("[id|='tag']")
                    if (loc.length > 0) {
                        for (let l of loc)
                            text += $(l).attr("id").stripID().idToName() + ", "

                        text = text.slice(0, text.length - 2)
                    }
                    break
                case "number":
                    text = loc.find("input").val()
                    text = !text || text === -1 ? "" : text.toString()
                    if (text.length > 0)
                        text = loc.closest("[id|='row']").attr("id").stripID().idToName() + " " + text
                    break
                case "float":
                    text = loc.find("input").val()
                    text = !text || text === -1 ? "" : text.toString()
                    if (text.length > 0)
                        text = loc.closest("[id|='row']").attr("id").stripID().idToName() + " " + text
                    break
                case "glyph":
                    text = loc.val()
                    loc = $("#typePanels .active #id-Planet-Index")
                    let num = loc.length > 0 && loc.val() > 0 ? loc.val() : 0
                    text = addrToGlyph(text, num)
                    break
                case "checkbox":
                    loc = loc.find("[id|='ck']")
                    if (loc.prop("checked"))
                        text = loc.attr("id").stripID()
                    break
                case "radio":
                    loc = loc.find(":checked")
                    if (loc.length > 0) {
                        let id = loc.closest("[id|='row']").attr("id").stripID()
                        text = (id !== "Lifeform" ? id + " " : "") + loc.attr("id").stripID()
                    }
                    break
                default:
                    if (loc.is("input"))
                        text = loc.val()
                    else
                        text = loc.find("input").val()
                    break
            }

            for (let k of Object.keys(this.imageText)) {
                if (k === "textsize")
                    continue

                this.imageText[k].sel = false
            }

            this.imageText[id].ck = true

            if (text) {
                this.imageText[id].text = text
                this.imageText[id] = this.measureText(this.imageText[id])
            }
        } else {
            this.imageText[id].ck = false
            this.imageText[id].sel = false
        }

        if (draw)
            this.drawText()
    }

    restoreImageText(txt, draw) {
        let loc = $("#img-text")

        if (!fcedata)
            return

        if (txt)
            this.imageText = mergeObjects(this.imageText, txt)

        if (typeof this.imageText.myLogo.img === "undefined")
            this.imageText.myLogo.ck = false
        this.imageText.logo.ck = true

        let keys = Object.keys(this.imageText)
        for (let id of keys) {
            if (id === "textsize")
                continue

            let f = this.imageText[id]

            if (id === "Text" && f.text)
                loc.find("#id-Text").val(f.text)
            else
                f.text = ""

            let floc = loc.find("#ck-" + id)

            if (floc.length > 0) {
                floc.prop("checked", f.ck)
                this.getImageText(floc)
            }

            f.sel = false
        }

        if (draw)
            this.drawText()
    }

    extractImageText() {
        let s = mergeObjects({}, this.imageText)

        let keys = Object.keys(s)
        for (let k of keys) {
            if (k === "textsize")
                continue

            let f = s[k]

            if (f.type === "text") {
                delete f.ascent
                delete f.decent
                delete f.left
                delete f.right
            }

            if (k !== "Text")
                delete f.text

            delete f.width
            delete f.height
            delete f.lineAscent
            delete f.lineDecent
            delete f.img
            delete f.resize
            delete f.sel
        }

        return s
    }

    onLoadLogo(evt) {
        let text = evt.currentTarget.src.includes("nmsce-app-logo-abrev") ? this.imageText.logo : this.imageText.myLogo
        let img = text.img = evt.currentTarget

        let scale = text.right ? Math.min(text.right / img.naturalWidth, text.decent / img.naturalHeight) : 0.1
        text.decent = img.naturalHeight * scale
        text.right = img.naturalWidth * scale
        text.ascent = 0
        text.left = 0
        text.ck = true

        $("#ck-" + text.id).prop("checked", true)
        if (text.id !== "logo")
            this.drawText()
    }

    loadMyLogo(evt) {
        let file = evt.files[0]
        let reader = new FileReader()

        reader.onload = () => {
            let img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = this.onLoadLogo.bind(this);
            img.src = reader.result
        }

        reader.readAsDataURL(file)
    }

    loadScreenshot(evt, fname, edit) {
        $("body")[0].style.cursor = "wait"

        let img = $("#imgtable")
        img.show()

        $("#openReddit").addClass("disabled")
        $("#openReddit").prop("disabled", true)
        $("#redditPost").hide()

        if (evt || edit) {
            this.glyphLocation = {
                x: 4,
                y: 412,
                height: 14,
                width: 158,
                naturalWidth: 3840,
                naturalHeight: 2160,
                modalWidth: 782,
                modalHeight: 439,
                scale: 0,
            }

            $("#editScreenshot").hide()
            $("#id-ss1Image").hide()
            $("#id-canvas").show()
            $("#imageTextBlock").show()
            $("#editingScreenshot").show()

            if (typeof this.last.Photo !== "undefined") {
                $("#updateScreenshot").show()
                $("#ck-updateScreenshot").prop("checked", true)
            }
        } else {
            $("#editScreenshot").show()
            $("#imageTextBlock").hide()
            $("#id-canvas").hide()
            $("#id-ss1Image").show()
            $("#updateScreenshot").hide()
            $("#editingScreenshot").hide()
        }

        if (evt) {
            let file = evt.files[0]
            if (file) {
                let reader = new FileReader()
                reader.onload = () => {
                    this.screenshot = new Image()
                    this.screenshot.crossOrigin = "anonymous"

                    this.screenshot.onload = () => {
                        this.restoreImageText(null, true)
                        this.scaleGlyphLocation()

                        $('html, body').animate({
                            scrollTop: $('#imgtable').offset().top
                        }, 500)

                        $("body")[0].style.cursor = "default"
                    }

                    this.screenshot.src = reader.result
                }

                reader.readAsDataURL(file)
            }
        } else {
            let img = new Image()
            img.crossOrigin = "anonymous"

            // Get Original or Display URL depending on if we are editing it
            let url = (edit ? GetOriginalUrl : GetDisplayUrl)(fname);

            if (edit) {
                var xhr = new XMLHttpRequest()
                xhr.responseType = 'blob'
                xhr.onload = (event) => {
                    this.screenshot = new Image()
                    this.screenshot.crossOrigin = "anonymous"
                    this.screenshot.src = url;

                    this.screenshot.onload = () => {
                        this.restoreImageText(null, true)
                        this.scaleGlyphLocation()

                        $("body")[0].style.cursor = "default"
                    }
                }

                xhr.open('GET', url)
                xhr.send()
            } else {
                $("#id-ss1Image").attr("src", url)

                $("#openReddit").removeClass("disabled")
                $("#openReddit").removeAttr("disabled")
            }
        }
    }

    editScreenshot() {
        if (typeof this.last.Photo !== "undefined")
            this.loadScreenshot(null, this.last.Photo, true)
    }

    measureText(t) {
        if (t.type === "img")
            return t

        let canvas = document.createElement("canvas")
        let ctx = canvas.getContext("2d")

        ctx.font = t.fSize + "px " + t.font

        if (t.text.includes("<br>")) {
            let lines = t.text.split("<br>")
            t.left = Number.MAX_SAFE_INTEGER
            t.right = 0
            t.lineAscent = []
            t.lineDecent = []

            for (let i = 0; i < lines.length; ++i) {
                let l = lines[i]
                let m = ctx.measureText(l)
                t.left = Math.min(t.left, m.actualBoundingBoxLeft)
                t.right = Math.max(t.right, m.actualBoundingBoxRight)
                t.lineAscent[i] = m.actualBoundingBoxAscent
                t.lineDecent[i] = m.actualBoundingBoxDescent

                if (i === 0) {
                    t.ascent = m.actualBoundingBoxAscent
                    t.decent = m.actualBoundingBoxDescent
                } else
                    t.decent += m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + t.fSize / 8
            }
        } else {
            let m = ctx.measureText(t.text)
            t.left = m.actualBoundingBoxLeft
            t.right = m.actualBoundingBoxRight
            t.decent = m.actualBoundingBoxDescent
            t.ascent = m.actualBoundingBoxAscent
        }

        return t
    }

    setColor(inid, value) {
        let keys = Object.keys(this.imageText)
        for (let id of keys) {
            if (id === "textsize")
                continue

            let text = this.imageText[id]

            if (text.sel && text.type !== "img")
                text[inid === "font" ? "color" : inid] = value
        }

        this.drawText()
    }

    setSize(evt) {
        let size = parseInt($(evt).val())

        let keys = Object.keys(this.imageText)
        for (let id of keys) {
            if (id === "textsize")
                continue

            let text = this.imageText[id]

            if (text.sel && text.type !== "img") {
                text.fSize = size
                text = this.measureText(text)
            }
        }

        this.drawText()
    }

    setFont(evt) {
        let font = bhs.getMenu($(evt))

        let keys = Object.keys(nmsce.imageText)
        for (let id of keys) {
            if (id === "textsize")
                continue

            let text = nmsce.imageText[id]

            if (text.sel && text.type !== "img") {
                text.font = id === "Glyphs" ? "NMS Glyphs" : font
                text = nmsce.measureText(text)
            }
        }

        nmsce.drawText()
    }

    drawText(alt, altw) {
        if (!$("#imageTextBlock").is(":visible"))
            return

        let img = $("#id-img")

        let canvas = alt ? alt : document.getElementById("id-canvas")
        let width = img.width()
        let sw = this.screenshot.naturalWidth
        let sh = this.screenshot.naturalHeight

        if (sh > sw) { // vertical
            txtcanvas.height = Math.min(width, sh)
            txtcanvas.width = parseInt(sw * txtcanvas.height / sh)

            canvas.height = Math.min(altw ? altw : width, sw)
            canvas.width = parseInt(sw * canvas.height / sh)
        } else {
            txtcanvas.width = Math.min(width, sw)
            txtcanvas.height = parseInt(sh * txtcanvas.width / sw)

            canvas.width = Math.min(altw ? altw : width, sw)
            canvas.height = parseInt(sh * canvas.width / sw)
        }

        if (typeof this.imageText.textsize === "undefined")
            this.imageText.textsize = {}

        if (this.imageText.textsize.height && this.imageText.textsize.height != txtcanvas.height || this.imageText.textsize.width && this.imageText.textsize.width != txtcanvas.width)
            this.scaleImageText(txtcanvas.height, txtcanvas.width)

        this.imageText.textsize.height = txtcanvas.height
        this.imageText.textsize.width = txtcanvas.width

        this.imageText.logo.right = this.imageText.logo.decent = parseInt(Math.min(txtcanvas.width, txtcanvas.height) * 0.15)
        if ($("#imageTextBlock").is(":visible")) {
            let ctx = txtcanvas.getContext("2d")
            ctx.clearRect(0, 0, txtcanvas.width, txtcanvas.height)

            let loc = $("#img-text")
            let keys = Object.keys(this.imageText)

            let logo = this.imageText.myLogo

            if (logo) {
                let tloc = loc.find("#ck-" + logo.id)

                if (logo.ck && tloc.is(":visible"))
                    ctx.drawImage(logo.img, logo.x + logo.left, logo.y, logo.right - logo.left, logo.ascent + logo.decent)
            }

            for (let id of keys) {
                if (id === "textsize")
                    continue

                let text = this.imageText[id]
                let tloc = loc.find("#ck-" + id)

                if (text.ck && tloc.is(":visible") || text.id === "logo") {
                    if (text.y + text.decent > txtcanvas.height)
                        text.y = txtcanvas.height - text.decent
                    else if (text.y - text.ascent < 0)
                        text.y = text.ascent

                    if (text.x + text.right > txtcanvas.width)
                        text.x = txtcanvas.width - text.right
                    else if (text.x + text.left < 0)
                        text.x = -text.left

                    // if (id === "Glyphs") {
                    //     text.font = "NMS Glyphs"

                    //     ctx.fillStyle = text.color
                    //     ctx.fillRect(text.x + text.left - 5, text.y - text.ascent - 5, text.right - text.left + 9, text.ascent + text.decent + 8)
                    //     ctx.fillStyle = "#000000"
                    //     ctx.fillRect(text.x + text.left - 3, text.y - text.ascent - 3, text.right - text.left + 5, text.ascent + text.decent + 4)
                    // }

                    if (text.type === "text") {
                        if (typeof text.background !== "undefined" && text.text.length > 0) {
                            ctx.fillStyle = text.background
                            ctx.fillRect(text.x + text.left, text.y - text.ascent - 1, text.right - text.left + 1, text.ascent + text.decent + 2)
                        }

                        ctx.font = text.fSize + "px " + text.font
                        ctx.fillStyle = text.color

                        if (text.text && text.text.includes("<br>")) {
                            let l = text.text.split("<br>")
                            let y = text.y - text.lineAscent[0]

                            for (let i = 0; i < l.length; ++i) {
                                y += text.lineAscent[i]
                                ctx.fillText(l[i], text.x, y)
                                y += text.lineDecent[i] + text.fSize / 8
                            }
                        } else
                            ctx.fillText(text.text, text.x, text.y)
                    }

                    if (text.sel && !altw) {
                        ctx.strokeStyle = "white"
                        ctx.setLineDash([3, 2])
                        ctx.beginPath()
                        ctx.rect(text.x + text.left, text.y - text.ascent - 1, text.right - text.left + 1, text.ascent + text.decent + 2)
                        ctx.stroke()
                    }
                }
            }

            ctx.drawImage(this.imageText.logo.img, this.imageText.logo.x, this.imageText.logo.y, this.imageText.logo.right, this.imageText.logo.decent)

            ctx = canvas.getContext("2d")
            ctx.drawImage(this.screenshot, 0, 0, canvas.width, canvas.height)
            ctx.drawImage(txtcanvas, 0, 0, canvas.width, canvas.height)
        }
    }

    scaleImageText(height, width) {
        let hscale = height / this.imageText.textsize.height
        let wscale = width / this.imageText.textsize.width

        let keys = Object.keys(this.imageText)
        for (let id of keys) {
            if (id === "textsize")
                continue

            let text = this.imageText[id]

            text.x *= wscale
            text.left *= wscale
            text.right *= wscale

            text.fSize *= hscale
            text.y *= hscale
            text.ascent *= hscale
            text.decent *= hscale
        }
    }

    editSelected(evt) {
        let e = this.last

        if (bhs.user.uid && (bhs.user.uid === e.uid || bhs.hasRole("admin") || bhs.hasRole("nmsceEditor"))) {
            let link = "/upload?i=" + e.id + "&g=" + e.galaxy.nameToId()
            window.open(link, "_self")
        }
    }

    addToTitle(evt) {
        let loc = $("#id-Title")
        let name = $(evt).text()

        if (name === "pirate") name = "Pirate Raider"
        if (name === "2 glyphs") name = "You only need the first 2 glyphs to get to this system."

        let text = loc.val()
        if (!text)
            text = name
        else if (name === "&" || name === ",") {
            let loc = text.search(/[&,]$/)
            if (loc >= 0)
                text = text.slice(0, loc - 1)
            text += (name === "&" ? " " : "") + name
        } else {
            if (text.match(/[&,]$/))
                text += " " + name
            else
                text += ", " + name
        }

        loc.val(text)
    }

    buildRedditTitleMenu() {
        $("#id-Title").val("")

        if (nmsce.last.type == "Ship") {
            let title = []
            let loc = $("#pnl-map #pnl-" + nmsce.last.type)

            const hdr = `<button class='badge badge-pill badge-primary badge-color h5' onclick='nmsce.addToTitle(this)'>title</button>&nbsp;`
            let htm = ""

            if (nmsce.last.Type) {
                htm = /color/g[Symbol.replace](hdr, "blue")
                htm = /title/g[Symbol.replace](htm, nmsce.last.Type === "Living" ? "Living Ship" : nmsce.last.Type)

                loc = loc.find("#slist-" + nmsce.last.Type)
            }

            let parts = Object.keys(nmsce.last.parts)
            let used = []

            for (let p of parts) {
                let name = loc.find("#bdr-" + p + " title").html()

                if (!used.includes(name)) {
                    used.push(name)

                    if (name && typeof title.find(x => x.name === name) === "undefined" && nmsce.last.parts[p]) {
                        let h = /color/g[Symbol.replace](hdr, "success")
                        htm += /title/g[Symbol.replace](h, name)
                    }
                }
            }

            let tags = Object.keys(nmsce.last.Tags)
            for (let p of tags) {
                let h = /color/g[Symbol.replace](hdr, "green")
                htm += /title/g[Symbol.replace](h, p)
            }

            let colors = Object.keys(nmsce.last.Color)
            for (let p of colors)
                if (nmsce.last.Color[p]) {
                    let h = /color/g[Symbol.replace](hdr, "orange")
                    htm += /title/g[Symbol.replace](h, p)
                }

            if (typeof nmsce.last.Sail !== "undefined") {
                let colors = Object.keys(nmsce.last.Sail)
                for (let p of colors)
                    if (nmsce.last.Sail[p]) {
                        let h = /color/g[Symbol.replace](hdr, "purple")
                        htm += /title/g[Symbol.replace](h, p)
                    }
            }

            let h = /color/g[Symbol.replace](hdr, "black")
            htm += /title/g[Symbol.replace](h, ",")

            h = /color/g[Symbol.replace](hdr, "black")
            htm += /title/g[Symbol.replace](h, "&")

            loc = $("#redditPost #id-Build")
            loc.empty()
            loc.append(htm)
            loc.show()
            $("#redditPost").show()

            // bhs.buildMenu($("#redditPost"), "Build", title, addToTitle, {
            //     labelsize: "col-md-2 col-3",
            //     menusize: "col",
            // })
            // $("#redditPost #id-Build").show()
        }
        else
            $("#redditPost #id-Build").hide()
    }


    redditLogin(state) {
        let url = reddit.auth_url +
            "?client_id=" + reddit.client_id +
            "&response_type=code&state=" + state +
            "&redirect_uri=" + reddit.redirect_url +
            "&duration=permanent&scope=" + reddit.scope

        window.open(url, "_self")
    }


    redditLoggedIn(state, code) {
        let accessToken = window.localStorage.getItem('nmsce-reddit-access-token')
        if (accessToken)
            nmsce.redditCreate(state)

        else
            $.ajax({
                type: "POST",
                url: reddit.token_url,
                data: {
                    code: code,
                    client_id: reddit.client_id,
                    client_secret: "",
                    redirect_uri: reddit.redirect_url,
                    grant_type: 'authorization_code',
                    state: state
                },
                username: reddit.client_id,
                password: "",
                crossDomain: true,
                beforeSend: (xhr) => {
                    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(reddit.client_id + ":"))
                },
                success: (res) => {
                    if (res.access_token) {
                        window.localStorage.setItem('nmsce-reddit-access-token', res.access_token)
                        window.localStorage.setItem('nmsce-reddit-expires', new Date().getTime() + res.expires_in * 1000)
                        window.localStorage.setItem('nmsce-reddit-refresh-token', res.refresh_token)

                        if (state.includes("post_"))
                            nmsce.redditCreate(state, res.access_token)
                    }
                },
                error: (err) => {
                    console.error(err.getAllResponseHeaders())
                    nmsce.postStatus(err.message)
                },
            })
    }

    getRedditToken(state) {
        let accessToken = window.localStorage.getItem('nmsce-reddit-access-token')
        let expires = window.localStorage.getItem('nmsce-reddit-expires')
        let refreshToken = window.localStorage.getItem('nmsce-reddit-refresh-token')
        let deviceid = window.localStorage.getItem('nmsce-reddit-device-id')

        if (!deviceid) {
            deviceid = uuidv4()
            window.localStorage.setItem('nmsce-reddit-device-id', deviceid)
        }

        if (!accessToken || !expires || !refreshToken)
            nmsce.redditLogin(state) // page reload no return

        else if (new Date().getTime() > expires) {
            $.ajax({
                type: "POST",
                url: reddit.token_url,
                data: {
                    refresh_token: refreshToken,
                    client_id: reddit.client_id,
                    client_secret: "",
                    redirect_uri: reddit.redirect_url,
                    grant_type: 'refresh_token',
                    device_id: deviceid
                },
                username: reddit.client_id,
                password: "",
                crossDomain: true,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(reddit.client_id + ":"))
                },
                success(res) {
                    if (res.access_token) {
                        window.localStorage.setItem('nmsce-reddit-access-token', res.access_token)
                        window.localStorage.setItem('nmsce-reddit-expires', new Date().getTime() + (res.expires_in - 300) * 1000)

                        if (state.includes("post_"))
                            nmsce.redditCreate(state, res.access_token)
                        else if (state.includes("getFlair_"))
                            nmsce.redditGetSubscribed(state, res.access_token)
                        else if (state.includes("getSubscribed"))
                            nmsce.setSubReddit(res.access_token)
                    }
                },
                error(err) {
                    nmsce.postStatus(err.message)
                },
            })
        } else
            return accessToken
    }

    redditCreate(state, accessToken) {
        // nmsce.buildRedditTitleMenu()
        // return

        if (!accessToken) {
            if (nmsce.last)
                state = "post_" + nmsce.last.id

            accessToken = nmsce.getRedditToken(state)
        }

        if (accessToken) {
            nmsce.getRedditUser(accessToken)
            nmsce.redditGetSubscribed(accessToken)

            if (state) {
                let path = state.split("_")

                if (!nmsce.last || nmsce.last.id !== path[1]) {
                    getDoc(doc(bhs.fs, "nmsceCombined/" + path[1])).then(doc => {
                        if (doc.exists())
                            nmsce.displaySingle(doc.data(), true)
                        $("#redditPost").show()
                    })
                }
            }
        }

        $("#redditPost").show()
    }

    getRedditUser(accessToken) {
        if (!accessToken)
            accessToken = nmsce.getRedditToken("getUser")

        if (accessToken) {
            let url = reddit.api_oauth_url + reddit.user_endpt

            $.ajax({
                type: "GET",
                url: url,
                headers: {
                    Authorization: "Bearer " + accessToken,
                },
                crossDomain: true,
                success(res) {
                    window.localStorage.setItem('nmsce-reddit-name', res.name)
                },
                error(err) {
                    nmsce.postStatus(err.message)
                },
            })
        }
    }

    redditGetSubscribed(accessToken) {
        if (!accessToken)
            accessToken = nmsce.getRedditToken("getSubscribed")

        if (accessToken) {
            let url = reddit.api_oauth_url + reddit.subscriber_endpt
            $.ajax({
                type: "GET",
                url: url,
                headers: {
                    Authorization: "Bearer " + accessToken,
                },
                data: {
                    limit: 100,
                },
                crossDomain: true,
                success(res) {
                    nmsce.subReddits = []
                    let def = null

                    for (let s of res.data.children) {
                        let data = s.data;

                        // if (data.over18 || data.subreddit_type == 'user')
                        //     continue

                        nmsce.subReddits.push({
                            name: data.display_name_prefixed,
                            url: data.url,
                            link: data.name
                        })

                        if (data.display_name_prefixed === "r/NMSCoordinateExchange")
                            def = "r/NMSCoordinateExchange"
                    }

                    bhs.buildMenu($("#redditPost"), "SubReddit", nmsce.subReddits, nmsce.setSubReddit, {
                        required: true,
                        labelsize: "col-4",
                        menusize: "col",
                        sort: true
                    })

                    if (def) {
                        let loc = $("#menu-SubReddit")
                        bhs.setMenu(loc, def)
                        nmsce.setSubReddit(loc, accessToken)
                    }

                    nmsce.buildRedditTitleMenu()
                },
                error(err) {
                    nmsce.postStatus(err.message)
                },
            })
        }
    }

    setSubReddit(evt, accessToken) {
        let name = bhs.getMenu(evt)
        let i = getIndex(nmsce.subReddits, "name", name)

        if (!accessToken)
            accessToken = nmsce.getRedditToken("getFlair_" + nmsce.subReddits[i].name)

        if (accessToken) {
            let url = reddit.api_oauth_url + nmsce.subReddits[i].url + reddit.getflair_endpt

            $.ajax({
                type: "get",
                url: url,
                dataType: 'json',
                headers: {
                    Authorization: "Bearer " + accessToken,
                },
                crossDomain: true,
                success(res) {
                    nmsce.subRedditFlair = []

                    for (let s of res) {
                        if (nmsce.subReddits[i].name.includes("Exchange")) {
                            if (s.text.includes("EDIT")) {
                                let name = s.text.split("/")[0]
                                name += '/' + nmsce.last.galaxy.idToName()
                                name += name.startsWith("Base") ? "/" + nmsce.last["Game-Mode"] : ""

                                nmsce.subRedditFlair.push({
                                    name: name,
                                    text_color: s.text_color === "light" ? "white" : "black",
                                    color: s.background_color,
                                    id: s.id,
                                })
                            }
                        } else
                            nmsce.subRedditFlair.push({
                                name: s.text,
                                text_color: s.text_color === "light" ? "white" : "black",
                                color: s.background_color,
                                id: s.id,
                            })
                    }

                    bhs.buildMenu($("#redditPost"), "Flair", nmsce.subRedditFlair, null, {
                        required: true,
                        labelsize: "col-4",
                        menusize: "col"
                    })

                    let n = nmsce.last.type.idToName() === "Ship" ? "Starship" : nmsce.last.type.idToName()
                    let flair = n + '/' + nmsce.last.galaxy.idToName() +
                        (name === "Base" ? "/" + nmsce.last["Game-Mode"] : "")

                    bhs.setMenu($("#menu-Flair"), flair)
                },
                error(err) {
                    nmsce.postStatus(err.message)
                },
            })
        }
    }

    redditPost() {
        let loc = $("#redditPost")
        let sr = bhs.getMenu(loc.find("#menu-SubReddit"))
        let flair = bhs.getMenu(loc.find("#menu-Flair"))
        let title = loc.find("#id-Title").val()

        if (!sr) {
            nmsce.postStatus("Please select SubReddit")
            return
        }

        if (!flair) {
            nmsce.postStatus("Please select Flair")
            return
        }

        if (!title) {
            nmsce.postStatus("Please select Title")
            return
        }

        window.localStorage.setItem('nmsce-reddit-sr', sr)
        window.localStorage.setItem('nmsce-reddit-flair', flair)
        window.localStorage.setItem('nmsce-reddit-title', title)

        let e = nmsce.last
        let link = `https://nmsce.com/preview?i=${e.id}`
        window.localStorage.setItem('nmsce-reddit-plink', link)

        link = `https://nmsce.com/?g=${e.galaxy.nameToId()}&s=${addrToGlyph(e.addr)}`
        window.localStorage.setItem('nmsce-reddit-slink', link)

        window.localStorage.setItem('nmsce-reddit-link', GetDisplayUrl(nmsce.last.Photo))
        nmsce.redditSubmit()
    }

    redditSubmit(accessToken) {
        if (!accessToken)
            accessToken = nmsce.getRedditToken("submit")

        if (accessToken) {
            let sr = window.localStorage.getItem('nmsce-reddit-sr')
            let i = getIndex(nmsce.subReddits, "name", sr)
            sr = nmsce.subReddits[i].url

            let flair = window.localStorage.getItem('nmsce-reddit-flair')
            i = getIndex(nmsce.subRedditFlair, "name", flair)
            let flairId = nmsce.subRedditFlair[i].id

            let plink = window.localStorage.getItem('nmsce-reddit-plink')
            let slink = window.localStorage.getItem('nmsce-reddit-slink')
            let title = window.localStorage.getItem('nmsce-reddit-title')
            let link = window.localStorage.getItem('nmsce-reddit-link')

            let url = reddit.api_oauth_url + reddit.submitLink_endpt

            $.ajax({
                type: "post",
                url: url,
                dataType: 'json',
                headers: {
                    Authorization: "Bearer " + accessToken,
                },
                data: {
                    sr: sr,
                    kind: "link",
                    title: title,
                    url: link,
                    resubmit: true,
                    flair_id: flairId,
                    flair_text: flair
                },
                crossDomain: true,
                async success(res) {
                    if (res.success)
                        for (let r of res.jquery) {
                            let what = r[2]
                            let link = what === "call" ? r[3][0] : ""
                            if (link && link.includes("https://www.reddit.com/")) {
                                let t = link.split("/")
                                t = "t3_" + t[6]
                                let url = reddit.api_oauth_url + reddit.comment_endpt

                                let comment = "This was posted from the [NMSCE web app](https://nmsce.com). Here is the direct [link](" + plink + ") for more info about this item. This is a [link](" + slink + ") to everything found so far in this system.  \n\n"

                                if (typeof nmsce.last !== "undefined") {
                                    if (nmsce.last.Tags["2 glyphs"])
                                        comment += "It only takes the first 2 glyphs you find to get to this system. The first glyph is the planet index so anything will work to get to this system. If the item is on a specific planet and you haven't unlocked the planet index glyph go to the system and then fly to the planet.  \n\n"

                                    if (nmsce.last.Tags["pirate"])
                                        comment += "This is pirate raider ship. To buy this ship go to any trading post and wait for a pirate raid. It may take more than 1 raid for it to spawn and land.  \n\n"

                                    else if (nmsce.last.Type === "Interceptor" || nmsce.last.Type === "Living" || nmsce.last.Crashed) {
                                          if (nmsce.last.Type === "Living")
                                            comment += "To get this living ship go near the specified latitude/longitude and reset the mission. If a normal ship spawns instead of the living ship then you need to reload the game.  "
                                      
                                          comment += "[This link](" + plink + ") contains any specific latitude & longitude information required for a crashed ship.  Make sure you have multiplayer disabled before entering system.  \n\n"
                                    }else if (nmsce.last.type === "Ship")
                                        comment += "Ships can be found at any landing pad in the system.  \n\n"
                                }

                                $.ajax({
                                    type: "post",
                                    url: url,
                                    dataType: 'json',
                                    headers: {
                                        Authorization: "Bearer " + accessToken,
                                    },
                                    data: {
                                        thing_id: t,
                                        text: comment
                                    },
                                    crossDomain: true,
                                })

                                let id = plink.slice(28)

                                let out = {}
                                out.redditlink = link
                                out.reddit = Timestamp.now()

                                nmsce.last.reddit = out.reddit
                                nmsce.last.redditlink = out.redditlink

                                setDoc(doc(bhs.fs, "nmsceCombined/" + id), out, {
                                    merge: true
                                }).then(() => {
                                    nmsce.postStatus("Posted")
                                    $("#redditlink").val(link)
                                })
                            }
                        }
                    else
                        nmsce.postStatus("failed")
                },
                error(err) {
                    nmsce.postStatus(err.message)
                },
            })
        }
    }

    postStatus(str) {
        $("#posted").html("<h5>" + str + "</h5>")
    }

    scaleGlyphLocation() {
        if (!this.glyphLocation.scale) {
            this.glyphLocation.scale = this.screenshot.naturalWidth / this.glyphLocation.modalWidth
            this.glyphLocation.x *= this.glyphLocation.scale
            this.glyphLocation.y *= this.screenshot.naturalHeight / this.glyphLocation.modalHeight
            this.glyphLocation.width *= this.glyphLocation.scale
            this.glyphLocation.height *= this.glyphLocation.scale
        }
    }

    extractGlyphs(mid) {
        $("body")[0].style.cursor = "wait"

        let row = $("#row-glyphCanvas")
        row.show()

        let sel = this.glyphLocation
        let div = sel.width / 12

        let ss = document.createElement('canvas')
        let ssctx = ss.getContext("2d")
        ss.width = this.screenshot.naturalWidth
        ss.height = this.screenshot.naturalHeight
        ssctx.drawImage(this.screenshot, 0, 0)

        let gcanvas = document.getElementById("id-glyphCanvas")
        let gctx = gcanvas.getContext("2d")
        gcanvas.width = (sel.width + 12)
        gcanvas.height = sel.height

        let scanglyph = document.createElement('canvas')
        let scanctx = scanglyph.getContext("2d")
        scanglyph.width = div
        scanglyph.height = div

        let p = []
        let x = sel.x

        for (let i = 0; i < 12; ++i) {
            let imgData = ssctx.getImageData(x, sel.y, div, sel.height)
            scanctx.putImageData(imgData, 0, 0)
            gctx.putImageData(imgData, (div + 1) * i, 0)
            x += div

            p.push(this.model.predict(scanglyph).then(predict => {
                let max = 0.0
                let sel = -1
                let idx = 0
                for (let p of predict) {
                    if (p.probability > max) {
                        max = p.probability
                        idx = i
                        sel = p
                    }
                }

                return {
                    idx: idx,
                    class: sel.className,
                    prob: sel.probability.toFixed(4),
                }
            }))
        }

        Promise.all(p).then(res => {
            res.sort((a, b) => a.idx - b.idx)
            let g = ""
            for (let i = 0; i < res.length; ++i)
                g += res[i].class

            this.changeAddr(null, g)

            $("body")[0].style.cursor = "default"
        })
    }

    hitTest(x, y, text) {
        return x >= text.x + text.left &&
            x <= text.x + text.right - text.left &&
            y >= text.y - text.ascent &&
            y <= text.y + text.decent ? text : ""
    }

    hitTestCorner(x, y, text) {
        let inbox = y >= text.y - text.ascent && y <= text.y + text.decent
        if (inbox) {
            let out = x >= text.x + text.left - 4 && x <= text.x + text.left + 4 ? "l" : ""
            out += x >= text.x + text.right - text.left - 4 && x <= text.x + text.right - text.left + 4 ? "r" : ""

            return (text.resize = out) ? text : null
        } else
            return null
    }

    imageMouseDown(e) {
        e.preventDefault()

        let startX = e.offsetX
        let startY = e.offsetY

        let hit = null
        let nochange = false

        let keys = Object.keys(this.imageText)
        for (let k of keys) {
            if (k === "textsize")
                continue

            let text = this.imageText[k]
            if (text.id !== "logo" && (!$("#ck-" + text.id).is(":visible") || !text.ck))
                continue

            if (text.id === "logo" || !(hit = this.hitTestCorner(startX, startY, text)))
                hit = this.hitTest(startX, startY, text)

            if (hit && text.type === "text") {
                let loc = $("#imgtable")

                let font = loc.find("#menu-Font")
                bhs.setMenu(font, text.font)

                loc.find("#sel-size").val(text.fSize)

                loc.find("#color-font").colorpicker("disable")
                loc.find("#color-background").colorpicker("disable")

                loc.find("#color-font").colorpicker("setValue", text.color)
                if (typeof text.background !== "undefined")
                    loc.find("#color-background").colorpicker("setValue", text.background)
                else
                    loc.find("#color-background").colorpicker("setValue", "rgba(0,0,0,0)")

                loc.find("#color-font").colorpicker("enable")
                loc.find("#color-background").colorpicker("enable")
            }

            if (hit) {
                nochange = text.sel
                text.sel = true
                break
            }
        }

        if (hit) {
            this.startX = startX
            this.startY = startY
        }

        if (!e.shiftKey && !nochange) {
            let keys = Object.keys(this.imageText)
            for (let i of keys) {
                if (i === "textsize")
                    continue

                if (!hit || i !== hit.id) {
                    let text = this.imageText[i]
                    text.sel = false
                }
            }
        }

        this.drawText()
    }

    imageKeypress(e) {
        if (!e.code.includes("Arrow"))
            return

        e.preventDefault()

        let changed = false
        let keys = Object.keys(this.imageText)

        for (let k of keys) {
            if (k === "textsize")
                continue

            let text = this.imageText[k]

            if (text.sel) {
                changed = true

                if (e.shiftKey) {
                    switch (e.code) {
                        case "ArrowLeft":
                        case "ArrowDown":
                            if (text.type === "text") {
                                text.fSize -= text.font === "NMS Glyphs" ? 1 / 10 : 1 / 3
                                this.measureText(text)
                            } else {
                                text.decent *= (text.right - 1) / text.right
                                text.right -= 1
                            }
                            break
                        case "ArrowRight":
                        case "ArrowUp":
                            if (text.type === "text") {
                                text.fSize += text.font === "NMS Glyphs" ? 1 / 10 : 1 / 3
                                this.measureText(text)
                            } else {
                                text.decent *= (text.right + 1) / text.right
                                text.right += 1
                            }
                            break
                    }
                } else {
                    switch (e.code) {
                        case "ArrowRight":
                            text.x++
                            break
                        case "ArrowUp":
                            text.y--
                            break
                        case "ArrowLeft":
                            text.x--
                            break
                        case "ArrowDown":
                            text.y++
                            break
                    }
                }
            }
        }

        if (changed)
            this.drawText()
    }

    imageMouseMove(e) {
        e.preventDefault()

        let mouseX = e.offsetX
        let mouseY = e.offsetY
        let dx = 0
        let dy = 0

        if (typeof this.startX !== "undefined") {
            dx = mouseX - this.startX
            dy = mouseY - this.startY
            this.startX = mouseX
            this.startY = mouseY
        }

        let ncursor = "crosshair"

        let resize = ""

        let keys = Object.keys(this.imageText)
        for (let k of keys) {
            if (k === "textsize")
                continue

            let text = this.imageText[k]
            if (text.sel && text.resize) {
                resize = text.resize
                break
            }
        }

        for (let k of keys) {
            let text = this.imageText[k]

            if (text.sel && typeof this.startX !== "undefined") {
                if (text.id === "logo" || !resize) {
                    text.x += dx
                    text.y += dy
                } else if (resize) {
                    let old = {}
                    old.ascent = text.ascent
                    old.decent = text.decent
                    old.left = text.left
                    old.right = text.right
                    ncursor = "col-resize"

                    switch (resize) {
                        case "l":
                            if (text.type === "text") {
                                text.fSize -= text.font === "NMS Glyphs" ? dx / 10 : dx / 3
                                this.measureText(text)
                                text.x += old.right - text.right
                            } else {
                                text.decent *= (text.right - dx) / text.right
                                text.right -= dx
                                text.y += old.decent - text.decent
                                text.x += old.right - text.right
                            }
                            break
                        case "r":
                            if (text.type === "text") {
                                text.fSize += text.font === "NMS Glyphs" ? dx / 10 : dx / 3
                                this.measureText(text)
                            } else {
                                text.decent *= (text.right + dx) / text.right
                                text.right += dx
                                text.y += old.decent - text.decent
                            }
                            break
                    }
                }
            }

            if (text.sel && ncursor === "crosshair") {
                if (text.id !== "logo" && this.hitTestCorner(mouseX, mouseY, text))
                    ncursor = "ew-resize"
                else if (this.hitTest(mouseX, mouseY, text))
                    ncursor = "move"
            }
        }

        $("#id-canvas")[0].style.cursor = ncursor

        if (typeof this.startX !== "undefined")
            this.drawText()
    }

    imageMouseUp(e) {
        e.preventDefault()

        delete this.startX
        delete this.startY

        let keys = Object.keys(this.imageText)
        for (let k of keys)
            delete this.imageText[k].resize

        $("#id-canvas")[0].style.cursor = "crosshair"
    }

    imageMouseOut(e) {
        e.preventDefault()
        this.imageMouseUp(e)

        $("body")[0].style.cursor = "default"
    }

    alignText(how) {
        let keys = Object.keys(this.imageText)
        let top = 0,
            left = 0,
            right = Number.MAX_SAFE_INTEGER,
            bottom = Number.MAX_SAFE_INTEGER

        for (let k of keys) {
            if (k === "textsize")
                continue

            let text = this.imageText[k]

            if (text.sel) {
                top = Math.max(top, text.y - text.ascent)
                bottom = Math.min(bottom, text.y + text.decent)
                left = Math.max(left, text.x + text.left)
                right = Math.min(right, text.x + text.right)
            }
        }

        for (let k of keys) {
            let text = this.imageText[k]

            if (text.sel) {
                switch (how) {
                    case "top":
                        text.y = top + text.ascent
                        break
                    case "bottom":
                        text.y = bottom - text.decent
                        break
                    case "left":
                        text.x = left + text.left
                        break
                    case "right":
                        text.x = right - text.right
                        break
                }
            }
        }

        this.drawText()
    }

    deleteEntry() {
        let entry = this.last
        let docRef = doc(bhs.fs, "nmsceCombined/" + entry.id)

        let vref = collection(docRef, "votes")
        getDocs(vref).then(snapshot => {
            for (let doc of snapshot.docs)
                deleteDoc(doc.ref);
        })

        deleteDoc(docRef).then(async () => {
            bhs.status(entry.type + " deleted.")
            $("#save").text("Save All")
            $("#delete-item").addClass("disabled")
            $("#delete-item").prop("disabled", true)

            let vref = collection(docRef, "votes")
            getDocs(vref).then(snapshot => {
                for (let doc of snapshot.docs)
                    deleteDoc(doc.ref);
            })

            // Little trick to get array of all different paths
            let ImagePaths = [
                GetDisplayPath,
                GetOriginalPath,
                GetThumbnailPath
            ].map(func => func(entry.Photo));

            await DeleteImages(ImagePaths);
        }).catch(err => {
            bhs.status("ERROR: " + err.code)
            console.log(err)
        })
    }

    async updateScreenshot(entry) {
        if ($("#id-canvas").is(":visible") &&
            (!entry.Photo || !$("#ck-updateScreenshot").is(":visible") || $("#ck-updateScreenshot").prop("checked"))) {

            if (typeof entry.Photo === "undefined" || !entry.Photo)
                entry.Photo = entry.id + ".jpg"

            /** @type {{path: string, blob: Blob}[]} */
            const images = []

            let disp = document.createElement('canvas')
            this.drawText(disp, 1024)

            images.push({
                path: GetDisplayPath(entry.Photo),
                blob: await new Promise(resolve => disp.toBlob(resolve, "image/jpeg", 0.9))
            });

            let thumb = document.createElement('canvas')
            this.drawText(thumb, 400)

            images.push({
                path: GetThumbnailPath(entry.Photo),
                blob: await new Promise(resolve => thumb.toBlob(resolve, "image/jpeg", 0.8))
            });

            let orig = document.createElement('canvas')
            let ctx = orig.getContext("2d")
            orig.width = Math.min(2048, this.screenshot.width)
            orig.height = parseInt(this.screenshot.height * orig.width / this.screenshot.width)
            ctx.drawImage(this.screenshot, 0, 0, orig.width, orig.height)

            images.push({
                path: GetOriginalPath(entry.Photo),
                blob: await new Promise(resolve => orig.toBlob(resolve, "image/jpeg", 0.9))
            });

            UploadImages(images)
            $("#imgtable").hide()


            if (entry.uid === bhs.user.uid) {
                $("#dltab-" + entry.type).click()

                let loc = $("#displayPanels #list-" + entry.type)
                loc = loc.find("#row-" + entry.id + " img")
                if (loc.length > 0) {
                    let url = thumb.toDataURL()
                    loc.attr("src", url)

                    $('html, body').animate({
                        scrollTop: $("#id-table").offset().top
                    }, 500)
                }
            }
        }

        this.clearPanel()
    }

    async updateEntry(entry) {
        entry.modded = Timestamp.now()
        this.initVotes(entry)
        let created = false

        if (typeof entry.created === "undefined" || !entry.created) {
            entry.created = Timestamp.now()
            created = true
        }

        let ref

        if (typeof entry.id === "undefined" || !entry.id || created) {
            let d

            do {
                entry.id = uuidv4() + "2" // add char to make sure we don't generate over old image uuids
                ref = doc(bhs.fs, "nmsceCombined/" + entry.id)
                d = await getDoc(ref)
            } while (d.exists())
        }

        if (!entry.Photo)
            entry.Photo = entry.id + ".jpg"

        if (!ref)
            ref = doc(bhs.fs, "nmsceCombined/" + entry.id)

        setDoc(ref, entry).then(() => {
            this.last = {}

            if (entry.uid === bhs.user.uid) {
                this.last = mergeObjects({}, entry)

                if (created) {
                    this.entries[entry.type].push(entry)
                    this.incrementTotals(entry, 1)
                    entry.Photo = null  // force screenshot write
                } else {
                    let e = this.entries[entry.type].findIndex(x => x.id === entry.id)
                    this.entries[entry.type][e] = entry
                }

                this.displayListEntry(entry)    // before update screenshot because it creates the display space
                this.updateScreenshot(entry)

                bhs.status(entry.type + " " + entry.Name + " saved.")
            }
            else if (bhs.isRole("admin")) {
                this.updateScreenshot(entry)

                bhs.status("Admin " + entry.type + " " + entry.Name + " saved.")
                bhs.setAdmin(false)
            }
        }).catch(err => {
            bhs.status("ERROR: " + err)
        })
    }

    initVotes(entry) {
        if (typeof entry.votes === "undefined") {
            entry.votes = {}
            entry.votes.clickcount = 0
            entry.votes.visited = 0
            entry.votes.report = 0
            entry.votes.favorite = 0
            entry.votes.edchoice = 0
            entry.votes.bhspoi = 0
            entry.votes.hof = 0
            entry.votes.patron = 0
        }
    }

    incrementTotals(e, val) {
        let t = {}
        t[e.type] = increment(val)

        let ref = doc(bhs.fs, "users", bhs.user.uid)
        setDoc(ref, {
            nmsceTotals: t
        }, {
            merge: true
        }).then(() => {
            bhs.user.nmsceTotals[e.type]++
            this.updateTotals()
        }).catch(err => {
            bhs.status("ERROR: " + err.message)
        })
    }

    getEntries() {
        if (typeof this.entries === "undefined")
            this.entries = {}

        for (let obj of objectList) {
            this.entries[obj.name] = []
            this.clearDisplayList(obj.name)

            let qury = query(collection(bhs.fs, "nmsceCombined"),
                where("uid", "==", bhs.user.uid),
                where("type", "==", obj.name),
                orderBy("created", "desc"),
                limit(25));
            this.getWithObserver(null, qury, obj.name, true, this.displayList.bind(this))
        }
    }

    buildResultsList() {
        let nav = `
        <a id="dltab-idname" class="nav-item nav-link txt-def h5 rounded-top" style="border-color:black;" 
            data-toggle="tab" href="#dl-idname" role="tab" aria-controls="dl-idname" aria-selected="false">
            title
        </a>`
        let header = `
        <div id="dl-idname" class="tab-pane hidden pl-15 pr-15" role="tabpanel" aria-labelledby="dltab-idname">
            <div id="list-idname" class="scroll row" style="height:500px"></div>
        </div>`
        // let ck = `
        // <label class="txt-label-def pl-10">
        //     <input id="ck-hideself" type="checkbox" onchange="nmsce.hideSelf(this)">
        //     Hide my entries&nbsp;
        // </label>`

        this.entries = {}

        for (let obj of resultTables) {
            let l = /idname/g[Symbol.replace](nav, obj.name.nameToId())
            l = /title/[Symbol.replace](l, obj.name)

            if (obj.hidden)
                l = /h6/[Symbol.replace](l, "h6 hidden")

            $("#displayTabs").append(l)

            l = /idname/g[Symbol.replace](header, obj.name.nameToId())

            $("#displayPanels").append(l)
        }

        // $("#displayTabs").append(ck)

        let height = $("html")[0].clientHeight - 100
        $("#displayPanels .scroll").height(height + "px")
    }

    getTotals() {
        getDoc(doc(bhs.fs, "bhs/nmsceTotals")).then(doc => {
            if (doc.exists())
                this.displayTotals(doc.data(), "bhs/nmsceTotals")
        })

        // getDoc(doc(bhs.fs, "bhs/nmsceMonthly")).then(doc => {
        //     if (doc.exists())
        //         this.displayTotals(doc.data(), "bhs/nmsceMonthly")
        // })

        // getDoc(doc(bhs.fs, "bhs/patreon")).then(doc => {
        //     if (doc.exists())
        //         this.displayPatron(doc.data(), "bhs/patreon")
        // })
    }

    // buildPatron() {
    //     const header = `
    //     <div id="patronCard" class="card">
    //         <div class="card-header pl-15 txt-def">
    //             <div class="row">
    //                 <div class="col-4">Thanks To All Our Supporters!</div>
    //                 <div class="col-3">
    //                     <a href="https://www.patreon.com/bePatron?u=28538540" style="background-color:red; color:white; border-radius:12px">&nbsp;&nbsp;Become a Patron!&nbsp;&nbsp;</a>
    //                 </div>
    //                 <!--div class="col-5">You can also get patron benefits by entering data.&nbsp;
    //                     <i class="bx bx-help-circle text-danger h6" data-toggle="tooltip" data-html="true"
    //                         data-placement="top" title="T1 benefits for 25 items/month, T2-75 items, T3-150 items.">
    //                     </i>
    //                 </div-->
    //             </div>
    //             <br>
    //             <div class="row h6 border-top">
    //                 <div class="col-4">Name</div>
    //                 <div class="col-sm-2 pl-15">Date Joined</div>
    //             </div>
    //         </div>
    //         <div id="patronList" class="card-body scroll txt-black" style="height:600px"></div>
    //     </div>`

    //     let loc = $("#dl-Patrons")
    //     loc.find("#list-Patrons").remove()
    //     loc.append(header)
    // }

    // displayPatron(list) {
    //     const rows = `
    //     <div id="row-uid" class="border-bottom h6">
    //         <div class="row">
    //             <div id="id-name" class="col-3">dname</div>
    //             <div id="id-date" class="col-sm-2 txt-right">ddate</div>
    //         </div>
    //     </div>`

    //     let loc = $("#patronCard")
    //     let l = loc.find("#patronList")

    //     let k = Object.keys(list)
    //     for (let u of k) {
    //         let e = list[u]

    //         let h = /uid/[Symbol.replace](rows, k)
    //         h = /dname/[Symbol.replace](h, e.name)
    //         h = /ddate/[Symbol.replace](h, e.start.toDate().toDateLocalTimeString().slice(0, 10))

    //         l.append(h)
    //     }

    //     this.sortTotals(null, "id-name", "patronList")
    // }

    buildTotals() {
        const header = `
        <div id="totalsCard" class="row">
            <div class="col-md-9 col-14">
                <div class="card">
                    <div class="card-header pl-15 txt-def">
                        <div class="row">
                            <!--div class="col-3">
                                <label>
                                    <input id="ck-idname" type="checkbox" onclick="nmsce.showModTotals(this)">
                                    &nbsp;Show All
                                </label>
                            </div-->
                            <!--div class="col-5">You can get patron benefits by entering data.&nbsp;
                                <i class="bx bx-help-circle text-danger h6" data-toggle="tooltip" data-html="true"
                                    data-placement="top" title="T1 benefits for 25 items/month, T2-75 items, T3-150 items.">
                                </i>
                            </div-->
                        </div>
                        <div class="row">
                            <div id="id-name" class="col-sm-9 pointer" onclick="nmsce.sortTotals(this)">Player&nbsp;&nbsp;<i class="bx bx-sort-down"></i></div>
                            <div id="id-total" class="col-sm-2 pointer" onclick="nmsce.sortTotals(this)">Overall&nbsp;&nbsp;<i class="bx bx-sort-up"></i></div>
                            <!--div id="id-monthly" class="col-sm-2 pointer" onclick="nmsce.sortTotals(this)">Monthly&nbsp;&nbsp;<i class="bx bx-sort-up"></i></div-->
                        </div>
                    </div>
                    <div id="userTotals" class="card-body scroll txt-black" style="height:600px"></div>
                </div>
            </div>
            <div class="col-md-5 col-14">
                <div class="card">
                    <div class="card-header pl-15 txt-def">Totals</div>
                    <div id="totalsTable" class="txt-black pl-15"></div>
                </div>
            </div>
        </div>`

        let loc = $("#dl-Totals")
        loc.find("#list-Totals").remove()
        loc.append(header)
    }

    displayTotals(list, path) {
        const rows = `
        <div id="row-uid" name="ismod" class="border-bottom h6">
            <div class="row pointer" onclick="nmsce.expandTotals(this)">
                <div id="id-name" class="col-8"><i class="bx bx-caret-down-square txt-input"></i> nameS</div>
                <div id="id-total" class="col-sm-2 txt-right">totalT</div>
                <!--div id="id-monthly" class="col-sm-2 txt-right">monthlyT</div-->
            </div>
            <div id="id-exp" class="row hidden" onclick="nmsce.expandTotals(this)">
                <div id="id-details">detailT</div>
            </div>
        </div>`
        const totals = `
        <div class="row">
            <div class="col-5">name</div>
            <div id="id-name" class="col-3">qty</div>
        </div>`

        let loc = $("#totalsCard")

        for (let k of Object.keys(list)) {
            let e = list[k]
            if (typeof e.name !== "undefined") {
                let t = 0
                let s = ""

                for (let k of Object.keys(e))
                    if (k !== "Living-Ship" && typeof e[k] === "number") {
                        t += e[k]
                        s += k + ": " + e[k] + " "
                    }

                let l = loc.find("#row-" + k)

                if (l.length === 0) {
                    let h = /uid/[Symbol.replace](rows, k)
                    h = /nameS/[Symbol.replace](h, e.name)
                    h = /detailT/[Symbol.replace](h, s)
                    // if (e.name === "Bad Wolf") {    //was e.mod
                    //     h = /ismod/[Symbol.replace](h, "modT")
                    //     h = /border-bottom/[Symbol.replace](h, "border-bottom hidden")
                    // }

                    if (path === "bhs/nmsceTotals") {
                        h = /totalT/[Symbol.replace](h, t)
                        // h = /monthlyT/[Symbol.replace](h, "")
                    }
                    // else if (path === "bhs/nmsceMonthly") {
                    //     h = /totalT/[Symbol.replace](h, "")
                    //     // h = /monthlyT/[Symbol.replace](h, t + " " + (t > 150 ? "T3" : t > 75 ? "T2" : t > 30 ? "T1" : ""))
                    // }

                    l = loc.find("#userTotals")
                    l.append(h)
                } else {
                    $(l).find("#id-details").text(s)
                    if (path === "bhs/nmsceTotals")
                        $(l).find("#id-total").text(t)
                    // else if (path === "bhs/nmsceMonthly")
                    //     $(l).find("#id-monthly").text(t + " " + (t > 150 ? "T3" : t > 75 ? "T2" : t > 30 ? "T1" : ""))
                }
            } else if (typeof e === "number" && path === "bhs/nmsceTotals" && k !== "Total") {
                let l = loc.find("#id-" + k)
                if (l.length === 0) {
                    let h = /name/g[Symbol.replace](totals, k)
                    h = /qty/[Symbol.replace](h, e)

                    let l = loc.find("#totalsTable")
                    l.append(h)
                } else
                    l.text(e)
            }
        }

        if (path === "bhs/nmsceTotals") {
            let l = loc.find("#id-Total")
            if (l.length === 0) {
                let l = loc.find("#totalsTable")
                let h = /name/g[Symbol.replace](totals, "Total")
                h = /qty/[Symbol.replace](h, list.Total)
                h = /row/[Symbol.replace](h, "row border-top")
                l.append(h)
            }
        }

        this.sortTotals(null, "id-name")
    }

    showModTotals(evt) {
        if ($(evt).prop("checked"))
            $("#totalsCard [name='modT']").show()
        else
            $("#totalsCard [name='modT']").hide()
    }

    sortTotals(evt, id, parent) {
        let sort = typeof id !== "undefined" ? id : $(evt).attr("id")
        let loc = $(typeof parent === "undefined" ? "#userTotals" : "#" + parent)
        let list = loc.children()

        switch (sort) {
            case "id-name":
                list.sort((a, b) => {
                    a = $(a).find("#" + sort).text().stripMarginWS().toLowerCase()
                    b = $(b).find("#" + sort).text().stripMarginWS().toLowerCase()
                    return a > b ? 1 : -1
                })
                break
            case "id-total":
            case "id-monthly":
                list.sort((a, b) => {
                    a = $(a).find("#" + sort).text().stripMarginWS()
                    a = a === "" ? 0 : parseInt(a)
                    b = $(b).find("#" + sort).text().stripMarginWS()
                    b = b === "" ? 0 : parseInt(b)
                    return b - a
                })
                break
        }

        loc.empty()
        loc.append(list)
    }

    expandTotals(evt) {
        let loc = $(evt).parent()
        let exp = loc.find(".bx-caret-down-square")
        if (exp.length > 0) {
            exp.removeClass("bx-caret-down-square").addClass("bx-caret-up-square")
            loc.find("#id-exp").show()
        } else {
            loc.find(".bx-caret-up-square").removeClass("bx-caret-up-square").addClass("bx-caret-down-square")
            loc.find("#id-exp").hide()
        }
    }

    fcnObserver(loc, fcn) {
        if (window.IntersectionObserver) {
            var io = new IntersectionObserver(
                evts => {
                    let run = null
                    for (let evt of evts)
                        if (evt.isIntersecting) {
                            run = evt
                            io.unobserve(evt.target)
                        }

                    if (run)
                        fcn(run)
                }, {
                root: loc[0],
                rootMargin: '0px 0px 0px 0px',
                threshold: 0.1
            }
            )
        }

        return io
    }

    getWithObserver(evt, ref, type, cont, dispFcn) {
        const getSnapshot = (obs) => {
            if (typeof obs.entryObserver === "undefined")
                obs.entryObserver = this.fcnObserver($("#displayPanels"), this.getWithObserver.bind(this))

            let ref = obs.ref

            if (obs.last && obs.cont) {
                ref = query(ref, startAfter(obs.last))
                obs.last = null
                obs.run = true
            }

            if (obs.run) {
                obs.run = false

                getDocs(ref).then(snapshot => {
                    if (snapshot.empty) {
                        obs.cont = false
                        // obs.dispFcn([], obs.type) leave search tab open
                        return
                    }

                    let entries = []

                    for (let doc of snapshot.docs) {
                        let e = doc.data()
                        entries.push(e)
                    }

                    obs.dispFcn(entries, obs.type)
                    let loc = $("#list-" + obs.type)

                    for (let i of [0, 15, 30, 45])
                        if (i < entries.length) {
                            let rloc = loc.find("#row-" + entries[i].id)
                            if (rloc.length > 0)
                                obs.entryObserver.observe(rloc[0])
                        }

                    obs.last = snapshot.docs[snapshot.size - 1]
                })
            }
        }

        if (evt) {
            let type = $(evt.target).parent()
            let rows = type.find("img")
            type = type.attr("id").stripID()

            for (let loc of rows) {
                let data = $(loc).data()
                if (!$(loc).prop("src") && data.src)
                    $(loc).prop("src", data.src)
            }

            getSnapshot(this.observerList[type])

        } else if (ref) {
            if (typeof this.observerList === "undefined")
                this.observerList = {}

            type = type.nameToId()

            if (typeof this.observerList[type] === "undefined")
                this.observerList[type] = {}

            let obs = this.observerList[type]
            obs.type = type
            obs.ref = ref
            obs.dispFcn = dispFcn
            obs.last = null
            obs.run = true
            obs.cont = cont

            getSnapshot(obs)
        }
    }

    getResultsLists(type) {
        if (type === "My Favorites") {
            if (bhs.user.uid) {
                let i = getIndex(resultTables, "name", type)
                let r = resultTables[i]

                this.entries[r.name.nameToId()] = []
                $("#dltab-My-Favorites").show()

                let qury = query(collectionGroup(bhs.fs, "votes"),
                    where("uid", "==", bhs.user.uid),
                    where("favorite", "==", 1),
                    orderBy("created", "desc"),
                    limit(r.limit));

                this.getWithObserver(null, qury, r.name, r.cont, this.displayResultList, {
                    source: "server"
                })
            }
        } else
            for (let r of resultTables) {
                if (r.field) {
                    this.entries[r.name.nameToId()] = []
                    let qury = query(collection(bhs.fs, "nmsceCombined"), orderBy(r.field, "desc"), limit(r.limit))

                    this.getWithObserver(null, qury, r.name, r.cont, this.displayResultList, {
                        source: "server"
                    })
                }
            }
    }

    displayResultList(entries, type) {
        if (!entries || entries.length === 0)
            return

        // let hideSelf = $("#ck-hideself").prop("checked")

        let h = ""
        let loc = $("#displayPanels #list-" + type.nameToId())

        for (let e of entries) {
            if (e.private && e.uid !== bhs.user.uid && !bhs.hasRole("admin") && !bhs.hasRole("nmsceEditor"))
                continue

            if (type === "My-Favorites")
                e.favorite = 1
            else if (bhs.user.uid)
                nmsce.getVotes(e)

            if (type === "Top-Favorites" && e.votes.favorite < 1)
                continue

            // if (type === "Hall-of-Fame" && e.votes.hof < 1)
            //     continue

            // if (type === "Patron-Favorites" && e.votes.patron < 1)
            //     continue

            nmsce.entries[type].push(e)

            let l = /idname/g[Symbol.replace](resultsItem, e.id)
            l = /galaxy/[Symbol.replace](l, e.galaxy)
            l = /imgsrc/[Symbol.replace](l, GetThumbnailUrl(e.Photo))
            l = /byname/[Symbol.replace](l, e._name)
            l = /date/[Symbol.replace](l, e.created ? new Timestamp(e.created.seconds, e.created.nanoseconds).toDate().toDateLocalTimeString() : "")
            l = /grey/[Symbol.replace](l, e.favorite ? "#00c000" : "grey")

            if (e.private)
                l = /bkg-white/[Symbol.replace](l, "bkg-yellow")

            // if (type === "Latest" && bhs.user.uid === e.uid && hideSelf)
            //     l = /rounded/[Symbol.replace](l, "rounded hidden")

            h += l
        }

        loc.append(h)
    }

    async vote(evt) {
        if (bhs.user.uid) {
            let type = $(evt).closest("[id|='dl']").attr("id").stripID()
            let voting = $(evt).attr("id").split("-")[0]

            if (type !== "Selected") {
                let id = $(evt).attr("id").stripID()
                id = getIndex(this.entries[type], "id", id)
                this.last = this.entries[type][id]
            }

            let ref = doc(bhs.fs, "nmsceCombined/" + this.last.id)
            getDoc(doc(collection(ref, "votes"), bhs.user.uid)).then(res => {
                let e = {}
                let v = 1

                if (res.exists()) {
                    e = res.data()
                    v = e[voting] ? 0 : 1
                }

                e[voting] = v
                this.last[voting] = v

                e.uid = bhs.user.uid
                e.id = this.last.id
                e.galaxy = this.last.galaxy
                e.Photo = this.last.Photo
                e._name = this.last._name
                e.created = new Timestamp(this.last.created.seconds, this.last.created.nanoseconds)
                e.voted = Timestamp.now()
                e.type = this.last.type
                if (typeof this.last.Type !== "undefined")
                    e.Type = this.last.Type

                setDoc(res.ref, e, {
                    merge: true
                })

                e = {}
                e[voting] = increment(v ? 1 : -1)

                setDoc(ref, {
                    votes: e
                }, {
                    merge: true
                })

                if (type === "Selected")
                    this.showVotes(this.last)
                else
                    this.showResultsVotes(this.last)
            })
        }
    }

    selectResult(evt) {
        let type = $(evt).closest("[id|='list']").attr("id").stripID()
        let id = $(evt).closest("[id|='row']").attr("id").stripID()

        let i = getIndex(this.entries[type], "id", id)
        let e = this.entries[type][i]

        this.displaySelected(e)

        if (bhs.user.uid && (e.uid === bhs.user.uid || bhs.hasRole("admin") || bhs.hasRole("nmsceEditor")))
            $("#btn-ceedit").show()
        else
            $("#btn-ceedit").hide()

        $("#dltab-Selected").show()
        $("#dltab-Selected").click()
    }

    displaySelected(e) {
        let row = `
            <div id="id-idname" class="row border-bottom txt-label-def">
                <div class="col-5">title</div>
                <div id="val-idname" class="col font clr-def">value</div>
            </div>`

        $("#imgtable").show()

        this.last = e

        let link = `/preview?i=${e.id}`
        $("[id|='permalink']").attr("href", link)

        let idx = getIndex(objectList, "name", e.type)
        let obj = objectList[idx]

        $("#dispimage").prop("src", GetDisplayUrl(e.Photo))

        let loc = $("#imagedata")
        loc.empty()

        let h = /idname/g[Symbol.replace](row, "Type")
        h = /title/[Symbol.replace](h, "Type")
        h = /font/[Symbol.replace](h, "")
        h = /value/[Symbol.replace](h, e.type)
        loc.append(h)

        for (let fld of obj.imgText) {
            let h = /idname/g[Symbol.replace](row, fld.name.nameToId())
            h = /title/[Symbol.replace](h, fld.name)
            h = /value/[Symbol.replace](h, fld.name === "Glyphs" ? addrToGlyph(e[fld.field], e["Planet-Index"]) : e[fld.field])
            h = /font/[Symbol.replace](h, fld.font ? fld.font === "NMS Glyphs" ? "glyph" : fld.font : "")
            loc.append(h)
        }

        for (let fld of obj.fields) {
            let id = fld.name.nameToId()
            if ((fld.imgText || fld.searchText) && typeof e[id] !== "undefined" && e[id] !== -1 && e[id] !== "") {
                let h = /idname/g[Symbol.replace](row, id)
                h = /title/[Symbol.replace](h, fld.name)

                if (fld.type === "tags") {
                    let t = ""
                    let k = Object.keys(e[id])

                    for (let i of k)
                        t += i + " "

                    h = /value/[Symbol.replace](h, t)
                } else
                    h = /value/[Symbol.replace](h, e[id])

                h = /font/[Symbol.replace](h, "")
                loc.append(h)
            }

            if (typeof fld.sublist !== "undefined") {
                for (let sub of fld.sublist) {
                    let id = sub.name.nameToId()
                    if (sub.imgText && typeof e[id] !== "undefined" && e[id] !== -1 && e[id] !== "") {
                        let h = /idname/g[Symbol.replace](row, id)
                        h = /title/[Symbol.replace](h, sub.name)
                        h = /value/[Symbol.replace](h, e[id])
                        h = /font/[Symbol.replace](h, "")
                        loc.append(h)
                    }
                }
            }
        }

        h = /idname/g[Symbol.replace](row, "Created")
        h = /title/[Symbol.replace](h, "Date")
        h = /value/[Symbol.replace](h, e.created ? new Timestamp(e.created.seconds, e.created.nanoseconds).toDate().toDateLocalTimeString() : "")
        h = /font/[Symbol.replace](h, "")
        loc.append(h)

        h = /idname/g[Symbol.replace](row, "Version")
        h = /title/[Symbol.replace](h, "Version")
        h = /value/[Symbol.replace](h, e.version)
        h = /font/[Symbol.replace](h, "")
        loc.append(h)

        if (e.redditlink) {
            let h = /idname/g[Symbol.replace](row, "link")
            h = /title/[Symbol.replace](h, "")
            h = /value/[Symbol.replace](h, "<a href='" + e.redditlink + "'>Reddit Post Link</a>")
            h = /font/[Symbol.replace](h, "")
            loc.append(h)
        }

        nmsce.showVotes(e)
    }

    getVotes(entry) {
        if (!entry.favorite)
            getDoc(doc(bhs.fs, "nmsceCombined/" + entry.id + "/votes/" + bhs.user.uid)).then(doc => {
                if (doc.exists()) {
                    let e = doc.data()

                    entry.favorite = e.favorite
                    // entry.edchoice = e.edchoice
                    // entry.bhspoi = e.bhspoi
                    // entry.visited = e.visited
                    // entry.report = e.report
                    // entry.hof = e.hof
                    // entry.patron = e.patron

                    this.showResultsVotes(entry)
                }
            })
    }

    showResultsVotes(entry) {
        let loc = $("[id|='favorite-" + entry.id + "']")
        for (let l of loc)
            if (typeof entry !== "undefined")
                $(l).css("color", entry.favorite ? "#00c000" : "grey")
            else
                $(l).css("color", "grey")
    }

    showVotes(entry) {
        const shvote = function (loc, tf) {
            if (tf) {
                loc.removeClass("bx-square")
                loc.addClass("bx-check-square")
                loc.css("color", "#00c000")
            } else {
                loc.removeClass("bx-check-square")
                loc.addClass("bx-square")
                loc.css("color", "grey")
            }
        }

        if (bhs.user.uid) {
            $("#favorite").show()
            // $("#voted-report").show()

            if (typeof entry !== "undefined") {
                $("#favorite").css("color", entry.favorite ? "#00c000" : "grey")
                // shvote($("#voted-edchoice"), entry.edchoice)
                // shvote($("#voted-bhspoi"), entry.bhspoi)
                // shvote($("#voted-visited"), entry.visited)
                // shvote($("#voted-report"), entry.report)
                // shvote($("#voted-hof"), entry.hof)
                // shvote($("#voted-patron"), entry.patron)
            } else {
                $("#favorite").css("color", "grey")
                // shvote($("#voted-edchoice"), false)
                // shvote($("#voted-bhspoi"), false)
                // shvote($("#voted-visited"), false)
                // shvote($("#voted-report"), false)
                // shvote($("#voted-hof"), false)
                // shvote($("#voted-patron"), false)
            }
        } else {
            $("#favorite").hide()
            // $("#voted-report").hide()
        }
    }

    showAll() {
        let loc = $("#id-table")
        loc.find("[id|='row']").show()
    }

    buildDisplayList() {
        let nav = `
        <a id="dltab-idname" class="nav-item nav-link txt-def h6 rounded-top" style="border-color:black;" 
            data-toggle="tab" href="#dl-idname" role="tab" aria-controls="dl-idname" aria-selected="false">
            title&nbsp;(<span id="tot-idname"></span>)
        </a>`
        let header = `
        <div id="dl-idname" class="tab-pane hidden pl-15 pr-15" role="tabpanel" aria-labelledby="dltab-idname">
            <div id="list-idname" class="scroll row" style="height:600px"></div>
        </div>`

        let l = /idname/g[Symbol.replace](nav, "Search-Results")
        l = /title/[Symbol.replace](l, "Search Results")
        l = l.replace(/(.*?)\(.*\)/, "$1")
        $("#displayTabs").append(l)
        $("#dltab-Search-Results").hide()

        l = /idname/g[Symbol.replace](header, "Search-Results")
        $("#displayPanels").append(l)

        for (let obj of objectList) {
            let type = obj.name

            let l = /idname/g[Symbol.replace](nav, type)
            l = /title/[Symbol.replace](l, type.idToName())
            $("#displayTabs").append(l)

            l = /idname/g[Symbol.replace](header, type)
            $("#displayPanels").append(l)

            let loc = $("#displayPanels #list-" + type)
            this.addDisplayListEntry(type, loc)
        }

        let height = $("html")[0].clientHeight - 100
        $("#displayPanels .scroll").height(height + "px")
    }

    clearDisplayList(type) {
        let loc = $("#displayPanels #list-" + type)
        loc.empty()
    }

    displayList(entries, type) {
        let loc = $("#displayPanels #list-" + type)

        for (let e of entries) {
            this.entries[type].push(e)
            this.addDisplayListEntry(e, loc, false, type)
        }
    }

    displayListEntry(entry) {
        let loc = $("#displayPanels #list-" + entry.type)
        let eloc = loc.find("#row-" + entry.id)
        // let all = $("#displayPanels #list-All")
        // let aloc = all.find("#row-" + entry.id)

        if (eloc.length === 0) {
            this.addDisplayListEntry(entry, loc, true)
            // this.addDisplayListEntry(entry, all, true)
        } else {
            this.updateDisplayListEntry(entry, eloc)
            // this.updateDisplayListEntry(entry, aloc)
        }
    }

    sortLoc(evt) {
        let id = $(evt).attr("id")
        let name = id.stripID()
        let loc = $(evt).closest("[id|='list']")
        let row = loc.find("#row-key")
        let key = row[0].outerHTML
        row.remove()

        let list = loc.children()
        switch (name) {
            case "Favorite":
            case "Editors-Choice":
            case "Visited":
            case "Slots":
                list.sort((a, b) => {
                    let av = $(a).find("#" + id).text().stripMarginWS()
                    let bv = $(b).find("#" + id).text().stripMarginWS()
                    let x = parseInt(av)
                    let y = parseInt(bv)
                    return y - x
                })
                break
            case "Height":
                list.sort((a, b) => {
                    let av = $(a).find("#" + id).text().stripMarginWS()
                    let bv = $(b).find("#" + id).text().stripMarginWS()
                    let x = parseFloat(av)
                    let y = parseFloat(bv)
                    return y - x
                })
                break
            case "Class":
                list.sort((a, b) => {
                    let av = $(a).find("#" + id).text().stripMarginWS()
                    let bv = $(b).find("#" + id).text().stripMarginWS()
                    let x = "SABC".indexOf(av)
                    let y = "SABC".indexOf(bv)
                    return x - y
                })
                break
            case "Modified":
            case "Created":
                list.sort((a, b) => {
                    let av = new Date($(a).find("#" + id).text().stripMarginWS())
                    let bv = new Date($(b).find("#" + id).text().stripMarginWS())
                    return bv - av
                })
                break
            case "Seed":
            case "Posted":
                list.sort((a, b) => {
                    let av = $(a).find("#" + id).text().stripMarginWS().toLowerCase()
                    let bv = $(b).find("#" + id).text().stripMarginWS().toLowerCase()
                    return av > bv ? -1 : av < bv ? 1 : 0
                })
                break
            default:
                list.sort((a, b) => {
                    let av = $(a).find("#" + id).text().stripMarginWS().toLowerCase()
                    let bv = $(b).find("#" + id).text().stripMarginWS().toLowerCase()
                    return av > bv ? 1 : av < bv ? -1 : 0
                })
                break
        }

        loc.empty()
        loc.append(key)
        loc.append(list)
    }

    addDisplayListEntry(e, loc, prepend, type) {
        const key = `
        <div id="row-key" class="col-md-p250 col-sm-p333 col-sm-7 border border-black txt-def" >
            <div class="row">`

        const row = `     
        <div id="row-idname" class="col-md-p250 col-sm-p333 col-sm-7 border border-black h6" >
            <div id="id-Photo" class="row pointer pl-10 pr-10" data-type="etype" data-id="eid" onclick="nmsce.selectList(this)" style="min-height:20px">
                <img id="img-idname" src="imgsrc" style="width: 100%">
            </div>
            <div class="row pl-10">`
        const item = `<div id="id-idname" class="col-md-7 col-sm-14 border pointer">title</div>`
        const glyphs = `<div id="id-idname" class="col-md-7 col-sm-14 border pointer txt-glyph-disp" style="font-size:.75rem">title</div>`
        const sortItem = `<div id="id-idname" class="col-md-7 col-sm-14 border pointer" onclick="nmsce.sortLoc(this)">title</div>`
        const end = `</div></div>`

        let h = ""
        let fstring = typeof e === "string"
        let itm = item

        if (fstring) {
            h = key
            itm = sortItem
        } else {
            h = /etype/[Symbol.replace](row, e.type.nameToId())
            if (e.private)
                h = /black/[Symbol.replace](h, "black bkg-yellow")
            h = /idname/[Symbol.replace](h, e.id)
            h = /eid/[Symbol.replace](h, e.id)
            h = /imgsrc/[Symbol.replace](h, GetThumbnailUrl(e.Photo))
        }

        let l = /idname/g[Symbol.replace](itm, "galaxy")
        l = /pointer/[Symbol.replace](l, "")
        h += /title/[Symbol.replace](l, e.galaxy)

        let i = getIndex(objectList, "name", fstring ? e : e.type)
        for (let f of objectList[i].fields) {
            let id = f.name.nameToId()
            let title = ""

            if (fstring)
                title = f.name
            else if (typeof e[f.name] === "undefined")
                title = ""
            else if (f.type === "tags") {
                let keys = Object.keys(e[f.name])
                title = ""
                for (let k of keys) {
                    if (typeof e[f.name][k] !== "boolean" || e[f.name][k])
                        title += k + " "
                }
            } else
                title = e[f.name]

            if (f.type !== "img" && f.type !== "map") {
                let l = /idname/g[Symbol.replace](itm, id)
                if (!fstring)
                    l = /pointer/[Symbol.replace](l, "")

                h += /title/[Symbol.replace](l, title)

                if (typeof f.sublist !== "undefined")
                    for (let s of f.sublist) {
                        let id = s.name.nameToId()
                        let title = ""

                        if (fstring)
                            title = s.name
                        else if (typeof e[s.name] === "undefined")
                            title = ""
                        else if (s.type === "tags") {
                            let keys = Object.keys(e[s.name])
                            title = ""
                            for (let k of keys) {
                                if (typeof e[s.name][k] !== "boolean" || e[s.name][k])
                                    title += k + " "
                            }
                        } else
                            title = e[s.name]

                        if (s.type !== "img" && s.type !== "map") {
                            let l = /idname/g[Symbol.replace](itm, id)
                            h += /title/[Symbol.replace](l, title)
                        }
                    }
            }
        }

        if (fstring) {
            let l = /idname/g[Symbol.replace](itm, "Favorited")
            h += /title/[Symbol.replace](l, "Favorited")
            l = /idname/g[Symbol.replace](itm, "Created")
            h += /title/[Symbol.replace](l, "Created")
            l = /idname/g[Symbol.replace](itm, "Modified")
            h += /title/[Symbol.replace](l, "Modified")
            l = /idname/g[Symbol.replace](itm, "Posted")
            h += /title/[Symbol.replace](l, "Posted")
        } else {
            let l = /idname/g[Symbol.replace](itm, "Created")
            l = /pointer/[Symbol.replace](l, "")
            h += /title/[Symbol.replace](l, e.created ? "Created " + new Timestamp(e.created.seconds, e.created.nanoseconds).toDate().toDateLocalTimeString() : "")
            l = /idname/g[Symbol.replace](itm, "Modified")
            l = /pointer/[Symbol.replace](l, "")
            h += /title/[Symbol.replace](l, e.modded ? "Modified " + e.modded.toDate().toDateLocalTimeString() : "")
            l = /idname/g[Symbol.replace](itm, "Posted")
            l = /pointer/[Symbol.replace](l, "")
            h += /title/[Symbol.replace](l, e.reddit && typeof e.reddit.toDate !== "undefined" ? "Posted " + e.reddit.toDate().toDateLocalTimeString() : e.redditlink ? "Posted" : "")
        }

        h += end

        if (prepend) {
            let key = loc.find("#row-key")
            if (key.length === 0)
                loc.prepend(h)
            else
                key.after(h)
        } else {
            loc.append(h)
            loc = loc.find("#row-" + e.id + " img")

            loc.attr("src", GetThumbnailUrl(e.Photo))
        }
    }

    updateDisplayListEntry(e, loc) {
        let i = getIndex(objectList, "name", e.type)
        for (let f of objectList[i].fields) {
            let id = f.name.nameToId()
            let title = ""

            if (typeof e[f.name] === "undefined")
                title = ""
            else if (f.type === "tags") {
                let keys = Object.keys(e[f.name])
                for (let k of keys)
                    if (typeof e[f.name][k] !== "boolean" || e[f.name][k])
                        title += k + " "
            } else
                title = e[f.name]

            if (f.type !== "img" && f.type !== "map") {
                let floc = loc.find("#id-" + id)
                if (floc.length > 0)
                    floc.text(title)

                if (typeof f.sublist !== "undefined")
                    for (let s of f.sublist) {
                        let id = s.name.nameToId()
                        let title = ""

                        if (typeof e[s.name] === "undefined")
                            title = ""
                        else if (s.type === "tags") {
                            let keys = Object.keys(e[s.name])
                            for (let k of keys)
                                if (typeof e[s.name][k] !== "boolean" || e[s.name][k])
                                    title += k + " "
                        } else
                            title = e[s.name]

                        if (s.type !== "img" && s.type !== "map") {
                            let floc = loc.find("#id-" + id)
                            if (floc.length > 0)
                                floc.text(title)
                        }
                    }
            }
        }
    }

    toggleSearch(evt) {
        if ($(evt).find(".bx-caret-down-square").is(":visible")) {
            $("#searchPanel").show()
            $(evt).find(".bx-caret-up-square").show()
            $(evt).find(".bx-caret-down-square").hide()
        } else {
            $("#searchPanel").hide()
            $(evt).find(".bx-caret-up-square").hide()
            $(evt).find(".bx-caret-down-square").show()
        }
    }

    selectList(evt) {
        let id = $(evt).closest("[id|='row']").attr("id").stripID()
        let type = $(evt).closest("[id|='list']").attr("id").stripID()
        let i = getIndex(this.entries[type], "id", id)
        let e = this.entries[type][i]
        this.displaySingle(e)
    }
}

let txtcanvas = document.createElement('canvas');

function setRadio(loc, val) {
    loc.find("input").prop("checked", false)
    loc.find("input").data("last", false)

    if (val) {
        loc.find("#rdo-" + val.nameToId()).prop("checked", true)
        loc.find("#rdo-" + val.nameToId()).data("last", true)
    }
}

blackHoleSuns.prototype.status = function (str, clear) {
    if (clear)
        $("#status").empty()

    if (str !== "")
        $("#status").prepend(str + "</br>")
}

const mapColors = {
    hover: "#ffc000",
    selected: "#0000ff",
    disabled: "#c0c0c0",
    enabled: "#00a000",
    error: "#ff0000",
}

const clientIds = {
    nmsce: "8oDpVp9JDDN7ng",
    nmsge: "9Ukymj_MbqxWglSLm0kQqw",
    alpha: "8DNnTDRJMlG9ZecGVV44Ew",
    local: "vCekWEy1EPnRIy2zpu3EeA"
}
const currentLocation = location.href.split("?")[0];

let client_id = clientIds.nmsce;

if (currentLocation.includes("nmsge.com"))
    client_id = clientIds.nmsge;

if (currentLocation.includes("localhost"))
    client_id = clientIds.local;

if (currentLocation.includes("test-nms-bhs.firebaseapp.com"))
    client_id = clientIds.alpha;

const reddit = {
    client_id: client_id,
    redirect_url: currentLocation,
    scope: "identity,submit,mysubreddits,flair",
    auth_url: "https://www.reddit.com/api/v1/authorize",
    token_url: "https://ssl.reddit.com/api/v1/access_token",
    api_oauth_url: "https://oauth.reddit.com",
    subscriber_endpt: "/subreddits/mine/subscriber",
    user_endpt: "/api/v1/me",
    getflair_endpt: "api/link_flair_v2",
    submitLink_endpt: "/api/submit",
    comment_endpt: "/api/comment",
};

function updateImageText() {
    this.restoreImageText(null, true)
}

// Hack to make the function global. Should be avoided and code should be reformatted to not use it
window.setCursor = setCursor;
function setCursor(cursor) {
    $("body")[0].style.cursor = cursor
}

function setAsym(evt) {
    let id = $(evt.target).closest("[id|='slist']").attr("id")
    let row = $("#pnl-map #" + id)

    if (evt.target.checked && (fcedata || $(evt.target).attr("id") === "rdo-True"))
        row.find("#asym-checkmark").show()
    else
        row.find("#asym-checkmark").hide()
}

// Hack to make the function global. Should be avoided and code should be reformatted to not use it
window.toggleAsym = toggleAsym;
function toggleAsym(evt) {
    let ck = $(evt).closest("[id|='row']").find("#asym-checkmark")
    let id = $(evt).closest("[id|='slist']").attr("id")
    let row = $("#panels #" + id + " #row-Asymmetric")

    if (ck.is(":visible")) {
        setRadio(row, "False")
        $("[id='ck-Asymmetric']").prop("checked", false)
        $("[id='asym-checkmark']").hide()
    } else {
        setRadio(row, "True")
        $("[id='ck-Asymmetric']").prop("checked", true)
        $("[id='asym-checkmark']").show()
    }
}

function colorMapParts(pnlid) {
    for (let p of Object.keys(nmsce[pnlid]))
        if (p !== "type")
            colorMapPart(nmsce[pnlid][p])
}

function colorMapPart(part) {
    part.loc.find("*").css("stroke", mapColors[part.state])
}

function getPlanet(evt) {
    if (!fcedata)
        return

    let gal = bhs.getMenu($("#menu-Galaxy"))
    let addr = $("#panels #id-addr").val()
    let planet = $(evt.target ? evt.target : evt).val()

    if (gal === "" || addr === "" || planet <= 0) {
        $("[id='row-Planet-Name'] .bx-check").hide()
        return
    }

    $("[id='id-Planet-Index']").val(planet)

    let q = query(collection(bhs.fs, "nmsceCombined"),
        where("galaxy", "==", gal),
        where("addr", "==", addr),
        where("Planet-Index", "==", planet),
        where("Planet-Name", "!=", ""), limit(1));

    getDocs(q).then(snapshot => {
        if (!snapshot.empty) {
            let e = snapshot.docs[0].data()

            if (e["Planet-Name"] && e["Planet-Name"] !== "") {
                $("[id='id-Planet-Name']").val(e["Planet-Name"])
                $("[id='row-Planet-Name'] .bx-check").show()
                nmsce.restoreImageText(null, true)
            }
        } else
            $("[id='row-Planet-Name'] .bx-check").hide()
    })
}

function getEntry() {
    let addr = $("#panels #id-addr").val()
    let name = $(this).val()
    let type = $("#typePanels .active").attr("id").stripID()
    let gal = bhs.getMenu($("#menu-Galaxy"))

    if (gal && type && addr && name) {
        let q = query(collection(bhs.fs, "nmsceCombined"),
            where("galaxy", "==", gal),
            where("type", "==", type),
            where("Name", "==", name),
            where("addr", "==", addr))

        getDocs(q).then(snapshot => {
            if (!snapshot.empty) {
                nmsce.displaySingle(snapshot.docs[0].data(), true)
                $("#typePanels .active #row-Name .bx-check").show()
            }
        })
    }
}

const resultTables = [{
    name: "Search Results",
    limit: 25,
    hidden: true,
    cont: true,
}, {
    name: "My Favorites",
    limit: 25,
    hidden: true,
    cont: true,
}, {
    name: "Latest",
    field: "created",
    limit: 25,
    cont: true,
}, {
    name: "Top Favorites",
    field: "votes.favorite",
    limit: 25,
    // }, {
    //     name: "Patron Favorites",
    //     field: "votes.patron",
    //     limit: 20,
    // }, {
    //     name: "Top Visited",
    //     field: "votes.visited",
    //     limit: 20,
    // }, {
    //     name: "Moderators Choice",
    //     field: "votes.edchoice",
    //     limit: 20,
    // }, {
    //     name: "Hall of Fame",
    //     field: "votes.hof",
    //     limit: 20,
}, {
    name: "Totals",
    // }, {
    //     name: "Patrons",
},];

const objectList = [{
    name: "Ship",
    imgText: [{
        id: "#id-Player",
        field: "_name",
        name: "Player",
        type: "string",
        required: true,
    }, {
        id: "#id-Galaxy",
        field: "galaxy",
        name: "Galaxy",
        type: "menu",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Coords",
        type: "string",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        name: "Glyphs",
        field: "addr",
        font: "NMS Glyphs",
        type: "glyph",
    }, {
        field: "Economy",
        id: "#id-Economy",
        name: "Economy",
        type: "radio",
    }],
    fields: [{
        name: "Name",
        type: "string",
        search: true,
        imgText: true,
        onchange: getEntry,
        inputHide: true,
    }, {
        name: "Type",
        type: "menu",
        list: shipList, // fighter, shuttle, etc.
        ttip: "Select ship type to select ship size and parts.",
        required: true,
        search: true,
        sublist: [{
            name: "Parts",
            type: "map",
            sub: "bodies",
            search: true,
        },
        //  {
        //     name: "Parts-2",
        //     type: "map",
        //     sub: "wings",
        //     search: true,
        // }, 
        {
            name: "Slots",
            type: "radio",
            ttip: "slotTtip",
            sub: "slotList",
            imgText: true,
            search: true,
        }, {
            name: "Max Upgrade",
            type: "float",
            ttip: "upgradeTtip",
            sub: "upgradeTtip",
            // search: true,
            // query: ">=",
            imgText: true,
            inputHide: true,
        }, {
            name: "Asymmetric",
            type: "checkbox",
            sub: "asymmetric",
            onchange: setAsym,
            search: true,
            inputHide: true,
        }, {
            name: "First Wave",
            ttip: "This is <span class='h5' style='font-weight:bold'>ONLY</span> valid on space stations. First wave for reloading a save and restarting the game are different.",
            type: "radio",
            list: [{
                name: "Reload"
            }, {
                name: "Restart"
            }],
            imgText: true,
            search: true,
            inputHide: true,
            sub: "firstWave"
        }, {
            name: "Crashed",
            type: "checkbox",
            onchange: showLatLong,
            imgText: true,
            search: true,
            sub: "firstWave"
        }, {
            name: "Latitude",
            type: "float",
            imgText: true,
        }, {
            name: "Longitude",
            type: "float",
            imgText: true,
        }, {
            name: "Planet Name",
            type: "string",
            imgText: true,
        }, {
            name: "Planet Index",
            type: "number",
            range: 15,
            onchange: getPlanet,
            imgUpdate: true,
        }, {
            name: "Class",
            type: "radio",
            list: classList,
            imgText: true,
            sub: "classList"
        }, {
            name: "Reset Mission",
            type: "checkbox",
            search: true,
            imgText: true,
            ttip: "Find specific living ship by resetting mission log location while next to portal.",
            sub: "resetMission"
        }, {
            name: "Sail",
            ttip: "Translucent sail color.",
            type: "tags",
            search: true,
            list: colorList,
            max: 1,
            sub: "includeSail"
        }]
    }, {
        name: "Color",
        ttip: "Main body & wing colors. For colored chrome use the color + chrome.",
        type: "tags",
        search: true,
        searchExact: true,
        list: colorList,
        max: 4,
    }, {
        name: "Markings",
        ttip: "Any decals, stripes, etc.",
        type: "tags",
        search: true,
        // searchExact: true,
        list: colorList,
        max: 4,
    }, {
        name: "Tags",
        type: "tags",
        max: 4,
        imgText: true,
        search: true,
        inputHide: true,
    }, {
        name: "Seed",
        type: "string",
        searchText: true,
        ttip: "Found in save file. Can be used to reskin ship.",
        inputHide: true,
    }, {
        name: "Photo",
        type: "img",
        ttip: "Use this to upload a screenshot for glyph translation and/or the image for this entry.",
        // required: true,
    }]
}, {
    name: "Freighter",
    imgText: [{
        id: "#id-Player",
        field: "_name",
        name: "Player",
        type: "string",
        required: true,
    }, {
        id: "#id-Galaxy",
        field: "galaxy",
        name: "Galaxy",
        type: "menu",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Coords",
        type: "string",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        name: "Glyphs",
        field: "addr",
        font: "NMS Glyphs",
        type: "glyph",
    }, {
        field: "Economy",
        id: "#id-Economy",
        name: "Economy",
        type: "radio",
        list: economyListTier,
    }, {
        id: "#id-Lifeform",
        field: "life",
        name: "Lifeform",
        type: "radio",
        list: lifeformList,
    }],
    fields: [{
        name: "Name",
        type: "string",
        search: true,
        imgText: true,
        onchange: getEntry,
        inputHide: true,
    }, {
        name: "Seed",
        type: "string",
        searchText: true,
        ttip: "Found in save file. Can be used to reskin ship.",
        inputHide: true,
    }, {
        name: "Color",
        type: "tags",
        search: true,
        list: colorList,
        max: 4,
    }, {
        name: "Tags",
        type: "tags",
        max: 4,
        imgText: true,
        search: true,
        inputHide: true,
    }, {
        name: "Photo",
        type: "img",
        // required: true,
    }, {
        name: "Parts",
        type: "map",
        map: "/images/freighter-opt.svg",
        search: true,
    }]
}, {
    name: "Frigate",
    imgText: [{
        id: "#id-Player",
        field: "_name",
        name: "Player",
        type: "string",
        required: true,
    }, {
        id: "#id-Galaxy",
        field: "galaxy",
        name: "Galaxy",
        type: "menu",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Coords",
        type: "string",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        name: "Glyphs",
        field: "addr",
        font: "NMS Glyphs",
        type: "glyph",
    },],
    fields: [{
        name: "Name",
        type: "string",
        search: true,
        imgText: true,
        onchange: getEntry,
        inputHide: true,
    }, {
        name: "Type",
        type: "menu",
        list: frigateList,
        imgText: true,
        search: true,
    }, {
        name: "Color",
        type: "tags",
        list: colorList,
        max: 4,
        search: true,
    }, {
        name: "Tags",
        type: "tags",
        max: 4,
        imgText: true,
        search: true,
        inputHide: true,
    }, {
        name: "Photo",
        type: "img",
        // required: true,
    },]
}, {
    name: "Multi-Tool",
    imgText: [{
        id: "#id-Player",
        field: "_name",
        name: "Player",
        type: "string",
        required: true,
    }, {
        id: "#id-Galaxy",
        field: "galaxy",
        name: "Galaxy",
        type: "menu",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Coords",
        type: "string",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Glyphs",
        font: "NMS Glyphs",
        type: "glyph",
    },],
    fields: [{
        name: "Name",
        type: "string",
        search: true,
        imgText: true,
        onchange: getEntry,
        inputHide: true,
    }, {
        name: "Type",
        type: "radio",
        list: [{
            name: "Alien"
        }, {
            name: "Experimental"
        }, {
            name: "Royal"
        }, {
            name: "Atlantid"
        }, {
            name: "Staff"
        }],
        imgText: true,
        search: true,
    }, {
        name: "Size",
        type: "radio",
        list: [{
            name: "Rifle"
        }, {
            name: "Compact Rifle"
        }, {
            name: "Pistol"
        }],
        ttip: "Rifle: 17-24 slots<br>Compact Rifle: 11-16 slots<br>Pistol: 5-10 slots",
        imgText: true,
        search: true,
    }, {
        name: "Class",
        type: "radio",
        list: classList,
        // ttipFld: "classTtip",
        imgText: true,
        search: true,
    }, {
        name: "Space Station",
        type: "checkbox",
        imgText: true,
        search: true,
        inputHide: true,
    }, {
        name: "Planet Name",
        type: "string",
        imgText: true,
        inputHide: true,
    }, {
        name: "Planet Index",
        type: "number",
        range: 15,
        ttip: planetNumTip,
        onchange: getPlanet,
        inputHide: true,
        imgUpdate: true,
    }, {
        name: "Latitude",
        imgText: true,
        type: "float",
        inputHide: true,
    }, {
        name: "Longitude",
        imgText: true,
        type: "float",
        inputHide: true,
    }, {
        name: "Notes",
        type: "long string",
        searchText: true,
        imgText: true,
        inputHide: true,
    }, {
        name: "Seed",
        type: "string",
        searchText: true,
        ttip: "Found in save file. Can be used to reskin MT.",
        inputHide: true,
    }, {
        name: "Color",
        type: "tags",
        max: 4,
        list: colorList,
        search: true,
    }, {
        name: "Tags",
        type: "tags",
        max: 4,
        imgText: true,
        search: true,
        inputHide: true,
    }, {
        name: "Photo",
        type: "img",
        // required: true,
    }]
}, {
    name: "Fauna",
    imgText: [{
        id: "#id-Player",
        field: "_name",
        name: "Player",
        type: "string",
        required: true,
    }, {
        id: "#id-Galaxy",
        field: "galaxy",
        name: "Galaxy",
        type: "menu",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Coords",
        type: "string",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Glyphs",
        font: "NMS Glyphs",
        type: "glyph",
    },],
    fields: [{
        name: "Name",
        type: "string",
        search: true,
        imgText: true,
        onchange: getEntry,
        inputHide: true,
    }, {
        name: "Genus",
        type: "menu",
        list: faunaList,
        search: true,
    }, {
        name: "Tamed Product",
        type: "menu",
        list: faunaProductTamed,
        search: true,
        inputHide: true,
    }, {
        name: "Height",
        type: "float",
        range: 15.0,
        search: true,
        query: ">=",
        inputHide: true,
    }, {
        name: "Tags",
        type: "tags",
        max: 4,
        imgText: true,
        search: true,
    }, {
        name: "Planet Name",
        imgText: true,
        type: "string",
        inputHide: true,
    }, {
        name: "Planet Index",
        type: "number",
        range: 15,
        required: true,
        onchange: getPlanet,
        ttip: planetNumTip,
        imgUpdate: true,
    }, {
        name: "Photo",
        type: "img",
        // required: true,
    }]
}, {
    name: "Planet",
    imgText: [{
        id: "#id-Player",
        field: "_name",
        name: "Player",
        type: "string",
        required: true,
    }, {
        id: "#id-Galaxy",
        field: "galaxy",
        name: "Galaxy",
        type: "menu",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Coords",
        type: "string",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        name: "Glyphs",
        field: "addr",
        font: "NMS Glyphs",
        type: "glyph",
    },],
    fields: [{
        name: "Name",
        type: "string",
        search: true,
        imgText: true,
        onchange: getEntry,
        inputHide: true,
    }, {
        name: "Planet Index",
        range: 15,
        type: "number",
        required: true,
        onchange: getPlanet,
        ttip: planetNumTip,
        imgUpdate: true,
    }, {
        name: "Biome",
        type: "menu",
        list: biomeList,
        imgText: true,
        search: true,
    }, {
        name: "Sentinels",
        type: "menu",
        list: sentinelList,
        ttip: `Low - Sentinels only guard secure facilities<br>
            High - Patrols are present throughout the planet (orange icon)<br>
            Aggressive - Patrols are present throughout the planet and Sentinels will attack on sight (red icon)<br>`,
        search: true,
        inputHide: true,
    }, {
        name: "Grass Color",
        type: "menu",
        list: colorList,
        search: true,
        inputHide: true,
    }, {
        name: "Water Color",
        type: "menu",
        list: colorList,
        search: true,
        inputHide: true,
    }, {
        name: "Sky Color",
        type: "menu",
        list: colorList,
        search: true,
        inputHide: true,
    }, {
        name: "Resources",
        type: "tags",
        list: resourceList,
        max: 6,
        imgText: true,
        search: true,
        inputHide: false,
    }, {
        name: "Tags",
        type: "tags",
        max: 4,
        imgText: true,
        search: true,
        inputHide: false,
    }, {
        name: "Photo",
        type: "img",
        // required: true,
    }]
}, {
    name: "Base",
    imgText: [{
        id: "#id-Player",
        field: "_name",
        name: "Player",
        type: "string",
        required: true,
    }, {
        id: "#id-Galaxy",
        field: "galaxy",
        name: "Galaxy",
        type: "menu",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Coords",
        type: "string",
        required: true,
    }, {
        id: "#id-addrInput #id-addr",
        field: "addr",
        name: "Glyphs",
        font: "NMS Glyphs",
        type: "glyph",
    },],
    fields: [{
        name: "Name",
        type: "string",
        imgText: true,
        onchange: getEntry,
        search: true,
    }, {
        name: "Owner",
        type: "string",
        required: true,
        imgText: true,
        search: true,
        inputHide: true,
    }, {
        name: "Planet Name",
        type: "string",
        imgText: true,
        searchText: true,
        inputHide: true,
    }, {
        name: "Planet Index",
        type: "number",
        range: 15,
        onchange: getPlanet,
        ttip: planetNumTip,
        searchText: true,
        imgUpdate: true,
    }, {
        name: "Latitude",
        imgText: true,
        type: "float",
        inputHide: true,
    }, {
        name: "Longitude",
        imgText: true,
        type: "float",
        inputHide: true,
    }, {
        name: "Game Mode",
        type: "menu",
        list: modeList,
        required: true,
        ttip: "Bases are only visible by players using the same game mode.",
        imgText: true,
        search: true,
    }, {
        name: "Tags",
        type: "tags",
        imgText: true,
        max: 6,
        search: true,
    }, {
        name: "Photo",
        type: "img",
        // required: true,
    }]

}]
