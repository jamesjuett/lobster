"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var outlets_1 = require("view/outlets");
var ID_TOKEN = "";
var firstTime = true;
var handleWhoAmI = function (data) {
    if (!firstTime) {
        return;
    }
    firstTime = false;
    data.lab2group = "2"; // hack to make everyone have Maize
    outlets_1.SimulationOutlet.useSourceSimulation = false;
    var simOutlet = outlets_1.SimulationOutlet.instance($("#lobster1"), {
        log: false
    });
    var elem = $(".codeListAll");
    var codeList = outlets_1.CodeList.instance(elem, "api/", simOutlet.projectEditor, false);
    simOutlet.listenTo(codeList);
    elem = $(".codeListMe");
    codeList = outlets_1.CodeList.instance(elem, "api/me/", simOutlet.projectEditor, true);
    simOutlet.listenTo(codeList);
    var projectList = outlets_1.ProjectList.instance($(".projectList"));
    simOutlet.listenTo(projectList);
    $(".friendCodeButton").click(function () {
        codeList.loadCode($(".friendsProgramName").val(), $(".friendsUniqname").val());
    });
    codeList.loadCode(data["lastFile"]);
    var dcCount = 0;
    setInterval(function () {
        if (outlets_1.CodeList.ajaxSuccessful) {
            $.ajax({
                type: "GET",
                url: "api/ping",
                success: function (xhr, statusText) {
                    dcCount = 0;
                },
                error: function (xhr, statusText) {
                    console.log("Ping failed " + (dcCount + 1) + " times.");
                    if (dcCount > 2) {
                        alert("Uh oh. It looks like you're not logged in anymore (or your internet/wireless may have died for a moment). You may want to copy the contents of the current editor just in case you didn't save earlier. Then try reloading the page to log in again.");
                        dcCount = 0;
                    }
                    else {
                        ++dcCount;
                    }
                }
            });
        }
    }, 10000);
    //        simOutlet.editor.listenTo(codeList);
    createDefaultOutlets();
};
function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + profile.getName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail());
    ID_TOKEN = googleUser.getAuthResponse().id_token;
    $.ajax({
        type: "POST",
        url: "api/whoami",
        data: { idtoken: ID_TOKEN },
        success: function (data) {
            handleWhoAmI(data);
        },
        error: function () {
            handleWhoAmI({
                lastProgram: "program.cpp",
                lab2Group: 2
            });
        },
        dataType: "json"
    });
}
$.ajax({
    type: "POST",
    url: "api/whoami",
    data: { idtoken: ID_TOKEN },
    success: function (data) {
        handleWhoAmI(data);
    },
    error: function () {
    },
    dataType: "json"
});
//# sourceMappingURL=old_main.js.map