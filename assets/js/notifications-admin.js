import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function saveNotification(notification) {

    try {

        await addDoc(collection(db, "notifications"), {

            ...notification,

            status: "draft",

            created: serverTimestamp()

        });

        alert("✅ Notification draft saved.");

    }

    catch (err) {

        console.error(err);

        alert("Unable to save notification.");

    }

}
