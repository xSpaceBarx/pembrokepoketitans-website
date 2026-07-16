import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA1b9avIssQS8eRCDddguEaUwXPPf7t994",
    authDomain: "pembroke-poketitans.firebaseapp.com",
    projectId: "pembroke-poketitans",
    storageBucket: "pembroke-poketitans.firebasestorage.app",
    messagingSenderId: "921044433143",
    appId: "1:921044433143:web:8081207a672b37dac5fbf2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadTrainers() {

    const trainerList = document.getElementById("trainer-list");

    trainerList.innerHTML = "<p>Loading Trainers...</p>";

    try {

        const snapshot = await getDocs(collection(db, "trainers"));

        trainerList.innerHTML = "";

        snapshot.forEach(doc => {

            const trainer = doc.data();

            trainerList.innerHTML += `
                <div class="event-card">

                    <h3>${trainer.trainerName}</h3>

                    <p><strong>Friend Code:</strong> ${trainer.friendCode}</p>

                    <p><strong>Location:</strong> ${trainer.location}</p>

                </div>
            `;

        });

    } catch (error) {

        console.error(error);

        trainerList.innerHTML =
            "<p>Unable to load trainers.</p>";

    }

}

loadTrainers();
