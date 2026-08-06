import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const statusPriority = {
    draft: 1,
    schedule: 2,
    published: 3
};

export async function updatePlannerStatus() {

    const snapshot = await getDocs(
        collection(db, "notifications")
    );

    // Reset every planner card
    document.querySelectorAll(".planner-status").forEach(status => {

        status.innerHTML = "⚪ Missing";
        status.className = "planner-status";

    });

    const highestStatus = {};

    snapshot.forEach(doc => {

        const notification = doc.data();

        if (!notification.audience) return;

        const current = highestStatus[notification.audience];

        if (
            !current ||
            statusPriority[notification.status] >
            statusPriority[current.status]
        ) {

            highestStatus[notification.audience] = notification;

        }

    });

    Object.keys(highestStatus).forEach(audience => {

        const badge =
            document.getElementById(`planner-${audience}`);

        if (!badge) return;

        const status = highestStatus[audience].status;

        switch (status) {

            case "draft":

                badge.innerHTML = "🟢 Draft Saved";
                badge.classList.add("status-draft");
                break;

            case "schedule":

                badge.innerHTML = "🟡 Scheduled";
                badge.classList.add("status-scheduled");
                break;

            case "published":

                badge.innerHTML = "🔵 Published";
                badge.classList.add("status-published");
                break;

        }

    });

}
