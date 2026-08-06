import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function saveNotification(notification, id) {

    try {

        // ==========================
        // UPDATE EXISTING DRAFT
        // ==========================

        if (id) {

            await updateDoc(
                doc(db, "notifications", id),
                {
                    ...notification,
                    updated: serverTimestamp()
                }
            );

            alert("✅ Draft Updated");

            return id;

        }

        // ==========================
        // CREATE NEW DRAFT
        // ==========================

        const newDoc = await addDoc(

            collection(db, "notifications"),

            {

                ...notification,

                status: "draft",

                created: serverTimestamp(),

                updated: serverTimestamp()

            }

        );

        // Keep editor in Edit Mode
        document.getElementById("notification-id").value = newDoc.id;

        document.getElementById("editingBanner").style.display = "block";

        document.getElementById("sendNotification").innerHTML =
            "💾 Update Draft";

        alert("✅ Draft Saved");

        return newDoc.id;

    }

    catch (err) {

        console.error(err);

        alert("Unable to save draft.");

        return null;

    }

}
