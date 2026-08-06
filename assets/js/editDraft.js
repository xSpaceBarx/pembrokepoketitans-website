import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadDraft(id){

    const snap = await getDoc(doc(db,"notifications",id));

    if(!snap.exists()) return;

    const draft = snap.data();

    document.getElementById("notification-title").value =
        draft.title || "";

    document.getElementById("notification-message").value =
        draft.message || "";

    document.getElementById("notification-audience").value =
        draft.audience || "meetups";

    document.getElementById("notification-delivery").value =
        draft.delivery || "now";

    document.getElementById("notification-date").value =
        draft.date || "";

    document.getElementById("notification-time").value =
        draft.time || "";

    window.scrollTo({

        top:document.querySelector(".notification-center").offsetTop-20,

        behavior:"smooth"

    });

}
