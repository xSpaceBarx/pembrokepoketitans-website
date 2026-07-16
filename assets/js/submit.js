import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function loadTrainers() {

    const trainerList = document.getElementById("trainer-list");

    if (!trainerList) return;

    trainerList.innerHTML = "<p>Loading Trainers...</p>";

    try {

        const q = query(
            collection(db, "trainers"),
            orderBy("trainerName")
        );

        const snapshot = await getDocs(q);

        const trainerCount = document.getElementById("trainer-count");

        if (trainerCount) {

            trainerCount.innerHTML =
                `👥 ${snapshot.size} Registered Trainer${snapshot.size === 1 ? "" : "s"}`;

        }

        trainerList.innerHTML = "";

        if (snapshot.empty) {

            trainerList.innerHTML =
                "<p>No trainers have been added yet.</p>";

            return;

        }

        snapshot.forEach(doc => {

            const trainer = doc.data();

            // Format every friend code for display
            let displayCode = trainer.friendCode.replace(/\D/g, "");

            if (displayCode.length === 12) {

                displayCode =
                    displayCode.substring(0,4) + " " +
                    displayCode.substring(4,8) + " " +
                    displayCode.substring(8,12);

            } else {

                displayCode = trainer.friendCode;

            }

            trainerList.innerHTML += `

                <div class="event-card">

                    <h3>${trainer.trainerName}</h3>

                    <p>📍 ${trainer.location}</p>

                    <p class="friend-code">
                        ${displayCode}
                    </p>

                    <button
                        class="hero-button copy-button"
                        data-code="${displayCode.replace(/\s/g, "")}">
                        Copy Friend Code
                    </button>

                </div>

            `;

        });

        document.querySelectorAll(".copy-button").forEach(button => {

            button.addEventListener("click", async () => {

                try {

                    await navigator.clipboard.writeText(button.dataset.code);

                    const originalText = button.innerHTML;

                    button.innerHTML = "✅ Copied!";

                    setTimeout(() => {

                        button.innerHTML = originalText;

                    }, 1500);

                } catch (err) {

                    console.error(err);

                    alert("Unable to copy friend code.");

                }

            });

        });

    }

    catch (error) {

        console.error(error);

        trainerList.innerHTML =
            "<p>Unable to load trainers.</p>";

    }

}

loadTrainers();