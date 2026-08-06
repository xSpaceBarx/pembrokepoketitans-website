import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function duplicateDraft(id){

    const snap = await getDoc(
        doc(db,"notifications",id)
    );

    if(!snap.exists()) return;

    const draft = snap.data();

    await addDoc(
        collection(db,"notifications"),
        {

            ...draft,

            title: draft.title + " (Copy)",

            status: "draft",

            created: serverTimestamp(),

            updated: serverTimestamp()

        }
    );

}
