'use strict'

blackHoleSuns.prototype.doLoggedout = function () {
    if (bhs.clearPanels)
        bhs.clearPanels()

    bhs.user = bhs.userInit()
    bhs.displayUser(bhs.user, true)

    $("#status").empty()
    $("#filestatus").empty()
    $("#entryTable").empty()
    $("#totals").empty()

    $("#save").addClass("disabled")
    $("#save").prop("disabled", true)
}

blackHoleSuns.prototype.doLoggedin = function (user) {
    bhs.getUser(bhs.displayUser)

    if (document.domain == "localhost" || document.domain == "test-nms-bhs.firebaseapp.com") {
        let ref = bhs.fs.doc("admin/" + bhs.user.uid)
        ref.get().then(doc => {
            if (doc.exists) {
                let role = doc.data().roles

                if (role.includes("editor") || role.includes("admin"))
                    $("#poiorg").show()

                if (role.includes("admin")) {
                    $("#id-export").show()
                    $("#btn-create").show()
                    $("#btn-export").show()

                    $("#admin").show()
                    $("#recalc").show()
                    $("#updateDARC").show()
                    $("#genDARC").show()
                    $("#backupBHS").show()

                    if (document.domain == "localhost") {
                        $("#testing").show()
                    }
                }
            }
        }).catch(err => {
            bhs.status("ERROR: " + err.code)
            console.log(err)
        })
    }

    $("#save").removeClass("disabled")
    $("#save").removeAttr("disabled")
}

blackHoleSuns.prototype.setAdmin = async function () {
    bhs.updateUser({
        role: bhs.user.role === "admin" ? "user" : "admin"
    })
}

blackHoleSuns.prototype.displayUser = async function (user, force) {
    let fpoi = window.location.pathname == "/poiorg.html"
    let fdarc = window.location.pathname == "/darc.html"
    let ftotals = window.location.pathname == "/totals.html"
    let changed = user.uid && (!bhs.entries || user.galaxy != bhs.user.galaxy || user.platform != bhs.user.platform)

    bhs.user = mergeObjects(bhs.user, user)

    if (fpoi)
        return

    if (!fdarc) {
        bhs.getActiveContest(bhs.displayContest)
        bhs.buildTotals()
        bhs.getTotals(bhs.displayTotals, bhs.displayTotalsHtml)


        if ((changed || force) && bhs.user.galaxy && bhs.user.platform) {
            bhs.buildMap()
            bhs.setMapOptions(bhs.user)

            if (!ftotals) {
                bhs.buildUserTable(bhs.user)
                bhs.displaySettings(bhs.user)
            }
        }
    }

    $("body").css("background-color", bhs.user.role === "admin" ? "green" : "black")

    let pnl = $("#pnl-user")
    pnl.find("#id-Player").val(bhs.user._name)
    pnl.find("#btn-Platform").text(bhs.user.platform)
    pnl.find("#btn-Organization").text(bhs.user.org)

    if (bhs.user.galaxy && bhs.user.galaxy !== "") {
        let i = galaxyList[bhs.getIndex(galaxyList, "name", bhs.user.galaxy)].number
        pnl.find("#btn-Galaxy").text(i + " " + bhs.user.galaxy)
        pnl.find("#btn-Galaxy").attr("style", "background-color: " + bhs.galaxyInfo[i].color + ";")
    } else
        pnl.find("#btn-Galaxy").text("")
}

blackHoleSuns.prototype.buildUserPanel = async function (noupload) {
    const panel = `
        <div id="pnl-user">
            <div class="row">
                <div class="col-7">
                    <div class="row">
                        <div class="col-14 h6 txt-inp-def">Player Name</div>
                        <input id="id-Player" class="rounded col-13 h5" type="text">
                    </div>
                </div>

                <div class="col-7">
                    <div class="row">
                        <div id="id-Organization"></div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-1"></div>
                <div id="id-Galaxy" class="col-5"></div>
                <div id="id-Platform" class="col-5"></div>

                <label id="fileupload" class="col-4 h5 text-right align-bottom hidden">
                    <input id="ck-fileupload" type="checkbox">
                    &nbsp;File Upload
                </label>
            </div>
        </div>
        <br>`

    $("#panels").prepend(panel)
    let loc = $("#pnl-user")

    await bhs.getOrgList()
    bhs.orgList.unshift({
        name: ""
    })

    if (!noupload)
        bhs.buildMenu(loc, "Organization", bhs.orgList, bhs.saveUser, true)
    bhs.buildMenu(loc, "Platform", platformList, bhs.saveUser, !noupload)
    bhs.buildMenu(loc, "Galaxy", galaxyList, bhs.saveUser, !noupload)

    $("#id-Player").change(function () {
        if (bhs.user.uid) {
            let user = bhs.extractUser()
            bhs.changeName(this, user)
        }
    })

    if (!noupload) {
        loc.find("#fileupload").show()
        $("#ck-fileupload").change(function (event) {
            if ($(this).prop("checked")) {
                panels.forEach(p => {
                    $("#" + p.id).hide()
                })
                $("#entrybuttons").hide()
                $("#upload").show()
            } else {
                panels.forEach(p => {
                    $("#" + p.id).show()
                })
                $("#entrybuttons").show()
                $("#upload").hide()
            }
        })
    }
}

blackHoleSuns.prototype.displayContest = function (contest) {
    bhs.contest = contest
    var end = contest.end.toDate().getTime()
    var start = contest.start.toDate().getTime()

    let c = $("#contest")

    if (!contest.hidden)
        c.show()

    var x = setInterval(() => {
        var now = new Date().getTime()
        var ends = end - now
        var starts = start - now

        if (starts > 0) {
            var d = Math.floor(starts / (1000 * 60 * 60 * 24))
            var h = Math.floor((starts % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            var m = Math.floor((starts % (1000 * 60 * 60)) / (1000 * 60))
            var s = Math.floor((starts % (1000 * 60)) / 1000)
            let str = contest.name + " contest starts in: " + d + "d " + h + "h " + m + "m " + s + "s "

            c.html("<div class='col-14 text-center txt-def h4'>" + str + "</div>")
        } else if (ends > 0) {
            var d = Math.floor(ends / (1000 * 60 * 60 * 24))
            var h = Math.floor((ends % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            var m = Math.floor((ends % (1000 * 60 * 60)) / (1000 * 60))
            var s = Math.floor((ends % (1000 * 60)) / 1000)
            let str = contest.name + " contest time remaining: " + d + "d " + h + "h " + m + "m " + s + "s "

            c.html("<div class='col-14 text-center txt-def h4'>" + str + "</div>")
        } else {
            clearInterval(x)
            c.html("<div class='col-14 text-center txt-def h6'>" + contest.name + " contest has ended</div>")
        }
    }, 1000)
}

const utTypeIdx = 0
const utAddrIdx = 1

var userTable = [{
    title: "Type",
    id: "id-type",
    format: "col-sm-2 col-3",
    field: "blackhole",
}, {
    title: "Coordinates",
    id: "id-addr",
    field: "addr",
    format: "col-lg-3 col-md-4 col-sm-4 col-6"
}, {
    title: "LY",
    id: "id-toctr",
    format: "col-sm-2 col-3",
    calc: true
}, {
    title: "System",
    id: "id-sys",
    field: "sys",
    format: "col-sm-3 col-5"
}, {
    title: "Region",
    id: "id-reg",
    field: "reg",
    format: "col-sm-3 col-5"
}, {
    title: "Lifeform",
    id: "id-life",
    field: "life",
    format: "col-lg-2 col-md-4 col-sm-3 col-3"
}, {
    title: "Economy",
    id: "id-econ",
    field: "econ",
    format: "col-lg-2 col-md-4 col-sm-3 col-3"
}, {
    title: "Base",
    id: "id-base",
    field: "basename",
    format: "col-sm-3 col-4",
}]

blackHoleSuns.prototype.loadEntries = function () {
    bhs.purgeMap()
    $("#userItems").empty()

    let fsearch = window.location.pathname == "/search.html" || window.location.pathname == "/totals.html"
    if (fsearch)
        bhs.select()
    else
        bhs.getEntries(bhs.displayEntryList, bhs.displayEntry)
}

blackHoleSuns.prototype.buildUserTable = function (entry) {
    const table = `
        <div class="card-header bkg-def">
            <div class="row">
                <h4 class="col-6 txt-def">System List</h4>
                <div id="lc-plat" class="col-4 txt-def h6"></div>
                <div id="lc-gal" class="col-4 h6 txt-def"></div>
            </div>
            <div class="row">
                <button id="btn-load" type="button"
                    class="col-3 border btn btn-sm btn-def text-center" onclick="bhs.loadEntries()">Load</button>&nbsp
                <div id="btn-utSettings" class="col-10 align-vertical text-right txt-def">
                    <i class="fa fa-cog txt-def"></i>&nbsp;Settings
                </div>
            </div>
        </div>

        <div id="utSettings" class="card card-body" style="display:none">
            <div id="id-utlistsel" class="row"></div>

            <div class="row">
                <button id="btn-saveListSettings" type="button" class="col-sm-2 col-4 btn-def btn btn-sm">Save</button>&nbsp

                <label id="id-export" class="col-sm-8 col-14 text-right h6 txt-inp-def border-left" style="display:none">File Name&nbsp
                    <input id="inp-exportfile" type="text" class="rounded col-10">
                </label>
                
                <button id="btn-create" type="button" href="" class="col-sm-2 col-4 btn-def btn btn-sm" style="display:none">Create</button>&nbsp
                <a id="btn-export" type="button" href="" class="col-sm-2 col-4  btn-def btn btn-sm disabled" disabled style="display:none">Export</a>
            </div>
        </div>
        
        <div id="id-table" class="card-body">
            <div id="userHeader" class="row border-bottom bkg-def txt-def"></div>
            <div id="userItems" class="scrollbar container-fluid" style="overflow-y: scroll; height: 388px"></div>
        </div>`

    const ckbox = `            
        <label class="col-sm-4 col-7 h6 txt-inp-def">
            <input id="ck-idname" type="checkbox" checked>
            title
        </label>`

    $("#entryTable").empty()
    $("#entryTable").append(table)

    const line = `<div id="idname" class="width h6">title</div>`

    let h = ""
    userTable.forEach(t => {
        let l = /idname/ [Symbol.replace](line, t.id)
        l = /width/ [Symbol.replace](l, t.format)
        h += /title/ [Symbol.replace](l, t.title)
    })

    let loc = $("#userHeader")
    loc.append(h)
    loc.find("#lc-plat").text(entry.platform)
    loc.find("#lc-gal").text(entry.galaxy)

    h = ""
    userTable.forEach(t => {
        let l = /idname/ [Symbol.replace](ckbox, t.id)
        h += /title/ [Symbol.replace](l, t.title)
    })

    loc = $("#id-utlistsel")
    loc.append(h)
    let userhdrloc = $("#userHeader")

    userTable.forEach(t => {
        loc.find("#ck-" + t.id).change(function () {
            if ($(this).prop("checked")) {
                $("#userHeader").find("#" + t.id).show()
                $("#userItems").find("#" + t.id).show()
            } else {
                $("#userHeader").find("#" + t.id).hide()
                $("#userItems").find("#" + t.id).hide()
            }
        })

        userhdrloc.find("#" + t.id).click(function () {
            let id = $(this).prop("id")
            let loc = $("#userItems")
            let list = loc.children()

            if (list.length > 0) {
                list.sort((a, b) => {
                    let abh = $(a).find("#" + id + " #bh-" + id).text().stripMarginWS().toLowerCase()
                    let axit = $(a).find("#" + id + " #x-" + id).text().stripMarginWS().toLowerCase()
                    let bbh = $(b).find("#" + id + " #bh-" + id).text().stripMarginWS().toLowerCase()
                    let bxit = $(b).find("#" + id + " #x-" + id).text().stripMarginWS().toLowerCase()

                    if (abh) {
                        if (bbh)
                            return abh > bbh ? 1 : abh < bbh ? -1 : 0
                        else
                            return abh > bxit ? 1 : abh < bxit ? -1 : 0
                    } else {
                        if (bbh)
                            return axit > bbh ? 1 : axit < bbh ? -1 : 0
                        else
                            return axit > bxit ? 1 : axit < bxit ? -1 : 0
                    }
                })

                loc.empty()
                for (var i = 0; i < list.length; i++)
                    loc.append(list[i])
            }
        })
    })

    $("#btn-utSettings").click(() => {
        if ($("#utSettings").is(":hidden"))
            $("#utSettings").show()
        else
            $("#utSettings").hide()
    })

    $("#btn-saveListSettings").click(() => {
        bhs.updateUser({
            settings: bhs.extractSettings()
        })
    })

    $("#btn-create").click(() => {
        var text = bhs.entriesToCsv()

        var data = new Blob([text], {
            type: 'text/plain'
        })
        var url = window.URL.createObjectURL(data)
        document.getElementById('btn-export').href = url

        $("#btn-export").prop("download", $("#inp-exportfile").val())
        $("#btn-export").removeClass("disabled")
        $("#btn-export").removeAttr("disabled")
    })
}

blackHoleSuns.prototype.entriesToCsv = function () {
    let out = "bh coord,sys,reg,life,econ,exit coord,sys,reg,life,econ\n"

    let list = $("#userItems").children()
    for (let i = 0; i < list.length; ++i) {
        let loc = list[i]
        let addr = /-/g [Symbol.replace]($(loc).prop("id"), ":")
        let e = bhs.entries[addr]
        if (e.blackhole) {
            out += e.addr + "," + e.sys + "," + e.reg + "," + e.life + "," + e.econ + ","
            out += e.x.addr + "," + e.x.sys + "," + e.x.reg + "," + e.x.life + "," + e.x.econ + "\n"
        }

    }

    return out
}

blackHoleSuns.prototype.displayEntryList = function (entrylist, force) {
    bhs.drawList(entrylist, force)
    $("#userItems").empty()

    if (window.location.pathname == "/totals.html")
        return

    const lineHdr = `
        <div id="gpa" class="row">`
    const line = `
            <div id="idname" class="width border-bottom" onclick="entryDblclk(this)">
                <div id="bh-idname" class="row">bhdata</div>
                <div id="x-idname" class="row">xdata</div>
            </div>`
    const lineEnd = `
        </div>`

    let h = ""

    let keys = Object.keys(entrylist)
    for (let i = 0; i < keys.length; ++i) {
        let entry = entrylist[keys[i]]
        h += /gpa/ [Symbol.replace](lineHdr, keys[i].nameToId())
        let l = ""

        for (let j = 0; j < userTable.length; ++j) {
            let t = userTable[j]

            l = /idname/g [Symbol.replace](line, t.id)
            l = /width/g [Symbol.replace](l, t.format)

            if (t.calc) {
                l = /bhdata/ [Symbol.replace](l, entry.towardsCtr ? entry.towardsCtr : "")
                l = /xdata/ [Symbol.replace](l, "")
            } else if (t.id == "id-type") {
                l = /bhdata/ [Symbol.replace](l, entry.blackhole ? "BH" : entry.deadzone ? "DZ" : "")
                l = /xdata/ [Symbol.replace](l, "")
            } else if (t.id == "id-base") {
                l = /bhdata/ [Symbol.replace](l, entry.basename ? entry.basename : "")
                l = /xdata/ [Symbol.replace](l, entry.x && entry.x.basename ? entry.x.basename : "")
            } else {
                l = /bhdata/ [Symbol.replace](l, entry[t.field] ? entry[t.field] : "")
                l = /xdata/ [Symbol.replace](l, entry.x && entry.x[t.field] ? entry.x[t.field] : "")
            }

            h += l
        }

        h += lineEnd
    }

    $("#userItems").append(h)
    bhs.displaySettings(bhs.user)
}

blackHoleSuns.prototype.displayEntry = function (entry, zoom) {
    bhs.drawSingle(entry, zoom)

    if (window.location.pathname == "/totals.html")
        return

    let id = (entry.blackhole ? entry.connection : entry.addr).nameToId()
    let loc = $("#userItems #" + id)

    for (let j = 0; j < userTable.length; ++j) {
        let t = userTable[j]

        if (t.calc)
            loc.find("#bh-" + t.id).text(entry.blackhole ? entry.towardsCtr : "")
        else if (t.id == "id-type")
            loc.find("#bh-" + t.id).text(entry.blackhole ? "BH" : entry.deadzone ? "DZ" : "")
        else {
            if (entry.blackhole)
                loc.find("#bh-" + t.id).text(entry[t.field] ? entry[t.field] : "")
            else if (entry.deadzone)
                loc.find("#bh-" + t.id).text(entry[t.field] ? entry[t.field] : "")
            else
                loc.find("#x-" + t.id).text(entry[t.field] ? entry[t.field] : "")
        }
    }
}

function entryDblclk(evt) {
    let iftotals = window.location.pathname == "/totals.html" || window.location.pathname == "/search.html"

    let id = $(evt).parent().prop("id")
    let e = bhs.entries[bhs.reformatAddress(id)]

    if (!iftotals) {
        $('html, body').animate({
            scrollTop: ($('#panels').offset().top)
        }, 0)

        $("#delete").removeClass("disabled")
        $("#delete").removeAttr("disabled")

        bhs.displayListEntry(e)
    } else {
        let l = {}
        l[bhs.reformatAddress(id)] = e
        bhs.drawList(l)
    }
}

const totalsItemsHdr = `<div id="idname" class="row">`
const totalsItems = `       <div id="idname" class="format">title</div>`
const totalsItemsEnd = `</div>`

const totalsCol = [{
    title: "",
    id: "id-what",
    format: "col-sm-4 col-6",
}, {
    title: "Player",
    id: "id-Player",
    format: "col-sm-2 col-4 text-right",
    where: "index",
}, {
    title: "All",
    id: "id-Total",
    format: "col-sm-2 col-4 text-right",
}, {
    title: "Contest",
    id: "id-ctst",
    format: "col-sm-2 col-10 text-right hidden",
    where: "index",
}, {
    title: "Ctst All",
    id: "id-contestall",
    format: "col-sm-2 col-4 text-right hidden",
}]

const rowTotal = 0
const rowPlatform = 1
const rowAltPlatform = 2
const rowGalaxyPlatform = 3

const totalsRows = [{
    title: "Total BH",
    id: "id-totalBH",
}, {
    title: "Total/platform",
    id: "id-totalBHP",
}, {
    title: "Total/altplatform",
    id: "id-totalAHP",
    where: "galaxy",
}, {
    title: "Total/galaxy/platform",
    id: "id-totalBHGP",
    where: "index",
}]

blackHoleSuns.prototype.buildTotals = function () {
    let findex = window.location.pathname == "/index.html" || window.location.pathname == "/"
    let ftotals = window.location.pathname == "/totals.html"

    const pnl = `
        <div class="card-header bkg-def">
            <div class="row">
                <div class="col-7 h4 txt-def">Total Black Hole Entries</div>
                <div id="contrib" class="col-7 clr-creme">Total contributors: </div>
                <div id="cname" class="row clr-creme"></div>
            </div>
        </div>
        <div id="subpanel" class="card-body bkg-white">
            <label id="id-showall" class="row h6 txt-inp-def hidden">
                Show All&nbsp
                <input id="ck-showall" type="checkbox">
            </label>
            <div id="hdr-Player" class="row border-bottom bkg-def txt-def"></div>
            <div id="itm-Player"></div>
            <br>
        </div>`

    let tot = $("#totals")
    tot.empty()
    tot.append(pnl)

    if (!findex) {
        tot.find("#itm-Players").css("height", "210px")
        tot.find("#itm-Organizations").css("height", "120px")
    }

    let h = ""

    totalsCol.forEach(t => {
        let l = /idname/ [Symbol.replace](totalsItems, t.id)
        l = /title/ [Symbol.replace](l, t.title)
        h += /format/ [Symbol.replace](l, t.format)
    })
    tot.find("#hdr-Player").append(h)

    totalsRows.forEach(x => {
        let t = /altplatform/ [Symbol.replace](x.title, bhs.user.platform != "PS4" ? "PS4" : "PC-XBox")
        t = /platform/ [Symbol.replace](t, bhs.user.platform)
        t = /galaxy/ [Symbol.replace](t, bhs.user.galaxy)

        let h = /idname/ [Symbol.replace](totalsItemsHdr, x.id)

        totalsCol.forEach(y => {
            let l = /idname/ [Symbol.replace](totalsItems, y.id)
            l = /title/ [Symbol.replace](l, t)
            h += /format/ [Symbol.replace](l, y.format)
            t = ""
        })

        h += totalsItemsEnd

        tot.find("#itm-Player").append(h)
    })

    totalsRows.forEach(t => {
        if (t.where == "index" && !findex)
            tot.find("#itm-Player #" + t.id).hide()
        if (t.where == "galaxy" && !ftotals)
            tot.find("#itm-Player #" + t.id).hide()
    })

    if (findex) {
        tot.find("#id-showall").show()
        tot.find("#ck-showall").change(function () {
            if ($(this).prop("checked")) {
                $("[id|='gal']").show()
                $("#totals").find("#id-totalBHGP").css("border-bottom", "1px solid black")
            } else {
                $("[id|='gal']").hide()
                $("#totals").find("#id-totalBHGP").css("border-bottom", "0px")
            }
        })
    }
}

blackHoleSuns.prototype.displayTotals = function (e, refpath) {
    let findex = window.location.pathname == "/index.html" || window.location.pathname == "/"
    let ftotals = window.location.pathname == "/totals.html"

    if (bhs.user.galaxy === "" || bhs.user.platform === "")
        return

    bhs.updateTotalsListView(e, refpath)

    if (refpath === "bhs/Organizations")
        return

    const addPlatforms = e => {
        let t = 0
        if (typeof e["PC-XBox"] !== "undefined")
            t += e["PC-XBox"]
        if (typeof e["PS4"] !== "undefined")
            t += e["PS4"]
        return t
    }

    let tot = $("#totals")
    let colid

    if (refpath === "bhs/Players") {
        e = e[bhs.user._name]
        if (typeof e === "undefined")
            return;
        colid = "id-Player"
    } else
        colid = "id-Total"

    for (let rid of totalsRows) {
        let loc = tot.find("#" + rid.id).find("#" + colid)

        switch (rid.id) {
            case "id-totalBH":
                loc.text(addPlatforms(e))
                break
            case "id-totalBHP":
                loc.text(e[bhs.user.platform])
                break
            case "id-totalAHP":
                loc.text(e[bhs.user.platform === "PC-XBox" ? "PS4" : "PC-XBox"])
                break
            case "id-totalBHG":
                loc.text(addPlatforms(e.galaxies[bhs.user.galaxy]))
                break
            case "id-totalBHGP":
                loc.text(e.galaxies[bhs.user.galaxy][bhs.user.platform])
                break
        }
    }

    if (findex) {
        let pnl = $("#itm-Player")
        let html = ""

        for (let g of Object.keys(e.galaxies)) {
            for (let p of Object.keys(e.galaxies[g])) {
                let id = "gal-" + g.nameToId() + "-" + p
                let h = /idname/ [Symbol.replace](totalsItemsHdr, id)
                h = />/ [Symbol.replace](h, " style='display:none'>")

                let t = /galaxy/ [Symbol.replace](totalsRows[rowGalaxyPlatform].title, g)
                t = /platform/ [Symbol.replace](t, p)

                let l = /title/ [Symbol.replace](totalsItems, t)
                h += /format/ [Symbol.replace](l, totalsCol[0].format)

                l = /title/ [Symbol.replace](totalsItems, e.galaxies[g][p])
                h += /format/ [Symbol.replace](l, totalsCol[1].format)

                html += h + totalsItemsEnd
            }
        }

        pnl.append(html)
    }
}

blackHoleSuns.prototype.updateTotalsListView = function (e, refpath) {
    let p = refpath.replace(/.*\/(.*)/, "$1")
    let loc = $("#scroll-" + p)

    if (loc.length > 0) {
        for (let k of Object.keys(e)) {
            if (k === "PS4" || k === "PC-XBox")
                continue

            let uloc = loc.find("#u-" + k.nameToId())
            if (uloc.length > 0) {
                let u = e[k]
                let t = typeof u["PC-XBox"] != "undefined" ? u["PC-XBox"] : 0
                t += typeof u["PS4"] != "undefined" ? u["PS4"] : 0

                if (parseInt(uloc.find("#id-Total").text()) != t) {
                    uloc.addClass("font-weight-bold")
                    uloc.find("#id-Total").text(t)

                    if (typeof u["PC-XBox"] != "undefined")
                        uloc.find("#id-PC-XBox").text(u["PC-XBox"])

                    if (typeof u["PS4"] != "undefined")
                        uloc.find("#id-PS4").text(u["PS4"])
                }
            }
        }
    }
}

blackHoleSuns.prototype.displayTotalsHtml = function (html, p) {
    $("#subpanel").append(html)

    if (p === "Players")
        $("#contrib").text("Total contributors: " + $("#itm-Players").children().length)
}

blackHoleSuns.prototype.sortTotals = function (evt) {
    let id = $(evt).prop("id")
    let pnl = $(evt).parent().next()
    let g = pnl.prop("id") === "itm-Galaxies"

    let list = pnl.children()
    if (list.length > 0) {
        if (id.match(/name/i))
            list.sort((a, b) => {
                let x = $(a).find("#" + id).text()
                let y = $(b).find("#" + id).text()

                if (g) {
                    x = parseInt(x.replace(/(\d+).*/, "$1"))
                    y = y.replace(/^(\d+).*/, "$1")
                    return x - y
                } else {
                    x = x.stripMarginWS().toLowerCase()
                    y = y.stripMarginWS().toLowerCase()
                    return x > y ? 1 : x < y ? -1 : 0
                }
            })
        else
            list.sort((a, b) => {
                let x = $(a).find("#" + id).text().stripMarginWS()
                let y = $(b).find("#" + id).text().stripMarginWS()
                x = x == "" ? -2 : x == "--" ? -1 : parseInt(x)
                y = y == "" ? -2 : y == "--" ? -1 : parseInt(y)

                return y - x
            })

        pnl.empty()
        for (let i = 0; i < list.length; i++)
            pnl.append(list[i])
    }
}

blackHoleSuns.prototype.clickUser = function (evt) {
    return
    let loc = $(evt).parent()
    let id = loc.prop("id")
    let pnlid = loc.parent().prop("id")
    let name = $(evt).parent().find("#id-names").text().stripMarginWS()

    if (window.location.pathname == "/totals.html") {
        bhs.entries = {}

        if (pnlid == "itm-Organizations") {
            let galaxy = $("#btn-Galaxy").text().stripNumber()
            let platform = $("#btn-Platform").text().stripNumber()
            $("#btn-Player").text(id.stripID())
            bhs.getOrgEntries(bhs.displayEntryList, bhs.displayEntry, name, galaxy, platform)
        } else {
            let uid = $(evt).parent().find("#id-uid").text().stripMarginWS()
            let galaxy = $(evt).parent().find("#id-galaxy").text().stripMarginWS()
            let platform = $(evt).parent().find("#id-platform").text().stripMarginWS()

            console.log(name + " " + uid)

            $("#btn-Galaxy").text(galaxy)
            $("#btn-Platform").text(platform)
            $("#btn-Player").text(name)

            bhs.getEntries(bhs.displayEntryList, bhs.displayEntry, uid, galaxy, platform)
        }
    }
}

blackHoleSuns.prototype.clickGalaxy = function (evt) {
    let galaxy = $(evt).parent().find("#id-names").text().stripNumber()

    bhs.entries = {}
    $("#btn-Galaxy").text(galaxy)
    let platform = $("#btn-Platform").text().stripMarginWS()
    $("#btn-Player").text("")
    bhs.getEntries(bhs.displayEntryList, bhs.displayEntry, null, galaxy, platform)
}

blackHoleSuns.prototype.buildMenu = function (loc, label, list, changefcn, vertical) {
    if (!list || list.length == 0)
        return

    let title = `        
        <div class="row">
            <div class="col-md-medium col-sm-small col-xs h6 txt-inp-def">label</div>`
    let block = `
            <div id="menu-idname" class="col-md-medium col-sm-small col-xs dropdown">
                <button id="btn-idname" class="btn border btn-sm dropdown-toggle" style="rgbcolor" type="button" data-toggle="dropdown"></button>
            </div>
        </div>`

    let item = ``
    let hdr = ``
    if (list.length > 8) {
        hdr = `<ul id="list" class="dropdown-menu scrollable-menu" role="menu"></ul>`
        item = `<li id="item-idname" class="dropdown-item" type="button" style="rgbcolor cursor: pointer">iname</li>`
    } else {
        hdr = `<div id="list" class="dropdown-menu"></div>`
        item = `<button id="item-idname" class="dropdown-item border-bottom" type="button" style="rgbcolor cursor: pointer">iname</button>`
    }

    let id = label.nameToId()
    let h = /label/ [Symbol.replace](title, label)
    h = /medium/ [Symbol.replace](h, vertical ? 13 : 8)
    h = /small/ [Symbol.replace](h, vertical ? 13 : 7)
    h = /xs/ [Symbol.replace](h, vertical ? 13 : 6)

    let l = /idname/g [Symbol.replace](block, id)
    l = /medium/ [Symbol.replace](l, vertical ? 13 : 5)
    l = /small/ [Symbol.replace](l, vertical ? 13 : 6)
    l = /xs/ [Symbol.replace](l, vertical ? 13 : 7)

    h += /rgbcolor/ [Symbol.replace](l, "background-color: " + levelRgb[typeof list[0].number == "undefined" ? 0 : list[0].number])
    loc.find("#id-" + id).empty()
    loc.find("#id-" + id).append(h)

    let menu = loc.find("#menu-" + id)
    menu.append(hdr)

    let mlist = menu.find("#list")

    for (let i = 0; i < list.length; ++i) {
        let lid = list[i].name.nameToId()
        h = /idname/ [Symbol.replace](item, lid)

        if (list[i].number)
            h = /iname/ [Symbol.replace](h, list[i].number + " " + list[i].name)
        else
        if (list[i].number)
            h = /iname/ [Symbol.replace](h, list[i].number + " " + list[i].name)
        else
            h = /iname/ [Symbol.replace](h, list[i].name)

        if (label != "Galaxy") {
            if (list[i].number)
                h = /rgbcolor/ [Symbol.replace](h, "background-color: " + levelRgb[list[i].number] + ";")
            else
                h = /rgbcolor/ [Symbol.replace](h, "background-color: #c0f0ff;")
        } else {
            if (typeof bhs.galaxyInfo[galaxyList[i].number] != "undefined") {
                let c = bhs.galaxyInfo[galaxyList[i].number].color
                h = /rgbcolor/ [Symbol.replace](h, "background-color: " + c + ";")
            } else
                h = /rgbcolor/ [Symbol.replace](h, "background-color: #ffffff;")
        }

        mlist.append(h)

        mlist.find("#item-" + lid).unbind("click")
        mlist.find("#item-" + lid).click(function () {
            let name = $(this).text().stripMarginWS()
            let btn = menu.find("#btn-" + id)
            btn.text(name)

            if (changefcn)
                changefcn(id)

            if ($(this).attr("style"))
                btn.attr("style", $(this).attr("style"))
        })
    }
}

blackHoleSuns.prototype.saveUser = async function (batch) {
    if (bhs.user.uid) {
        let user = bhs.extractUser()
        let ok = bhs.validateUser(user)

        if (ok)
            ok = await bhs.updateUser(user, batch)

        return ok
    } else
        return false
}

blackHoleSuns.prototype.extractUser = function () {
    let loc = $("#pnl-user")
    let u = {}

    u._name = loc.find("#id-Player").val()
    u.platform = loc.find("#btn-Platform").text().stripNumber()
    u.galaxy = loc.find("#btn-Galaxy").text().stripNumber()
    u.org = loc.find("#btn-Organization").text().stripNumber()
    u.version = "beyond" // loc.find("#btn-Version").text().stripNumber()

    return u
}

blackHoleSuns.prototype.extractSettings = function () {
    let s = {}
    s.options = {}

    let loc = $("#utSettings")

    loc.find("[id|='ck']").each(function () {
        let id = $(this).prop("id")
        let checked = $(this).prop("checked")
        s.options[id] = checked
    })

    return s
}

blackHoleSuns.prototype.initSettings = function () {
    let s = {}
    s.options = {}

    let loc = $("#utSettings")
    loc.find("[id|='ck']").each(function () {
        let id = $(this).prop("id")
        s.options[id] = true
    })

    return s
}

blackHoleSuns.prototype.displaySettings = function (entry) {
    if (typeof entry.settings == "undefined")
        entry.settings = bhs.initSettings()

    let loc = $("#utSettings")

    let tbl = $("#id-table")
    let usrHdr = tbl.find("#userHeader")
    let usrItm = tbl.find("#userItems")

    usrHdr.find("#id-type").show()
    usrItm.find("#id-type").show()

    Object.keys(entry.settings.options).forEach(x => {
        loc.find("#" + x).prop("checked", entry.settings.options[x])
        let y = x.replace(/ck-(.*)/, "$1")
        if (entry.settings.options[x]) {
            usrHdr.find("#" + y).show()
            usrItm.find("#" + y).show()
        } else {
            usrHdr.find("#" + y).hide()
            usrItm.find("#" + y).hide()
        }
    })
}

var colortable = [{
    name: "Black Hole",
    id: "clr-bh",
    color: "#ffffff",
    size: 3,
}, {
    name: "Exit",
    id: "clr-exit",
    color: "#004080",
    size: 2,
}, {
    name: "Dead Zone",
    id: "clr-dz",
    color: "#ff0000",
    size: 2,
}, {
    name: "Base",
    id: "clr-base",
    color: "#00ff00",
    size: 2,
}, {
    name: "Connection",
    id: "clr-con",
    color: "#0000a0",
}, {
    name: "Map Bkg",
    id: "clr-bkg",
    color: "#000000",
}, {
    name: "Page Bkg",
    id: "clr-page",
    color: "#000000",
}, {
    name: "Grid",
    id: "clr-grid",
    color: "#c0c0c0",
}]

const minmaxtable = [{
        id: "xmin",
        val: 0
    },
    {
        id: "xmax",
        val: 4095
    },
    {
        id: "ymin",
        val: 0
    },
    {
        id: "ymax",
        val: 255
    },
    {
        id: "zmin",
        val: 0
    },
    {
        id: "zmax",
        val: 4095
    },
]

blackHoleSuns.prototype.extractMapOptions = function () {
    let c = {}
    let opt = $("#mapkey")

    for (let i = 0; i < colortable.length; ++i) {
        c[colortable[i].id] = opt.find("#sel-" + colortable[i].id).val()
        c["inp-" + colortable[i].id] = opt.find("#inp-" + colortable[i].id).val()
    }

    opt = $("#mapoptions")
    c.zoomsz = 5
    for (let i = 0; i < minmaxtable.length; ++i)
        c[minmaxtable[i].id] = parseInt(opt.find("#inp-" + minmaxtable[i].id).val())

    c.ctrcord = bhs.reformatAddress(opt.find("#inp-ctrcord").val())
    c.ctrzoom = parseInt(opt.find("#inp-ctrzoom").val())
    c.chaindepth = parseInt(opt.find("#inp-chaindepth").val())
    c.chainradius = parseInt(opt.find("#inp-chainradius").val())

    c.connection = opt.find("#ck-drawcon").prop("checked")
    c.map3d = opt.find("#ck-3dmap").prop("checked")
    //c.exit = opt.find("#ck-drawexits").prop("checked")
    //c.base = opt.find("#ck-drawbase").prop("checked")
    c.zoomreg = opt.find("#ck-zoomreg").prop("checked")
    c.addzero = opt.find("#ck-addzero").prop("checked")
    c.chain = opt.find("#ck-chain").prop("checked")

    return c
}

blackHoleSuns.prototype.setMapOptions = function (entry) {
    let findex = window.location.pathname == "/" || window.location.pathname == "/index.html"
    let fsearch = window.location.pathname == "/search.html"
    let opt = $("#mapoptions")

    if (!findex) {
        opt.find("#id-drawbase").hide()
        opt.find("#id-zoomreg").hide()

        if (!fsearch)
            opt.find("#id-drawcon").hide()
    }

    if (fsearch)
        opt.find("#zoomsection").hide()

    if (typeof entry.mapoptions != "undefined") {
        opt = $("#mapkey")
        for (let i = 0; i < colortable.length; ++i) {
            opt.find("#sel-" + colortable[i].id).val(entry.mapoptions[colortable[i].id] ? entry.mapoptions[colortable[i].id] : colortable[i].color)
            if (typeof colortable[i].size != "undefined") {
                opt.find("#inp-" + colortable[i].id).val(entry.mapoptions["inp-" + colortable[i].id] ? entry.mapoptions["inp-" + colortable[i].id] : colortable[i].size)
                opt.find("#inp-" + colortable[i].id).show()
            }
        }

        opt = $("#mapoptions")
        for (let i = 0; i < minmaxtable.length; ++i)
            opt.find("#inp-" + minmaxtable[i].id).val(entry.mapoptions[minmaxtable[i].id] ? entry.mapoptions[minmaxtable[i].id] : minmaxtable[i].val)

        opt.find("#inp-ctrcord").val(entry.mapoptions.ctrcord ? entry.mapoptions.ctrcord : "07FF:007F:07FF:0000")
        opt.find("#inp-ctrzoom").val(entry.mapoptions.ctrzoom ? entry.mapoptions.ctrzoom : 5)
        opt.find("#inp-chaindepth").val(entry.mapoptions.chaindepth ? entry.mapoptions.chaindepth : 5)
        opt.find("#inp-chainradius").val(entry.mapoptions.chainradius ? entry.mapoptions.chainradius : 1)

        opt.find("#ck-drawcon").prop("checked", typeof entry.mapoptions.connection != "undefined" ? entry.mapoptions.connection : false)
        opt.find("#ck-3dmap").prop("checked", typeof entry.mapoptions.map3d != "undefined" ? entry.mapoptions.map3d : true)
        //opt.find("#ck-drawexits").prop("checked", typeof entry.mapoptions.exit != "undefined" ? entry.mapoptions.exit : false)
        //opt.find("#ck-drawbase").prop("checked", typeof entry.mapoptions.base != "undefined" ? entry.mapoptions.base : false)
        opt.find("#ck-zoomreg").prop("checked", typeof entry.mapoptions.zoomreg != "undefined" ? entry.mapoptions.zoomreg : false)
        opt.find("#ck-addzero").prop("checked", typeof entry.mapoptions.addzero != "undefined" ? entry.mapoptions.addzero : true)
        opt.find("#ck-chain").prop("checked", typeof entry.mapoptions.chain != "undefined" ? entry.mapoptions.chain : true)
    } else
        bhs.resetMapOptions()
}

blackHoleSuns.prototype.resetMapOptions = function (entry) {
    let findex = window.location.pathname == "/" || window.location.pathname == "/index.html"
    let opt = $("#mapoptions")

    opt = $("#mapkey")
    for (let i = 0; i < colortable.length; ++i) {
        opt.find("#sel-" + colortable[i].id).val(colortable[i].color)
        if (typeof colortable[i].size != "undefined") {
            opt.find("#inp-" + colortable[i].id).val(colortable[i].size)
            opt.find("#inp-" + colortable[i].id).show()
        }
    }

    opt = $("#mapoptions")
    for (let i = 0; i < minmaxtable.length; ++i)
        opt.find("#inp-" + minmaxtable[i].id).val(minmaxtable[i].val)

    opt.find("#inp-ctrcord").val("07FF:007F:07FF:0000")
    opt.find("#inp-ctrzoom").val(5)
    opt.find("#inp-chaindepth").val(1)
    opt.find("#inp-chainradius").val(1)

    opt.find("#ck-drawcon").prop("checked", false)
    opt.find("#ck-3dmap").prop("checked", true)
    opt.find("#ck-drawexits").prop("checked", false)
    opt.find("#ck-drawbase").prop("checked", false)
    opt.find("#ck-zoomreg").prop("checked", false)
    opt.find("#ck-addzero").prop("checked", true)
    opt.find("#ck-chain").prop("checked", false)
}

blackHoleSuns.prototype.purgeMap = function () {
    //Plotly.purge('plymap')
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

    let opt = bhs.extractMapOptions()
    let layout = bhs.changeMapLayout()
    let data = []
    let out = initout()
    pushentry(out, truezero)
    pushentry(out, zero, "Galactic Center")
    data.push(makedata(opt, out, 4, "#ffffff"))

    Plotly.newPlot('plymap', data, layout).then(plot => {
        plot.on('plotly_click', function (e) {
            setTimeout(() => {
                if (e.points.length > 0 && e.points[0].text) {
                    let addr = e.points[0].text.slice(0, 19)

                    if (window.location.pathname == "/index.html" || window.location.pathname == "/")
                        bhs.getEntry(addr, bhs.displayListEntry)

                    let opt = bhs.extractMapOptions()
                    let xyz = bhs.addressToXYZ(addr)

                    mapped = {}
                    searched = {}
                    searchedup = {}
                    bhs.drawChain(opt, xyz, opt.chain ? opt.chaindepth : 1)
                }
            }, 1500)
        })
    })
}

blackHoleSuns.prototype.buildMap = function () {
    let fsearch = window.location.pathname == "/search.html"

    let w = $("#maplogo").width()
    $("#logo").prop("width", w)
    $("#logo").prop("height", w)

    const settings = `
        <br>
        <div class="row">
            <div id="id-mapinp" class="col-sm-6 col-14">
                <div class="row">
                    <div class="col-1"></div>
                    <div class="col-5 txt-def">Min</div>
                    <div class="col-5 txt-def">Max</div>
                </div>
                <div class="row">
                    <div class="col-1 txt-def">X</div>
                    <input id="inp-xmin" type="number" class="rounded col-5 txt-def" min="0" max="4095" value="0">
                    <input id="inp-xmax" type="number" class="rounded col-5 txt-def" min="0" max="4095" value="4095">
                </div>
                <div class="row">
                    <div class="col-1 txt-def">Z</div>
                    <input id="inp-zmin" type="number" class="rounded col-5 txt-def" min="0" max="4095" value="0">
                    <input id="inp-zmax" type="number" class="rounded col-5 txt-def" min="0" max="4095" value="4095">
                </div>
                <div class="row">
                    <div class="col-1 txt-def">Y</div>
                    <input id="inp-ymin" type="number" class="rounded col-5 txt-def" min="0" max="255" value="0">
                    <input id="inp-ymax" type="number" class="rounded col-5 txt-def" min="0" max="255" value="255">
                </div>
                <br>
            </div>

            <div class="col-sm-7 col-14 border-left">
                <div class="row">
                    <label class="col-sm-7 col-14 h6 txt-def">
                        <input id="ck-3dmap" type="checkbox" checked>
                        3D Map
                    </label>
                    <label id="id-drawcon" class="col-sm-7 col-14 h6 txt-def">
                        <input id="ck-drawcon" type="checkbox" checked>
                        Draw Connections
                    </label>
                    <label id="id-zoomreg" class="col-14 h6 txt-def">
                        <input id="ck-zoomreg" type="checkbox" checked>
                        Auto Zoom Reg Search (zoom radius)
                    </label>
                </div>
                <div class="row">
                    <label class="col-8 h6 txt-def">
                        <input id="ck-chain" type="checkbox" checked>
                        Select Chain&nbsp
                        <input id="inp-chaindepth" type="number" class="rounded col-7 txt-def" min="0">
                    </label> 
                    <label class="col-6 h6 txt-def">
                        Radius&nbsp
                        <input id="inp-chainradius" type="number" class="rounded col-8 txt-def" min="0">
                    </label>
                </div>
            </div>
        </div>
        <br>
        <div class="border-top">&nbsp;</div>

        <div id="zoomsection" class="row">
            <div class="h6 txt-def align-bottom">&nbsp;Zoom:&nbsp;</div>
            <label class="col-sm-6 col-12 h6 txt-def">Coord&nbsp
                <input id="inp-ctrcord" type="text" class="rounded col-14 txt-def" placeholder="07FF:007F:07FF:0000">
            </label>
            <label class="col-sm-4 col-7 h6 txt-def">Radius&nbsp
                <input id="inp-ctrzoom" type="number" class="rounded col-6 txt-def" min="0" max="2048">
            </label>
            <label class="col-sm-3 col-7 h6 txt-def">
            <input id="ck-addzero" type="checkbox" checked>
                &nbsp;Add 0
            </label>
        </div>
        <br>

        <div class="row">
            <div class="col-5">
                <div class="row">
                    <button id="btn-mapsave" type="button" class="col-7 border btn btn-sm btn-def">Save</button>&nbsp
                    <button id="btn-mapreset" type="button" class="col-7 border btn btn-sm btn-def">Reset</button>&nbsp
                </div>
            </div>
            <div class="col-9 border">
                <div class="col-14 h6 clr-creme text-center">Click on map to select system & draw connections.</div>
                <div class="col-14 h6 clr-creme text-center">Click on color box in map key to change colors. Then click redraw.</div>
            </div>
        </div>`

    let opt = $("#mapoptions")
    opt.empty()
    opt.html(settings)
    const col = '<div class="col-sm-7 col-14">'
    const key = `
        <div class="row">
            <div id="idname" class="col-5 text-center">title</div>
            <input id="sel-idname" class="col-4 bkg-def" style="border-color:black" type="color" value="colorsel">
            <input id="inp-idname" type="number" class="rounded col-5 text-right txt-def hidden" min="0" max="20">
        </div>`
    const colend = `</div>`

    let keyloc = $("#mapkey")
    keyloc.empty()

    colortable.forEach(c => {
        let h = /idname/g [Symbol.replace](key, c.id)
        h = /colorsel/g [Symbol.replace](h, c.color)
        h = /title/g [Symbol.replace](h, c.name)

        if (!fsearch)
            h = col + h + colend

        keyloc.append(h)
    })

    let map = $("#map")
    map.find("#btn-redraw").unbind("click")
    map.find("#btn-redraw").click(() => {
        bhs.purgeMap()

        let fsearch = window.location.pathname == "/search.html"
        if (!fsearch)
            bhs.drawList(bhs.entries)
    })

    opt.find("#btn-mapsave").unbind("click")
    opt.find("#btn-mapsave").click(() => {
        bhs.updateUser({
            mapoptions: bhs.extractMapOptions()
        })
        bhs.drawList(bhs.entries)
    })

    $("#btn-mapreset").unbind("click")
    opt.find("#btn-mapreset").click(() => {
        bhs.resetMapOptions()
        bhs.drawList(bhs.entries)
    })

    for (let i = 0; i < minmaxtable.length; ++i) {
        $("#inp-" + minmaxtable[i].id).unbind("change")
        opt.find("#inp-" + minmaxtable[i].id).change(() => {
            bhs.changeMapLayout(true)
        })
    }

    $("#inp-ctrcord").unbind("change")
    opt.find("#inp-ctrcord").change(() => {
        bhs.changeMapLayout(true, true)
    })

    $("#inp-ctrzoom").unbind("change")
    opt.find("#inp-ctrzoom").change(() => {
        bhs.changeMapLayout(true, true)
    })

    bhs.purgeMap()

    $("#btn-mapsettings").unbind("click")
    $("#btn-mapsettings").click(() => {
        if ($("#showmapkey").is(":hidden")) {
            $("#showmapkey").show()
            $("#showmapoptions").show()
        } else {
            $("#showmapkey").hide()
            $("#showmapoptions").hide()
        }
    })
}

var mapped = []
var searched = []
var searchedup = []

blackHoleSuns.prototype.drawSingle = function (e) {
    let opt = bhs.extractMapOptions()

    let out = initout()
    pushentry(out, e.xyzs, e.addr + "<br>" + e.sys + "<br>" + e.reg)
    if (e.blackhole)
        pushentry(out, e.x.xyzs, e.x.addr + "<br>" + e.x.sys + "<br>" + e.x.reg)

    Plotly.addTraces('plymap', makedata(opt, out, opt["inp-clr-bh"] * 2, opt["clr-bh"], e.blackhole ? opt["clr-exit"] : null))
}

blackHoleSuns.prototype.drawList = function (listEntry, force) {
    let findex = window.location.pathname == "/" || window.location.pathname == "/index.html"
    let fsearch = window.location.pathname == "/search.html"

    if (!force && fsearch)
        return

    let opt = bhs.extractMapOptions()
    let k = Object.keys(listEntry)

    if (!findex && !fsearch)
        opt.connection = false

    let out = {}
    out.bh = initout()
    out.dz = initout()
    out.x = initout()
    out.base = initout()

    let data = []

    for (let i of k) {
        let e = listEntry[i]

        if (opt.connection && e.x) {
            let out = initout()
            pushentry(out, e.xyzs, e.addr + "<br>" + e.sys + "<br>" + e.reg)
            pushentry(out, e.x.xyzs, e.x.addr + "<br>" + e.x.sys + "<br>" + e.x.reg)
            data.push(makedata(opt, out, 4, opt["clr-bh"], opt["clr-con"]))
        } else {
            let text = e.addr + "<br>" + e.sys + "<br>" + e.reg

            if (e.basename)
                text += "<br>" + e.basename

            if (e.blackhole) {
                pushentry(out.bh, e.xyzs, text)

                text = e.x.addr + "<br>" + e.x.sys + "<br>" + e.x.reg
                if (e.x.basename)
                    text += "<br>" + e.x.basename

                pushentry(out.x, e.x.xyzs, text)
            } else if (e.deadzone)
                pushentry(out.dz, e.xyzs, text)
            else if (e.basename)
                pushentry(out.base, e.xyzs, text)
            else if (e.x && e.x.basename)
                pushentry(out.base, e.x.xyzs, text + "<br>" + e.x.basename)
            else
                pushentry(out.x, e.xyzs, text)
        }
    }

    if (out.bh.x.length > 0 && opt["inp-clr-bh"] > 0)
        data.push(makedata(opt, out.bh, opt["inp-clr-bh"], opt["clr-bh"]))

    if (out.dz.x.length > 0 && opt["inp-clr-dz"] > 0)
        data.push(makedata(opt, out.dz, opt["inp-clr-dz"], opt["clr-dz"]))

    if (out.x.x.length > 0 && opt["inp-clr-exit"] > 0)
        data.push(makedata(opt, out.x, opt["inp-clr-exit"], opt["clr-exit"]))

    if (out.base.x.length > 0 && opt["inp-clr-base"] > 0)
        data.push(makedata(opt, out.base, opt["inp-clr-base"], opt["clr-base"]))

    Plotly.react('plymap', data, bhs.changeMapLayout())
}

function getMapCk(map, xyz) {
    let x = xyz.x
    let y = xyz.y
    let z = xyz.z

    if (typeof map[x] === "undefined")
        map[x] = []
    if (typeof map[x][y] === "undefined")
        map[x][y] = []
    if (typeof map[x][y][z] === "undefined")
        map[x][y][z] = false

    return map[x][y][z]
}

function setMapCk(map, xyz) {
    map[xyz.x][xyz.y][xyz.z] = true
}

blackHoleSuns.prototype.drawChain = function (opt, xyz, depth, up) {
    if (depth-- > 0 && !getMapCk(up ? searchedup : searched, xyz)) {
        setMapCk(up ? searchedup : searched, xyz)
        let list = bhs.findClose(opt, xyz, up)

        for (let d of list) {
            if (!getMapCk(mapped, xyz)) {
                setMapCk(mapped, xyz)

                let out = initout()
                pushentry(out, d.xyzs, d.addr + "<br>" + d.sys + "<br>" + d.reg)
                pushentry(out, d.x.xyzs, d.x.addr + "<br>" + d.x.sys + "<br>" + d.x.reg)

                if (bhs.displayResults)
                    bhs.displayResults(d)

                Plotly.addTraces('plymap', makedata(opt, out, opt["inp-clr-bh"], opt["clr-bh"], up ? opt["clr-exit"] : opt["clr-con"]))

                bhs.drawChain(opt, up ? d.xyzs : d.x.xyzs, depth)
            }
        }

        bhs.drawChain(opt, xyz, depth, true)
    }
}

blackHoleSuns.prototype.findClose = function (opt, xyz, up) {
    let out = []
    let list = Object.keys(bhs.entries)

    for (let i of list) {
        let e = bhs.entries[i]

        if (e.blackhole) {
            let x = up ? e.x.xyzs.x : e.xyzs.x
            let y = up ? e.x.xyzs.y : e.xyzs.y
            let z = up ? e.x.xyzs.z : e.xyzs.z

            if (Math.abs(x - xyz.x) <= opt.chainradius && Math.abs(y - xyz.y) <= opt.chainradius && Math.abs(z - xyz.z) <= opt.chainradius)
                out.push(e)
        }
    }

    return out
}

blackHoleSuns.prototype.changeMapLayout = function (exec, zoom) {
    let fsearch = window.location.pathname == "/search.html"

    let opt = bhs.extractMapOptions()
    let ctr = bhs.addressToXYZ(opt.ctrcord)
    ctr.z = 4096 - ctr.z

    let xstart, xctr, xend
    let ystart, yctr, yend
    let zstart, zctr, zend

    if (zoom && opt.ctrzoom && !fsearch) {
        xstart = ctr.x - opt.ctrzoom
        xctr = ctr.x
        xend = ctr.x + opt.ctrzoom

        ystart = ctr.z - opt.ctrzoom
        yctr = ctr.z
        yend = ctr.z + opt.ctrzoom

        zstart = ctr.y - opt.ctrzoom
        zctr = ctr.y
        zend = ctr.y + opt.ctrzoom
    } else {
        xstart = opt.xmin
        xctr = opt.xmin + parseInt((opt.xmax - opt.xmin) / 2) - 1
        xend = opt.xmax - 1

        zstart = opt.ymin
        zctr = opt.ymin + parseInt((opt.ymax - opt.ymin) / 2) - 1
        zend = opt.ymax - 1

        ystart = opt.zmin
        yctr = opt.zmin + parseInt((opt.zmax - opt.zmin) / 2) - 1
        yend = opt.zmax - 1
    }

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

    let layout = {
        hovermode: "closest",
        showlegend: false,
        paper_bgcolor: opt["clr-page"],
        plot_bgcolor: opt["clr-bkg"],
        scene: {
            zaxis: {
                backgroundcolor: opt["clr-bkg"],
                gridcolor: opt["clr-grid"],
                zerolinecolor: opt["clr-grid"],
                showbackground: true,
                title: {
                    text: "Y",
                    font: {
                        color: opt["clr-grid"],
                    }
                },
                range: [zstart, zend],
                tickvals: [zstart, zctr, zend],
                ticktext: [zstart.toString(16), zctr.toString(16), zend.toString(16)],
                tickfont: {
                    color: opt["clr-grid"]
                },
                tickangle: 45,
            },
            xaxis: {
                backgroundcolor: opt["clr-bkg"],
                gridcolor: opt["clr-grid"],
                zerolinecolor: opt["clr-grid"],
                showbackground: true,
                title: {
                    text: "X",
                    font: {
                        color: opt["clr-grid"],
                    }
                },
                range: [xstart, xend],
                tickvals: [xstart, xctr, xend],
                ticktext: [xstart.toString(16), xctr.toString(16), xend.toString(16)],
                tickfont: {
                    color: opt["clr-grid"]
                },
                tickangle: 45,
            },
            yaxis: {
                backgroundcolor: opt["clr-bkg"],
                gridcolor: opt["clr-grid"],
                zerolinecolor: opt["clr-grid"],
                title: {
                    text: "Z",
                    font: {
                        color: opt["clr-grid"],
                    }
                },
                showbackground: true,
                range: [ystart, yend],
                tickvals: [ystart, yctr, yend],
                ticktext: [yend.toString(16), yctr.toString(16), ystart.toString(16)],
                tickfont: {
                    color: opt["clr-grid"]
                },
                tickangle: 45,
            },
        },
        // images: [{
        //     x: 100,
        //     y: 100,
        //     sizex: 1000,
        //     sizey: 1000,
        //     source: "lBTK5EL.png",
        //     xanchor: "right",
        //     xref: "paper",
        //     yanchor: "bottom",
        //     yref: "paper"
        // }]
    }

    if (opt.map3d) {
        layout.margin = {
            l: 0,
            r: 0,
            b: 0,
            t: 0
        }
    }

    let w = Math.min($("#mapcol").width(), $(window).height())
    layout.width = w
    layout.height = w

    if (exec) Plotly.relayout('plymap', layout)

    return layout
}

blackHoleSuns.prototype.traceZero = function (addr) {
    let opt = bhs.extractMapOptions()

    if (opt.addzero) {
        let zero = {
            x: 2048,
            y: 128,
            z: 2048,
        }

        let out = initout()
        pushentry(out, zero, "Galactic Center")
        pushentry(out, addr.xyzs)
        Plotly.addTraces('plymap', makedata(opt, out, 5, opt["clr-bh"], opt["clr-dz"]))
    }
}

function pushentry(out, xyz, label) {
    out.x.push(xyz.x)
    out.y.push(4095 - xyz.z)
    out.z.push(xyz.y)
    out.t.push(label)
}

function initout(out) {
    if (!out) {
        out = {}
        out.x = []
        out.y = []
        out.z = []
        out.t = []
        out.alt = []
    }

    return out
}

function makedata(opt, out, size, color, linecolor) {
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
        type: opt.map3d ? "scatter3d" : "scatter",
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