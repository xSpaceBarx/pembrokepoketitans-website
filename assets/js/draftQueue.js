import { db } from "./firebase.js";
import { loadDraft } from "./editDraft.js";
import { deleteDraft } from "./deleteDraft.js";
import { duplicateDraft } from "./duplicateDraft.js";
import { updatePlannerStatus } from "./plannerStatus.js";
import { plannerLookup } from "./plannerLookup.js";

import {
    collection,
    getDocs,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const audienceNames = {

    meetup: "📍 PokéTitans Campfire Meetups",
    raidhour: "⚡ Raid Hour",
    spotlight: "✨ Spotlight Hour",
    maxmonday: "💎 Max Monday",
    raidrotation: "🆕 New Raid Boss Rotation",
    gopass: "🎟 Daily Bonuses & GO Pass",

    communityday: "🎉 Community Day",
    raidday: "⚔ Raid Day",
    hatchday: "🥚 Hatch Day",
    globalevent: "🌎 Global Events",
    trinket: "🍀 Lucky Trinket",
    research: "📦 Special Research",
    codes: "🎁 Redemption Codes",
    news: "🚨 Breaking News"

};

const statusPriority = {

    draft: 1,
    schedule: 2,
    published: 3

};

export async function loadDrafts() {

    const draftContainer = document.getElementById("draftQueue");

    if (!draftContainer) return;

    draftContainer.innerHTML = "Loading notifications...";

    Object.keys(plannerLookup).forEach(key => delete plannerLookup[key]);

    try {

        const q = query(
            collection(db, "notifications"),
            orderBy("created", "desc")
        );

        const snapshot = await getDocs(q);

        const drafts = [];
        const scheduled = [];
        const published = [];

        snapshot.forEach(doc => {

            const notification = {

                id: doc.id,
                ...doc.data()

            };

            const existing = plannerLookup[notification.audience];

            if (
                !existing ||
                statusPriority[notification.status] >
                statusPriority[existing.status]
            ) {

                plannerLookup[notification.audience] = {

                    id: notification.id,
                    status: notification.status

                };

            }

            switch (notification.status) {

                case "draft":
                    drafts.push(notification);
                    break;

                case "schedule":
                    scheduled.push(notification);
                    break;

                case "published":
                    published.push(notification);
                    break;

            }

        });

        document.getElementById("draftCounts").innerHTML = `
            📝 Drafts: <strong>${drafts.length}</strong>
            &nbsp;&nbsp;&nbsp;
            📅 Scheduled: <strong>${scheduled.length}</strong>
            &nbsp;&nbsp;&nbsp;
            🚀 Published: <strong>${published.length}</strong>
        `;

        draftContainer.innerHTML = "";

        renderSection("📝 Drafts", drafts);
        renderSection("📅 Scheduled", scheduled);
        renderSection("🚀 Published", published);

        wireButtons();

    }

    catch (err) {

        console.error(err);

        draftContainer.innerHTML =
            "<p>Unable to load notifications.</p>";

    }

}

function renderSection(title, list) {

    const container = document.getElementById("draftQueue");

    container.innerHTML += `<h3>${title} (${list.length})</h3>`;

    if (list.length === 0) {

        container.innerHTML += `
            <p class="empty-section">
                No notifications.
            </p>
        `;

        return;

    }

    list.forEach(notification => {

        container.innerHTML += `

        <div class="draft-card">

            <h3>${notification.title}</h3>

            <p>
                <strong>Audience:</strong>
                ${audienceNames[notification.audience] || notification.audience}
            </p>

            <p>
                <strong>Date:</strong>
                ${notification.date || "--"}
            </p>

            <p>
                <strong>Time:</strong>
                ${notification.time || "--"}
            </p>

            <div class="button-row">

                <button
                    class="edit-draft"
                    data-id="${notification.id}">
                    ✏ Edit
                </button>

                <button
                    class="duplicate-draft"
                    data-id="${notification.id}">
                    📋 Duplicate
                </button>

                <button
                    class="delete-draft"
                    data-id="${notification.id}">
                    🗑 Delete
                </button>

            </div>

        </div>

        `;

    });

}

function wireButtons() {

    document.querySelectorAll(".edit-draft").forEach(button => {

        button.addEventListener("click", () => {

            loadDraft(button.dataset.id);

        });

    });

    document.querySelectorAll(".duplicate-draft").forEach(button => {

        button.addEventListener("click", async () => {

            await duplicateDraft(button.dataset.id);

            await loadDrafts();

            await updatePlannerStatus();

        });

    });

    document.querySelectorAll(".delete-draft").forEach(button => {

        button.addEventListener("click", async () => {

            await deleteDraft(button.dataset.id);

            await loadDrafts();

            await updatePlannerStatus();

        });

    });

}

loadDrafts();
