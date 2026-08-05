window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function (OneSignal) {

    alert("Notifications JS Loaded");

    console.log("OneSignal Object:", OneSignal);
    console.log("OneSignal.User:", OneSignal.User);

    document.getElementById("save-alerts").addEventListener("click", async () => {

        try {

            console.log("Saving...");

            console.log("Subscription:",
                OneSignal.User.PushSubscription.optedIn);

            console.log("OneSignal ID:",
                OneSignal.User.onesignalId);

            await OneSignal.User.addTags({
                alerts_meetups: "true"
            });

            console.log("Tags after save:",
                OneSignal.User.tags);

            document.getElementById("save-status").innerHTML =
                "Saved";

        } catch (e) {

            console.error(e);

            document.getElementById("save-status").innerHTML =
                e.toString();

        }

    });

});
