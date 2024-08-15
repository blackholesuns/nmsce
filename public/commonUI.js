"use strict";

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"
import { blackHoleSuns, bhs } from "./commonFb.js";
import { fnmsce } from "./commonNms.js";
import { nmsce } from "./nmsce.js";

// Copyright 2019-2024 Black Hole Suns
// Written by Stephen Piper

blackHoleSuns.prototype.doLoggedout = function () {
    bhs.user = bhs.userInit();

    $("#status").empty();
    $("#filestatus").empty();
    $("#entryTable").empty();

    $("#save").addClass("disabled");
    $("#save").prop("disabled", true);

    $("#favorite").hide();
    $("#edchoice").hide();
    $("#patron").hide();
    $("#id-private").hide();
    $("#id-notifySearch").hide();
    $("#bhspoi").hide();
    $("#poiorg").hide();
    $("#setError").hide();
    $("#genDARC").hide();
    $("#id-export").hide();
    $("#btn-create").hide();
    $("#btn-export").hide();
    $("#admin").hide();
    $("#recalc").hide();
    $("#updateDARC").hide();
    $("#genDARC").hide();
    $("#genPOI").hide();
    $("#backupBHS").hide();
    $("#testing").hide();
    $("#btn-ceedit").hide();

    if (fnmsce) {
        $("#searchlocal").show();
        $("#searchlocaltt").show();
        $("#row-savesearch").hide();
        $("#id-notifySearch").hide();
    }
};

blackHoleSuns.prototype.doLoggedin = function (user) {
    $("#favorite").show();

    getDoc(doc(this.fs, "admin/" + bhs.user.uid))
        .then((doc) => {
            if (doc.exists()) {
                bhs.roles = doc.data().roles;

                if (bhs.roles.includes("nmsceEditor")) {
                    $("#edchoice").show();
                    $("#id-private").show();
                    $("#id-notifySearch").show();
                }

                if (bhs.roles.includes("nmsceAdmin")) {
                    $("#hof").show();
                    $("#patron").show();
                    $("#id-private").show();
                    $("#id-notifySearch").show();
                }

                if (bhs.roles.includes("editor") || bhs.roles.includes("admin"))
                    $("#poiorg").show();

                if (bhs.roles.includes("owner")) {
                    $("#setError").show();
                    $("#genDARC").show();
                }

                if (bhs.roles.includes("admin")) {
                    $("#bhspoi").show();
                    $("#id-export").show();
                    $("#btn-create").show();
                    $("#btn-export").show();

                    $("#admin").show();
                    $("#recalc").show();

                    if (document.domain == "localhost") {
                        $("#updateDARC").show();
                        $("#genPOI").show();
                        $("#backupBHS").show();
                        $("#testing").show();
                    }
                }
            }

            nmsce.displayUser()
        })
        .catch((err) => {
            bhs.status("ERROR: " + err.code);
            console.log(err);
        });

    // getDoc(doc(bhs.fs, "bhs/patreon/contributors/" + bhs.user.uid))
    //     .then((doc) => {
    //         if (doc.exists()) {
    //             bhs.patreon = doc.data().tier;
    //             if (bhs.patreon >= 1) $("#patron").show();

    //             if (bhs.patreon >= 2) $("#id-notifySearch").show();

    //             if (bhs.patreon >= 3) $("#id-private").show();
    //         }
    //     })
    //     .catch((err) => {
    //         bhs.status("ERROR: " + err.code);
    //         console.log(err);
    //     });

    $("#save").removeClass("disabled");
    $("#save").removeAttr("disabled");
};

blackHoleSuns.prototype.isPatreon = function (tier) { // delete patreon
    return bhs.hasRole("nmsceEditor") || bhs.hasRole("admin")
        ? true
        // : typeof bhs.patreon === "number"
        //     ? bhs.patreon >= tier
            : false;
};

blackHoleSuns.prototype.hasRole = function (role) {
    return bhs.roles && bhs.roles.includes(role);
};

blackHoleSuns.prototype.isRole = function (role) {
    return bhs.user.role === role;
};


blackHoleSuns.prototype.setAdmin = function (state) {
    bhs.user.role = bhs.user.role === "admin" || typeof state !== "undefined" && !state ? "user" : "admin"

    bhs.updateUser({
        role: bhs.user.role,
    });

    let save = $("#save")

    if (bhs.user.role === "admin" ) {
        save.removeClass("btn-def")
        save.addClass("btn-green")
        $("#id-Player").prop("disabled", true)
        if (nmsce.last)
            $("#id-Player").val(nmsce.last._name)
    }
    else {
        save.removeClass("btn-green")
        save.addClass("btn-def")
        $("#id-Player").prop("disabled", false)
        $("#id-Player").val(bhs.user._name)
    }
};

blackHoleSuns.prototype.toggleTips = function () {
    let tips =
        typeof bhs.user.inputSettings !== "undefined" &&
        !bhs.user.inputSettings.tips;

    bhs.updateUser({
        inputSettings: {
            tips: tips,
        },
    });
};

blackHoleSuns.prototype.buildMenu = function (loc, label, list, changefcn, options) {
    if (!list || list.length == 0)
        return;

    let header = `        
        <div class="row">`;
    let title = `
            <div class="size txt-label-def">title&nbsp;ttip&nbsp;</div>`;
    let block = `
            <select id="menu-idname"></select>
        </div>`;
    const item = `<option value="idname" style="font bkgcolor txtcolor cursor: pointer">iname</option>`;

    const tText = `&nbsp;
        <span class="far fa-question-circle text-danger h6" data-toggle="tooltip" data-html="true"
            data-placement="bottom" title="ttip"></span>&nbsp;`;
    const rText = `&nbsp;<span class="h5 text-danger">*</span>`;

    let id = label.nameToId();
    let h = header;

    if (typeof options === "undefined") options = {};

    if (typeof options.labelsize === "undefined") {
        if (options.vertical) options.labelsize = "col-14";
        else if (options.nolabel) options.labelsize = "col-1";
        else options.labelsize = "col-7";
    }

    if (typeof options.menusize === "undefined") {
        if (options.vertical) options.menusize = "col-7";
        else options.menusize = "col-7";
    }

    if (!options.nolabel || options.required || options.tip) {
        let t =
            (options.nolabel ? "" : label) + (options.required ? rText : "");
        let l = /title/[Symbol.replace](title, t);
        l = /size/[Symbol.replace](l, options.labelsize);

        if (options.tip) {
            l = /ttip/[Symbol.replace](l, tText);
            l = /ttip/[Symbol.replace](l, options.tip);
        } else l = /ttip/[Symbol.replace](l, "");

        h += l;
    }

    let l = /idname/g[Symbol.replace](block, id);
    l = /size/[Symbol.replace](l, options.menusize);

    l = /bkgcolor/[Symbol.replace](l, "");
    h += /txtcolor/[Symbol.replace](l, "");

    loc.find("#id-" + id).empty();
    loc.find("#id-" + id).append(h);

    let menu = loc.find("#menu-" + id)

    if (options.sort)
        list = list.sort((a, b) => a.name.localeCompare(b.name))

    for (let l of list) {
        let lid = l.name.nameToId()
        h = /idname/[Symbol.replace](item, lid)
        h = /iname/[Symbol.replace](h, /*(typeof l.number !== "undefined" ? l.number + " " : "") +*/ l.name);
        h = /font/[Symbol.replace](h, typeof options.font === "boolean" ? "font: 16pt " + l.name + ";" : typeof options.font === "string" ? "font: 16pt " + options.font + ";" : "");
        h = /bkgcolor/[Symbol.replace](h, "background-color: " + (typeof l.color === "undefined" ? "#c0c0c0" : l.color) + ";");
        h = /txtcolor/[Symbol.replace](h, typeof l.text_color === "undefined" ? "" : "color: " + l.text_color + ";");

        menu.append(h)
        bhs.bindMenuChange(menu, changefcn)
    }

    menu.val("")
}

blackHoleSuns.prototype.bindMenuChange = function (loc, fcn) {
    loc.unbind("change");
    loc.change(function () {
        if (typeof fcn === "function")
            fcn($(this))
    })
}

blackHoleSuns.prototype.setMenu = function (loc, val) {
    let text = loc.find("option:contains('" + val + "')")
    loc.val(text.val())
}

blackHoleSuns.prototype.getMenu = function (loc) {
    let val = ""

    if (loc.length > 0) {
        val = loc.val()

        if (val) {
            loc = loc.find("[value='" + val + "']")
            val = loc.text().replace(/(.*?)  \(.*/, "$1")

            if (val === " Nothing Selected" || val === "Search All")
                val = ""
        }
    }

    return val
}

