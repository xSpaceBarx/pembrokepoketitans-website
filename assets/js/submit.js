import { db } from "./firebase.js";
import { loadTrainers } from "./trainers.js";

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const form = document.getElementById("trainer-form");

if (form) {

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const trainerName = document.getElementById("trainerName").value.trim();

        let friendCode = document.getElementById("friendCode").value.replace(/\D/g, "");

        const location = document.getElementById("location").value;

        // Validation

        if (trainerName.length < 3) {
            alert("Please enter a valid Trainer Name.");
            return;
        }

        if (friendCode.length !== 12) {
            alert("Friend Code must contain 12 digits.");
            return;
        }

        if (location === "") {
            alert("Please select a location.");
            return;
        }

        // Format friend code
        friendCode =
            friendCode.substring(0,4) + " " +
            friendCode.substring(4,8) + " " +
            friendCode.substring(8,12);

        try {

    console.log("Submitting...");

    const docRef = await addDoc(collection(db, "trainers"), {
        trainerName: trainerName,
        friendCode: friendCode,
        location: location
    });

    console.log("SUCCESS!", docRef.id);

    document.getElementById("submit-message").innerHTML =
        "Added!";

    await loadTrainers();

}
catch (error) {

    console.error("Firebase write failed:", error);

    alert(
        "Code: " + error.code +
        "\n\nMessage: " + error.message
    );

}
