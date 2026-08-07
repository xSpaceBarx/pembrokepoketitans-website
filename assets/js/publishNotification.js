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

        alert(
            "Please save this notification before publishing."
        );

        return false;

    }


    try {

        const notificationRef =
            doc(
                db,
                "notifications",
                id
            );


        const notificationSnap =
            await getDoc(
                notificationRef
            );


        if (!notificationSnap.exists()) {

            alert(
                "Unable to find this notification."
            );

            return false;

        }


        const notification =
            notificationSnap.data();


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
         * Determine whether this is immediate
         * or scheduled delivery.
         */
        let sendAfter = null;


        if (
            notification.delivery ===
            "schedule"
        ) {

            if (
                !notification.date ||
                !notification.time
            ) {

                alert(
                    "Please choose both a date and time for the scheduled notification."
                );

                return false;

            }


            /*
             * The browser interprets this using
             * your local timezone.
             *
             * For you this means Eastern Time,
             * including daylight-saving changes.
             */
            const scheduledDate =
                new Date(
                    `${notification.date}T${notification.time}`
                );


            if (
                Number.isNaN(
                    scheduledDate.getTime()
                )
            ) {

                alert(
                    "The scheduled date or time is invalid."
                );

                return false;

            }


            if (
                scheduledDate.getTime() <=
                Date.now()
            ) {

                alert(
                    "Scheduled notifications must be set for a future time."
                );

                return false;

            }


            /*
             * Convert local date/time to the
             * UTC format OneSignal expects.
             */
            sendAfter =
                scheduledDate.toISOString();

        }


        /*
         * Send to Cloudflare.
         */
        const response =
            await fetch(
                WORKER_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            title:
                                notification.title,

                            message:
                                notification.message,

                            audience:
                                notification.audience,

                            sendAfter:
                                sendAfter

                        })
                }
            );


        let result;


        try {

            result =
                await response.json();

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
         * Cloudflare / OneSignal failure.
         */
        if (
            !response.ok ||
            !result.success ||
            !result.oneSignalResponse?.id
        ) {

            console.error(
                "Notification send failed:",
                result
            );


            const oneSignalErrors =
                result.oneSignalResponse?.errors;


            if (
                Array.isArray(
                    oneSignalErrors
                )
            ) {

                alert(
                    "OneSignal did not accept the notification:\n\n" +
                    oneSignalErrors.join("\n")
                );

            } else {

                alert(
                    "Unable to send notification. " +
                    "The notification has NOT been published."
                );

            }


            return false;

        }


        /*
         * Nobody currently has the category enabled.
         */
        if (
            result.sent === false ||
            result.recipients === 0
        ) {

            alert(
                "There are currently no subscribers for this alert category."
            );

            return false;

        }


        /*
         * Scheduled notification
         */
        if (
            notification.delivery ===
            "schedule"
        ) {

            await updateDoc(
                notificationRef,
                {

                    status:
                        "schedule",

                    updated:
                        serverTimestamp(),

                    recipientCount:
                        result.recipients || 0,

                    oneSignalNotificationId:
                        result.oneSignalResponse.id,

                    scheduledFor:
                        sendAfter

                }
            );


            return "scheduled";

        }


        /*
         * Immediate notification
         */
        await updateDoc(
            notificationRef,
            {

                status:
                    "published",

                publishedAt:
                    serverTimestamp(),

                updated:
                    serverTimestamp(),

                recipientCount:
                    result.recipients || 0,

                oneSignalNotificationId:
                    result.oneSignalResponse.id

            }
        );


        return "published";


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
