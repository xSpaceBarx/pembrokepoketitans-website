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

            // Format friend code for display
            let displayCode = trainer.friendCode || "";

            const digits = displayCode.replace(/\D/g, "");

            if (digits.length === 12) {

                displayCode =
                    digits.substring(0,4) + " " +
                    digits.substring(4,8) + " " +
                    digits.substring(8,12);

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
                        data-code="${digits}">
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

                }

                catch (err) {

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