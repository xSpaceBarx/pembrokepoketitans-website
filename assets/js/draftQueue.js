import { db } from "./firebase.js";
import { loadDraft } from "./editDraft.js";
import { deleteDraft } from "./deleteDraft.js";
import { duplicateDraft } from "./duplicateDraft.js";

import {
    collection,
    getDocs,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadDrafts() {

    const draftContainer = document.getElementById("draftQueue");

    if (!draftContainer) return;

    draftContainer.innerHTML = "Loading drafts...";

    try {

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
            draft.id = doc.id;

            draftContainer.innerHTML += `

            <div class="draft-card">

                <h3>${draft.title}</h3>

                <p>Audience: ${draft.audience}</p>

                <span class="draft-status">
                    ${draft.status}
                </span>

<div class="draft-buttons">

    <button
        class="edit-draft"
        data-id="${draft.id}">
        ✏ Edit
    </button>

    <button
        class="duplicate-draft"
        data-id="${draft.id}">
        📋 Duplicate
    </button>

    <button
        class="delete-draft"
        data-id="${draft.id}">
        🗑 Delete
    </button>

</div>

            </div>

            `;

        });

        // Edit buttons
        document.querySelectorAll(".edit-draft").forEach(button => {

            button.addEventListener("click", () => {

                loadDraft(button.dataset.id);

            });

        });
        // Duplicate buttons
document.querySelectorAll(".duplicate-draft").forEach(button=>{

    button.addEventListener("click",async()=>{

        await duplicateDraft(button.dataset.id);

        loadDrafts();

    });

});
        // Delete buttons
        document.querySelectorAll(".delete-draft").forEach(button => {

            button.addEventListener("click", async () => {

                await deleteDraft(button.dataset.id);

                loadDrafts();

            });

        });

    }

    catch (err) {

        console.error(err);

        draftContainer.innerHTML =
            "<p>Unable to load drafts.</p>";

    }

}

loadDrafts();
