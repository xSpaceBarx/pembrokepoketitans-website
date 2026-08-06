import { db } from "./firebase.js";
import { loadDraft } from "./editDraft.js";

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

                </div>

            </div>

            `;

        });

        document.querySelectorAll(".edit-draft").forEach(button => {

            button.addEventListener("click", () => {

                loadDraft(button.dataset.id);

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
