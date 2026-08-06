import { db } from "./firebase.js";

import {
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function deleteDraft(id){

    const confirmed = confirm(
        "Delete this draft?"
    );

    if(!confirmed) return;

    await deleteDoc(
        doc(db,"notifications",id)
    );

}
