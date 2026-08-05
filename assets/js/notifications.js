window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function (OneSignal) {

    document.getElementById("save-alerts").onclick = async function () {

        await OneSignal.User.addTags({

            alerts_meetups: document.getElementById("meetups").checked,

            alerts_gopass: document.getElementById("gopass").checked,

            alerts_events: document.getElementById("events").checked,

            alerts_codes: document.getElementById("codes").checked,

            alerts_news: document.getElementById("news").checked

        });

        document.getElementById("save-status").innerHTML =
            "✅ Preferences Saved";

    };

});
