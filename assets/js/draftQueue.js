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

const audienceNames = {
    meetups: "📍 Campfire Meetup Reminders",
    gopass: "🎟 GO Pass / Lucky Trinket",
    events: "🎉 Event Start Reminders",
    codes: "🎁 Redemption Codes",
    news: "🚨 Breaking News"
};

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

        let draftCount = 0;
        let scheduledCount = 0;
        let sentCount = 0;

        draftContainer.innerHTML = "";

        snapshot.forEach(doc => {

            const draft = doc.data();
            draft.id = doc.id;

            if (draft.status === "draft") draftCount++;
            if (draft.status === "scheduled") scheduledCount++;
            if (draft.status === "sent") sentCount++;

            let badge = "🟠 Draft";

            if (draft.status === "scheduled")
                badge = "🟢 Scheduled";

            if (draft.status === "sent")
                badge = "🔵 Sent";

            draftContainer.innerHTML += `

            <div class="draft-card">

                <h3>${draft.title}</h3>

                <div class="draft-info">

                    <div>
                        <strong>📍 Audience</strong><br>
                        ${audienceNames[draft.audience] || draft.audience}
                    </div>

                    <div>
                        <strong>📅 Delivery</strong><br>
                        ${draft.delivery === "schedule" ? "Scheduled" : "Send Immediately"}
                    </div>

                    <div>
                        <strong>🗓 Date</strong><br>
                        ${draft.date || "-"}
                    </div>

                    <div>
                        <strong>🕠 Time</strong><br>
                        ${draft.time || "-"}
                    </div>

                    <div>
                        <strong>Status</strong><br>
                        <span class="draft-status">${badge}</span>
                    </div>

                </div>

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

        const counts = document.getElementById("draftCounts");

        if (counts) {

            counts.innerHTML = `
                📝 Drafts: <strong>${draftCount}</strong>
                &nbsp;&nbsp;&nbsp;
                ⏰ Scheduled: <strong>${scheduledCount}</strong>
                &nbsp;&nbsp;&nbsp;
                ✅ Sent: <strong>${sentCount}</strong>
            `;

        }

        document.querySelectorAll(".edit-draft").forEach(button => {

            button.addEventListener("click", () => {

                loadDraft(button.dataset.id);

            });

        });

        document.querySelectorAll(".duplicate-draft").forEach(button => {

            button.addEventListener("click", async () => {

                await duplicateDraft(button.dataset.id);

                loadDrafts();

            });

        });

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
