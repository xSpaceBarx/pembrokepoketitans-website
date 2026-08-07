import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const WORKER_URL =
    "https://poketitan-notifications.xspacebarx.workers.dev/";


export async function publishNotification(id) {

    if (!id) {
        alert("Please save this notification before publishing.");
        return false;
    }

    try {

        /*
         * Load the notification from Firestore.
         */
        const notificationRef =
            doc(db, "notifications", id);

        const notificationSnap =
            await getDoc(notificationRef);


        if (!notificationSnap.exists()) {
            alert("Unable to find this notification.");
            return false;
        }


        const notification =
            notificationSnap.data();


        /*
         * Make sure we have everything needed
         * to send the push notification.
         */
        if (
            !notification.title ||
            !notification.message ||
            !notification.audience
        ) {
            alert(
                "This notification is missing a title, message or audience."
            );

            return false;
        }


        /*
         * Scheduled notifications will be wired up
         * separately. Do not accidentally send them now.
         */
        if (notification.delivery === "schedule") {

            alert(
                "Scheduled delivery is not connected yet. " +
                "This notification was not sent."
            );

            return false;
        }


        /*
         * Send to the PokéTitans Cloudflare Worker.
         *
         * The Worker:
         * 1. Reads notificationSubscribers from Firebase
         * 2. Finds users subscribed to this audience
         * 3. Sends only to those OneSignal subscription IDs
         */
        const response = await fetch(
            WORKER_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    title: notification.title,
                    message: notification.message,
                    audience: notification.audience
                })
            }
        );


        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                "The notification server returned an invalid response."
            );
        }


        console.log(
            "PokéTitans notification response:",
            result
        );


        /*
         * Cloudflare or OneSignal reported an error.
         */
        if (!response.ok || !result.success) {

            console.error(
                "Notification send failed:",
                result
            );

            alert(
                "Unable to send notification. " +
                "The draft has NOT been marked as published."
            );

            return false;
        }


        /*
         * Nobody currently has this category enabled.
         */
        if (
            result.sent === false ||
            result.recipients === 0
        ) {

            alert(
                "This notification was not sent because " +
                "there are no subscribers for this alert category."
            );

            return false;
        }


        /*
         * OneSignal accepted the notification.
         * Now mark the Firestore notification as published.
         */
        await updateDoc(
            notificationRef,
            {
                status: "published",

                publishedAt:
                    serverTimestamp(),

                updated:
                    serverTimestamp(),

                recipientCount:
                    result.recipients || 0,

                oneSignalNotificationId:
                    result.oneSignalResponse?.id || null
            }
        );


        console.log(
            `Notification sent to ${result.recipients || 0} subscriber(s).`
        );


        return true;


    } catch (error) {

        console.error(
            "Publish notification error:",
            error
        );

        alert(
            "Unable to send notification. " +
            "Please check the console for details."
        );

        return false;
    }
}
