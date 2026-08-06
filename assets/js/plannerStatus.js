import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function updatePlannerStatus(){

    const snapshot = await getDocs(
        collection(db,"notifications")
    );

    // Reset everything
    document.querySelectorAll(".planner-status").forEach(status=>{

        status.innerHTML = "⚪ Missing";

        status.className = "planner-status";

    });

    snapshot.forEach(doc=>{

        const draft = doc.data();

        const badge = document.getElementById(
            `planner-${draft.audience}`
        );

        if(!badge) return;

        switch(draft.status){

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
