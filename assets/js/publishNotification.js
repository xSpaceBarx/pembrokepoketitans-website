import { db } from "./firebase.js";

import {
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function publishNotification(id){

    if(!id){

        alert("Please save this notification before publishing.");

        return;

    }

    await updateDoc(

        doc(db,"notifications",id),

        {

            status:"published",

            publishedAt:serverTimestamp(),

            updated:serverTimestamp()

        }

    );

}
