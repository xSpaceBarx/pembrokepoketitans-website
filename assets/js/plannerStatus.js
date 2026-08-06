import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const priority = {
    draft: 1,
    schedule: 2,
    published: 3
};

function formatDate(date,time){

    if(!date) return "";

    const d = new Date(`${date}T${time || "00:00"}`);

    return d.toLocaleDateString("en-US",{

        month:"short",
        day:"numeric"

    }) + (time ? ` • ${time}` : "");

}

export async function updatePlannerStatus(){

    const snapshot = await getDocs(
        collection(db,"notifications")
    );

    document.querySelectorAll(".planner-status").forEach(status=>{

        status.className="planner-status";

        status.innerHTML="⚪ Missing";

    });

    const latest={};

    snapshot.forEach(doc=>{

        const n=doc.data();

        if(!n.audience) return;

        if(

            !latest[n.audience] ||

            priority[n.status] >
            priority[latest[n.audience].status]

        ){

            latest[n.audience]=n;

        }

    });

    Object.entries(latest).forEach(([audience,n])=>{

        const badge=document.getElementById(
            `planner-${audience}`
        );

        if(!badge) return;

        let icon="⚪";
        let text="Missing";
        let css="";

        switch(n.status){

            case "draft":

                icon="🟢";
                text="Draft Saved";
                css="status-draft";
                break;

            case "schedule":

                icon="🟡";
                text="Scheduled";
                css="status-scheduled";
                break;

            case "published":

                icon="🔵";
                text="Published";
                css="status-published";
                break;

        }

        badge.classList.add(css);

        badge.innerHTML=`
            <div>${icon} ${text}</div>
            <small>${formatDate(n.date,n.time)}</small>
        `;

    });

}
