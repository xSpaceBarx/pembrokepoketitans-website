import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const WORKER_URL =
    "https://poketitan-notifications.xspacebarx.workers.dev/";


export async function deleteDraft(id) {

    const confirmed =
        confirm(
            "Delete this notification?"
        );


    if (!confirmed) {
        return false;
    }


    try {

        const notificationRef =
            doc(
                db,
                "notifications",
                id
            );


        const snapshot =
            await getDoc(
                notificationRef
            );


        if (!snapshot.exists()) {

            alert(
                "Unable to find this notification."
            );

            return false;

        }


        const notification =
            snapshot.data();


        /*
         * If this notification is scheduled
         * and has a OneSignal message ID,
         * cancel it in OneSignal first.
         */
        if (
            notification.status === "schedule" &&
            notification.oneSignalNotificationId
        ) {

            const response =
                await fetch(
                    WORKER_URL,
                    {
                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                oneSignalNotificationId:
                                    notification.oneSignalNotificationId
                            })
                    }
                );


            const result =
                await response.json();


            console.log(
                "OneSignal cancel response:",
                result
            );


            if (
                !response.ok ||
                !result.success
            ) {

                alert(
                    "Unable to cancel this scheduled notification in OneSignal. " +
                    "It has NOT been deleted from the Admin page."
                );

                return false;

            }

        }


        /*
         * OneSignal cancellation succeeded,
         * or this was not a scheduled message.
         */
        await deleteDoc(
            notificationRef
        );


        return true;


    } catch (error) {

        console.error(
            "Delete notification error:",
            error
        );


        alert(
            "Unable to delete this notification."
        );


        return false;

    }

}
