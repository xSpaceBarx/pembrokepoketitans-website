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

    const androidButton =
        document.getElementById("enable-android");

    const desktopButton =
        document.getElementById("enable-desktop");

    const setupStatus =
        document.getElementById("notification-setup-status");


    /* ============================
       PUSH SETUP
    ============================ */

    function showEnabledState() {

        if (androidButton) {
            androidButton.innerHTML =
                "✅ Notifications Enabled";
        }

        if (desktopButton) {
            desktopButton.innerHTML =
                "✅ Notifications Enabled";
        }

        if (setupStatus) {
            setupStatus.innerHTML =
                "✅ Push notifications are enabled on this device.";
        }

    }


    async function enablePushNotifications() {

        if (setupStatus) {
            setupStatus.innerHTML =
                "Enabling notifications...";
        }


        window.OneSignalDeferred =
            window.OneSignalDeferred || [];


        OneSignalDeferred.push(
            async function(OneSignal) {

                try {

                    if (
                        OneSignal.User.PushSubscription.optedIn
                    ) {

                        showEnabledState();

                        return;

                    }


                    await OneSignal.Notifications.requestPermission();


                    if (
                        !OneSignal.User.PushSubscription.optedIn
                    ) {

                        await OneSignal.User.PushSubscription.optIn();

                    }


                    if (
                        OneSignal.User.PushSubscription.optedIn
                    ) {

                        showEnabledState();

                    } else {

                        if (setupStatus) {
                            setupStatus.innerHTML =
                                "⚠️ Notifications were not enabled. Check your browser notification settings and try again.";
                        }

                    }

                } catch (error) {

                    console.error(
                        "Notification setup error:",
                        error
                    );


                    if (setupStatus) {
                        setupStatus.innerHTML =
                            "⚠️ Unable to enable notifications on this device.";
                    }

                }

            }
        );

    }


    if (androidButton) {

        androidButton.addEventListener(
            "click",
            enablePushNotifications
        );

    }


    if (desktopButton) {

        desktopButton.addEventListener(
            "click",
            enablePushNotifications
        );

    }


    /*
     * Check whether this device is already
     * subscribed when the page loads.
     */
    window.OneSignalDeferred =
        window.OneSignalDeferred || [];


    OneSignalDeferred.push(
        async function(OneSignal) {

            if (
                OneSignal.User.PushSubscription.optedIn
            ) {

                showEnabledState();

            }

        }
    );


    /* ============================
       LOAD SAVED PREFERENCES
    ============================ */

    const savedPreferences =
        JSON.parse(
            localStorage.getItem(
                "poketitans-alerts"
            )
        ) || {};


    preferenceKeys.forEach(key => {

        const checkbox =
            document.getElementById(key);


        if (!checkbox) return;


        checkbox.checked =
            savedPreferences[key] !== undefined
                ? savedPreferences[key]
                : true;

    });


    /* ============================
       SAVE PREFERENCES
    ============================ */

    const saveButton =
        document.getElementById(
            "save-alerts"
        );


    saveButton.addEventListener(
        "click",
        async () => {

            const status =
                document.getElementById(
                    "save-status"
                );


            saveButton.disabled =
                true;


            status.innerHTML =
                "Saving preferences...";


            const preferences = {};


            preferenceKeys.forEach(key => {

                preferences[key] =
                    document.getElementById(
                        key
                    ).checked;

            });


            /*
             * Save locally first.
             */
            localStorage.setItem(
                "poketitans-alerts",
                JSON.stringify(
                    preferences
                )
            );


            window.OneSignalDeferred =
                window.OneSignalDeferred || [];


            OneSignalDeferred.push(
                async function(OneSignal) {

                    try {

                        if (
                            !OneSignal.Notifications.permission
                        ) {

                            await OneSignal.Notifications.requestPermission();

                        }


                        if (
                            !OneSignal.User.PushSubscription.optedIn
                        ) {

                            await OneSignal.User.PushSubscription.optIn();

                        }


                        let subscriptionId =
                            OneSignal.User.PushSubscription.id;


                        /*
                         * Give OneSignal a moment to create
                         * the subscription if this is a new user.
                         */
                        if (!subscriptionId) {

                            await new Promise(
                                resolve =>
                                    setTimeout(
                                        resolve,
                                        1500
                                    )
                            );


                            subscriptionId =
                                OneSignal.User.PushSubscription.id;

                        }


                        if (!subscriptionId) {

                            throw new Error(
                                "OneSignal subscription ID was not available."
                            );

                        }


                        await setDoc(

                            doc(
                                db,
                                "notificationSubscribers",
                                subscriptionId
                            ),

                            {
                                subscriptionId:
                                    subscriptionId,

                                ...preferences,

                                active:
                                    true,

                                updatedAt:
                                    serverTimestamp()
                            },

                            {
                                merge:
                                    true
                            }

                        );


                        status.innerHTML =
                            "✅ Preferences Saved";


                        saveButton.disabled =
                            false;


                        showEnabledState();


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


                        status.innerHTML =
                            "⚠️ Preferences saved, but notifications are not currently enabled on this device.";


                        saveButton.disabled =
                            false;

                    }

                }
            );

        }
    );

});
