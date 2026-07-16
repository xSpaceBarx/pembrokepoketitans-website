import { db } from "./firebase.js";
import { loadTrainers } from "./trainers.js";

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const form = document.getElementById("trainer-form");

console.log("submit.js loaded");

if (form) {

    console.log("Found trainer form");

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        console.log("Submit button clicked");

        const trainerName = document.getElementById("trainerName").value.trim();
        let friendCode = document.getElementById("friendCode").value.replace(/\D/g, "");
        const location = document.getElementById("location").value;

        console.log(trainerName, friendCode, location);

        try {

            console.log("About to call addDoc...");

            const docRef = await addDoc(collection(db, "trainers"), {
                trainerName,
                friendCode,
                location
            });

            console.log("SUCCESS!", docRef.id);

            document.getElementById("submit-message").innerHTML =
                "✅ Trainer added successfully!";

            form.reset();

            await loadTrainers();

        } catch (error) {

            console.error("FIREBASE ERROR:", error);

            alert(error.message);

        }

    });

}
