import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadTrainers() {

    const trainerList = document.getElementById("trainer-list");

    trainerList.innerHTML = "<p>Loading Trainers...</p>";

    try {

        const snapshot = await getDocs(collection(db, "trainers"));

        trainerList.innerHTML = "";

        if (snapshot.empty) {
            trainerList.innerHTML = "<p>No trainers found.</p>";
            return;
        }

        snapshot.forEach(doc => {

            const trainer = doc.data();

trainerList.innerHTML += `

    <div class="event-card">

        <h3>${trainer.trainerName}</h3>

        <p>📍 ${trainer.location}</p>

        <p class="friend-code">
            ${trainer.friendCode}
        </p>

        <button
            class="hero-button copy-button"
            data-code="${trainer.friendCode.replace(/\s/g, "")}">
            Copy Friend Code
        </button>

    </div>

`;

        });

    } catch (error) {

        console.error("Firestore Error:", error);

        trainerList.innerHTML =
            "<p>Unable to load trainers.</p>";

    }

}

loadTrainers();
