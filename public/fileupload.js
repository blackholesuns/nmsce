'use strict'
import { Timestamp, writeBatch } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"
import { bhs, blackHoleSuns } from "./commonFb.js"
import { addressToXYZ, mergeObjects, reformatAddress, uuidv4, validateAddress, validateDistance } from "./commonNms.js"
import { conflictList, economyList, galaxyList, lifeformList, ownershipList, platformList } from "./constants.js"

// Copyright 2019-2021 Black Hole Suns
// Written by Stephen Piper

blackHoleSuns.prototype.buildFilePanel = function () {
    const panel = `
    <div id="upload" class="card" style="display:none">
        <div class="card-header txt-def h5">
            <div class="row">
                <div class="col-7 txt-def h5">Bulk File Upload</div>
                <a href="https://bulk.blackholesuns.com/" class="col-7 text-right h6 txt-def">
                    <i class="fa fa-download"></i>&nbsp;Bulk Entry Sheet Download
                </a>
            </div>
        </div>

        <div class="card-body">
            <div class="row">
                <div class="col-7">
                    <input type="file" id="uploadedFile" class="form-control form-control-sm" accept=".csv">
                </div>
                <button id="fbtn-check" type="button" class="btn btn-sm btn-def">Check</button>&nbsp
                <button id="fbtn-submit" type="button" class="btn btn-sm btn-def">Submit</button>&nbsp
            </div>
            <br>

            <div class="progress">
                <div id="progress" class="progress-bar progress-bar-striped bg-success progress-bar-animated"
                    role="progressbar" style="width: 0%; display:none" aria-valuenow="0" aria-valuemin="0"
                    aria-valuemax="100"></div>
            </div>
            <br>

            <div class="row">
                <label class="col-7 txt-label-def">
                    <input id="ck-verbose" type="checkbox">
                    Verbose
                </label>
            </div>

            <div id="filestatus" class="card card-body text-danger scrollbar container-fluid" style="overflow-y: scroll; height:100px"></div>
        </div>
    </div>`

    $("#panels").append(panel)

    $("[id|='fbtn']").unbind("click")
    $("[id|='fbtn']").click(function () {
        if (bhs.saveUser()) {
            if (bhs.fileSelected)
                bhs.readTextFile(bhs.fileSelected, $(this).prop("id"))
            else
                $("#filestatus").prepend("No file selected")
        } else
            $("#filestatus").prepend("Invalid user info")
    })

    $("#uploadedFile").unbind("change")
    $("#uploadedFile").change(function () {
        bhs.fileSelected = this
    })
}

const inpCoordIdx = 4
var importTable = [{
    match: /platform/i,
    field: "platform",
    format: formatPlatform,
    group: 0
}, {
    match: /galaxy/i,
    field: "galaxy",
    format: formatGalaxy,
    group: 0
}, {
    match: /org/i,
    field: "org",
    format: formatOrg,
    group: 0
}, {
    match: /type/i,
    field: "type",
    group: 0
}, {
    match: /coord|addr/i,
    field: "addr",
    required: true,
    format: reformatAddress,
    group: 1 // black hole
}, {
    match: /reg/i,
    field: "reg",
    required: true,
    group: 1 // black hole
}, {
    match: /sys/i,
    field: "sys",
    required: true,
    group: 1 // black hole
}, {
    match: /life/i,
    field: "life",
    format: formatLife,
    group: 1 // black hole
}, {
    match: /econ/i,
    field: "econ",
    format: formatEcon,
    group: 1 // black hole
}, {
    match: /coord|addr/i,
    field: "addr",
    format: reformatAddress,
    group: 2 // exit
}, {
    match: /reg/i,
    field: "reg",
    group: 2 // exit
}, {
    match: /sys/i,
    field: "sys",
    group: 2 // exit
}, {
    match: /life/i,
    field: "life",
    format: formatLife,
    group: 2 // exit
}, {
    match: /econ/i,
    field: "econ",
    format: formatEcon,
    group: 2 // exit
}, {
    match: /own/i,
    field: "owned",
    format: formatOwned,
    group: 2 // exit
}, {
    match: /planet/i,
    field: "planet",
    group: 2 // exit
}, ]

/* type menu from spreadsheet
Black Hole
Base
DeadZone 
Single System
Edit
Delete
Delete Base
Graph
*/

var batch
var count = 0
var log = {}

blackHoleSuns.prototype.readTextFile = function (f, id) {
    let file = f.files[0]
    let reader = new FileReader()

    $("#filestatus").empty()
    bhs.setAdmin(false)

    let check = id == "fbtn-check"

    reader.onload = async function () {

        log._name = bhs.user._name
        log.galaxy = bhs.user.galaxy
        log.platform = bhs.user.platform
        log.time = Timestamp.now()
        log.file = file.name
        log.path = "fileupload/" + uuidv4() + file.name.replace(/.*(\..*)$/, "$1")
        log.log = ""

        // TODO: Last remaining reference to bhs.fbstorage
        if (!check)
            uploadBytes(ref(bhs.fbstorage, log.path), file)

        batch = writeBatch(bhs.fs)
        count = 0

        let allrows = reader.result.split(/\r?\n|\r/)

        let step = 1 / allrows.length * 100
        let width = 1
        let progress = $("#progress")
        progress.width(width + "%")
        progress.show()

        let k = 0
        let found = false

        for (; k < allrows.length && !found; ++k) {
            found = true
            let row = allrows[k].split(/[,\t]/)

            for (let i = 0; i < importTable.length; ++i) {
                importTable[i].index = -1

                for (let j = 0; j < row.length; ++j) {
                    if (row[j].search(importTable[i].match) != -1) {
                        importTable[i].index = j
                        row[j] = ""
                        break
                    }
                }

                if (importTable[i].required === true && importTable[i].index == -1) {
                    found = false
                    continue
                }
            }
        }

        if (!found) {
            bhs.filestatus("Missing required column labels.", 0)
            await bhs.fWriteLog(check)
            return
        }

        var entry = []
        let ok = true

        for (let i = k; i < allrows.length && ok; ++i, ok = true) {
            entry[1] = {}
            entry[2] = {}

            entry[0] = {}
            entry[0]._name = bhs.user._name
            entry[0].org = bhs.user.org ? bhs.user.org : ""
            entry[0].uid = bhs.user.uid
            entry[0].galaxy = bhs.user.galaxy
            entry[0].platform = bhs.user.platform
            entry[0].type = ""
            entry[0].version = bhs.user.version
            if (bhs.contest)
                entry[0].contest = bhs.contest.name

            width = Math.ceil(i * step)
            progress.css("width", width + "%")
            progress.text(i)

            let row = allrows[i].split(/[,\t]/)

            if (row.length < 2 || row[importTable[inpCoordIdx].index] === "" || row[importTable[inpCoordIdx].index] === "07FF:007F:07FF:0000")
                ok = false

            for (let j = 0; j < importTable.length && ok; ++j) {
                let idx = importTable[j].index
                let grp = importTable[j].group
                let fld = importTable[j].field

                if (idx >= 0) {
                    if (row[idx] == "") {
                        if (!entry[0].type.match(/graph/i) && (importTable[j].required === true || typeof importTable[j].required === "function" &&
                                importTable[j].required(entry[1].addr, entry[2].addr, entry[0].type))) {
                            bhs.filestatus("row: " + (i + 1) + " missing " + importTable[j].field, 0)
                            ok = false
                        }
                    } else {
                        let v = row[idx]
                        if (importTable[j].format)
                            v = importTable[j].format(v)

                        entry[grp][fld] = v
                    }
                }
            }

            if (ok) {
                entry[1] = mergeObjects(entry[1], entry[0])
                entry[2] = mergeObjects(entry[2], entry[0])
                delete entry[1].type
                delete entry[2].type

                if (entry[0].type.match(/graph/i)) {
                    bhs.getEntry(entry[1].addr, bhs.displayListEntry)
                } else if (entry[0].type.match(/edit/i)) {
                    bhs.filestatus("row: " + (i + 1) + " editing disabled.", 0)
                    //     if (typeof entry[2].addr === "undefined")
                    //         bhs.filestatus("row: " + (i + 1) + " no edit address.", 0)
                    //     else
                    //         ok = await bhs.fBatchEdit(entry[1], entry[2].addr, check)
                    // xxx save both
                } else if (entry[0].type.match(/delete base/i))
                    ok = await bhs.fBatchDeleteBase(entry[1], check)

                else if (entry[0].type.match(/delete/i))
                    ok = await bhs.fBatchDelete(entry[1], check)

                else if (entry[0].type.match(/base/i) || entry[2].addr == "0000:0000:0000:0000") {
                    let basename = entry[2].sys ? entry[2].sys : entry[2].reg
                    if (!basename) {
                        bhs.filestatus("row: " + (i + 1) + " Base name required.", 0)
                    } else {
                        ok = await bhs.fBatchUpdate(entry[1], null, check, i, true)

                        if (ok) {
                            entry[1].basename = basename
                            entry[1].owned = typeof entry[2].owned !== "undefined" ? entry[2].owned : "mine"
                            ok = await bhs.fBatchWriteBase(entry[1], null, check, i, true)
                        }
                    }
                } else if (entry[0].type.match(/single/i) || !entry[2].addr) {
                    ok = await bhs.fBatchUpdate(entry[1], null, check, i, true)
                } else {
                    entry[1].deadzone = entry[0].type.match(/dead|dz/i) || entry[2].addr == entry[1].addr
                    entry[1].blackhole = !entry[1].deadzone

                    let err = validateBHAddress(entry[1].addr)
                    ok = err === ""

                    if (ok && !entry[1].deadzone)
                        err = validateExitAddress(entry[2].addr)

                    ok = ok && err === ""

                    if (ok && !entry[1].deadzone)
                        err = validateDistance(entry[1])

                    ok = ok && err === ""

                    if (!ok)
                        bhs.filestatus("row: " + (i + 1) + " " + err, 0)

                    else
                        ok = await bhs.fBatchUpdate(entry[1], !entry[1].deadzone ? entry[2] : null, check, i)
                }
            }
        }

        if (!check) {
            await bhs.fWriteLog()
            await bhs.fCheckBatchSize(true)
        }

        progress.css("width", 100 + "%")
        progress.text("done")
    }

    reader.readAsText(file)
}

blackHoleSuns.prototype.fWriteLog = async function (check) {
    if (log.log != "" && !check)
        addDoc(collection(bhs.fs, "log"), log)
}

blackHoleSuns.prototype.fBatchUpdate = async function (entry, exit, check, i, base) {
    let ref = bhs.getStarsColRef(entry.galaxy, entry.platform, entry.addr)
    let ok = false

    if (check) {
        let doc = await getDoc(ref)
        if (doc.exists()) {
            let e = doc.data()
            if (e.uid !== entry.uid)
                bhs.filestatus("row: " + (i + 1) + " can't write over system, " + e.addr + ", created by " + e._name, 0)
        }
        return
    } else {
        let err = bhs.validateEntry(entry, base)
        if (err != "") {
            bhs.filestatus("row: " + (i + 1) + " black hole (" + err + ") " + entry.addr, 0)
            return false
        }

        if (exit) {
            let err = bhs.validateEntry(exit)
            if (err != "") {
                bhs.filestatus("row: " + (i + 1) + " exit (" + err + ") " + entry.addr, 0)
                return false
            }
        }

        delete entry.owned
        entry.xyzs = addressToXYZ(entry.addr)
        entry.dist = calcDist(entry.addr)

        if (entry.blackhole && exit) {
            entry.connection = exit.addr

            exit.modded = Timestamp.now()
            exit.xyzs = addressToXYZ(exit.addr)
            exit.dist = calcDist(exit.addr)
            entry.towardsCtr = entry.dist - exit.dist

            entry.x = {}
            entry.x.addr = exit.addr
            entry.x.xyzs = exit.xyzs
            entry.x.dist = exit.dist
            entry.x.sys = exit.sys
            entry.x.reg = exit.reg
            entry.x.life = typeof exit.life !== "undefined" ? exit.life : ""
            entry.x.econ = typeof exit.econ !== "undefined" ? exit.econ : ""
        }

        entry.modded = Timestamp.now()

        let ref = bhs.getStarsColRef(entry.galaxy, entry.platform, entry.addr)
        batch.set(ref, entry, {
            merge: true
        })
        ok = await bhs.fCheckBatchSize()

        if (ok && entry.blackhole && exit) {

            let ref = bhs.getStarsColRef(exit.galaxy, exit.platform, exit.addr)
            batch.set(ref, exit, {
                merge: true
            })
            ok = await bhs.fCheckBatchSize()
        }
    }

    return ok
}

blackHoleSuns.prototype.fBatchDelete = async function (entry, check) {
    let ref = bhs.getStarsColRef(entry.galaxy, entry.platform, entry.addr)

    if (check) {
        doc = await getDoc(ref);
        if (!doc.exists())
            bhs.filestatus(entry.addr + " doesn't exist for delete.", 0)
    } else {
        batch.delete(ref)
        return await bhs.fCheckBatchSize()
    }

    return true
}

blackHoleSuns.prototype.fBatchDeleteBase = async function (entry, check) {
    let ref = bhs.getUsersColRef(entry.uid, entry.galaxy, entry.platform, entry.addr)

    if (check) {
        await getDoc(ref).then(function (doc) {
            if (!doc.exists())
                bhs.filestatus(entry.addr + " base doesn't exist for delete.", 0)
        }).catch(err => {
            bhs.filestatus("ERROR: " + err.code, 0)
            console.log(err)
        })
    } else {
        batch.delete(ref)
        return await bhs.fCheckBatchSize()
    }

    return true
}

blackHoleSuns.prototype.fBatchWriteBase = async function (entry, check) {
    if (!check) {
        entry.modded = Timestamp.now()
        entry.xyzs = addressToXYZ(entry.addr)
        let err = await bhs.updateBase(entry)
        if (err)
            bhs.filestatus(entry.addr + " ERROR: " + err.code, 0)
        else
            bhs.filestatus(entry.addr + " base saved.", 1)
    }

    return true
}

blackHoleSuns.prototype.fCheckBatchSize = async function (flush) {
    if (flush && count > 0 || ++count > 500) {
        return await batch.commit().then(() => {
            bhs.filestatus("Commited " + count, 1)
            batch = writeBatch(bhs.fs)
            count = 0
            return true
        }).catch(err => {
            bhs.filestatus("ERROR: " + err.code + " No system info saved.<br>Try running 'Check' to discover the rows that failed.", 0)
            console.log(err)
            return false
        })
    }

    return true
}

blackHoleSuns.prototype.filestatus = function (str, lvl) {
    if (lvl == 0)
        log.log += str + "\n"

    if (lvl == 0 || $("#ck-verbose").prop("checked") && lvl == 1)
        $("#filestatus").append("<h6>" + str + "</h6>")
}

// function ckExitSysReq(bhaddr, exitaddr, type) {
//     let t = typeof type !== "undefined" ? type.toLowerCase() : ""
//     return !(t === "single" || typeof exitaddr !== "undefined" && exitaddr === bhaddr)
// }

// function ckExitAddrReq(bhaddr, exitaddr, type) {
//     let t = typeof type !== "undefined" ? type.slice(0, 4).toLowerCase() : ""
//     return !(t === "base" || typeof addr !== "undefined" && addr === "0000:0000:0000:0000")
// }

function formatOrg(val) {
    return formatListSel(val, bhs.orgList)
}

function formatEcon(val) {
    return formatListSel(val, economyList)
}

function formatConflict(val) {
    return formatListSel(val, conflictList)
}

function formatGalaxy(val) {
    return formatListSel(val, galaxyList)
}

function formatLife(val) {
    return formatListSel(val, lifeformList)
}

function formatPlatform(val) {
    return formatListSel(val, platformList)
}

function formatOwned(val) {
    return formatListSel(val, ownershipList)
}

function validateBHAddress(addr) {
    return validateAddress(addr, "bh")
}

function validateExitAddress(addr) {
    return validateAddress(addr, "exit")
}