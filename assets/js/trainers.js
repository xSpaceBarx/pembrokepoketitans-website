import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadTrainers() {

    const trainerList = document.getElementById("trainer-list");

    trainerList.innerHTML = "<p>Loading Trainers...</p>";

    try {

        const q = query(
            collection(db, "trainers"),
            orderBy("trainerName")
        );

        const snapshot = await getDocs(q);

        trainerList.innerHTML = "";

        if (snapshot.empty) {

            trainerList.innerHTML =
                "<p>No trainers have been added yet.</p>";

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

                </div>

            `;

        });

    }

    catch (error) {

        console.error(error);

        trainerList.innerHTML =
            "<p>Unable to load trainers.</p>";

    }

}

loadTrainers();
