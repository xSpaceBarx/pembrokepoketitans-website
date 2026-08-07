import { db } from "./firebase.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const preferenceKeys = [
    "meetup",
    "raidhour",
    "spotlight",
    "maxmonday",
    "raidrotation",
    "gopass",
    "communityday",
    "raidday",
    "hatchday",
    "globalevent",
    "trinket",
    "research",
    "codes",
    "news"
];


document.addEventListener("DOMContentLoaded", () => {

    const savedPreferences = JSON.parse(
        localStorage.getItem("poketitans-alerts")
    ) || {};


    // Load preferences.
    // Any preference that has never been saved defaults to ON.
    preferenceKeys.forEach(key => {

        const checkbox = document.getElementById(key);

        if (!checkbox) return;

        checkbox.checked =
            savedPreferences[key] !== undefined
                ? savedPreferences[key]
                : true;

    });


    const saveButton = document.getElementById("save-alerts");

    saveButton.addEventListener("click", async () => {

        const status = document.getElementById("save-status");

        saveButton.disabled = true;

        status.innerHTML = "Saving preferences...";


        const preferences = {};

        preferenceKeys.forEach(key => {

            preferences[key] =
                document.getElementById(key).checked;

        });


        // Always save locally first.
        localStorage.setItem(
            "poketitans-alerts",
            JSON.stringify(preferences)
        );


        try {

            window.OneSignalDeferred =
                window.OneSignalDeferred || [];


            OneSignalDeferred.push(async function(OneSignal) {

                try {

                    /*
                     * If notification permission has not been granted,
                     * ask the user now.
                     */
                    if (!OneSignal.Notifications.permission) {

                        await OneSignal.Notifications.requestPermission();

                    }


                    /*
                     * Make sure this browser/device actually has
                     * an active OneSignal push subscription.
                     */
                    if (!OneSignal.User.PushSubscription.optedIn) {

                        await OneSignal.User.PushSubscription.optIn();

                    }


                    /*
                     * Get the unique OneSignal Push Subscription ID.
                     */
                    let subscriptionId =
                        OneSignal.User.PushSubscription.id;


                    /*
                     * Sometimes OneSignal needs a moment after opt-in
                     * before the subscription ID becomes available.
                     */
                    if (!subscriptionId) {

                        await new Promise(resolve =>
                            setTimeout(resolve, 1500)
                        );

                        subscriptionId =
                            OneSignal.User.PushSubscription.id;

                    }


                    if (!subscriptionId) {

                        throw new Error(
                            "OneSignal subscription ID was not available."
                        );

                    }


                    /*
                     * Save this device and its 14 notification
                     * preferences to Firestore.
                     *
                     * Each OneSignal subscription gets its own document.
                     */
                    await setDoc(

                        doc(
                            db,
                            "notificationSubscribers",
                            subscriptionId
                        ),

                        {
                            subscriptionId: subscriptionId,

                            ...preferences,

                            active: true,

                            updatedAt: serverTimestamp()
                        },

                        {
                            merge: true
                        }

                    );


                    status.innerHTML =
                        "✅ Preferences Saved";

                    saveButton.disabled = false;


                    console.log(
                        "PokéTitans notification preferences saved:",
                        subscriptionId,
                        preferences
                    );

                } catch (error) {

                    console.error(
                        "Unable to save notification subscription:",
                        error
                    );


                    /*
                     * The local preferences were still saved even if
                     * notification permission was denied.
                     */
                    status.innerHTML =
                        "⚠️ Preferences saved, but browser notifications are not currently enabled.";

                    saveButton.disabled = false;

                }

            });

        } catch (error) {

            console.error(error);

            status.innerHTML =
                "⚠️ Unable to save notification preferences.";

            saveButton.disabled = false;

        }

    });

});
