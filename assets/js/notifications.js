window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function (OneSignal) {
console.log("Subscribed:", await OneSignal.User.PushSubscription.optedIn);
console.log("OneSignal ID:", OneSignal.User.onesignalId);
    const saveButton = document.getElementById("save-alerts");
    const status = document.getElementById("save-status");

    saveButton.addEventListener("click", async () => {

        status.innerHTML = "⏳ Saving preferences...";

        try {

            await OneSignal.User.addTags({

                alerts_meetups: document.getElementById("meetups").checked ? "true" : "false",

                alerts_gopass: document.getElementById("gopass").checked ? "true" : "false",

                alerts_events: document.getElementById("events").checked ? "true" : "false",

                alerts_codes: document.getElementById("codes").checked ? "true" : "false",

                alerts_news: document.getElementById("news").checked ? "true" : "false"

            });

            // Read the tags back from OneSignal
            const tags = OneSignal.User.tags;

            console.log("Current Tags:", tags);

            status.innerHTML = "✅ Preferences Saved Successfully";

        } catch (err) {

            console.error(err);

            status.innerHTML = "❌ Unable to save preferences.";

        }

    });

});
