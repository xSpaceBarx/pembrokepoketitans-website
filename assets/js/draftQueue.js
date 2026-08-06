import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadDrafts() {

    const draftContainer =
        document.getElementById("draftQueue");

    if (!draftContainer) return;

    draftContainer.innerHTML = "Loading drafts...";

    const q = query(
        collection(db, "notifications"),
        orderBy("created", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {

        draftContainer.innerHTML =
            "<p>No drafts yet.</p>";

        return;

    }

    draftContainer.innerHTML = "";

    snapshot.forEach(doc => {

        const draft = doc.data();

        draftContainer.innerHTML += `

        <div class="draft-card">

            <h3>${draft.title}</h3>

            <p>${draft.audience}</p>

            <span class="draft-status">
                ${draft.status}
            </span>

        </div>

        `;

    });

}
