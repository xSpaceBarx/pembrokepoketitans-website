import { db } from "./firebase.js";
import { loadTrainers } from "./trainers.js";

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const form = document.getElementById("trainer-form");

// Friend Code input
const friendCodeInput = document.getElementById("friendCode");

// Location fields
const locationSelect = document.getElementById("location");
const otherLocation = document.getElementById("otherLocation");

// -----------------------------
// Show/Hide Other Location Box
// -----------------------------

if (locationSelect && otherLocation) {

    locationSelect.addEventListener("change", () => {

        if (locationSelect.value === "Other") {

            otherLocation.style.display = "block";
            otherLocation.required = true;

        } else {

            otherLocation.style.display = "none";
            otherLocation.required = false;
            otherLocation.value = "";

        }

    });

}

// -----------------------------
// Auto-format Friend Code
// -----------------------------

if (friendCodeInput) {

    friendCodeInput.addEventListener("input", (e) => {

        let value = e.target.value.replace(/\D/g, "");

        value = value.substring(0, 12);

        if (value.length > 8) {

            value =
                value.substring(0,4) + " " +
                value.substring(4,8) + " " +
                value.substring(8);

        }
        else if (value.length > 4) {

            value =
                value.substring(0,4) + " " +
                value.substring(4);

        }

        e.target.value = value;

    });

}

console.log("submit.js loaded");

if (form) {

    console.log("Found trainer form");

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        console.log("Submit button clicked");

        const trainerName =
            document.getElementById("trainerName").value.trim();

        let friendCode =
            document.getElementById("friendCode").value.replace(/\D/g, "");

        let location = locationSelect.value;

        if (location === "Other") {

            location = otherLocation.value.trim();

        }

        // Validation

        if (trainerName.length < 3) {

            alert("Please enter a valid Trainer Name.");
            return;

        }

        if (friendCode.length !== 12) {

            alert("Friend Code must contain exactly 12 digits.");
            return;

        }

        if (location === "") {

            alert("Please enter your main play location.");
            return;

        }

        // Format Friend Code

        const formattedFriendCode =
            friendCode.substring(0,4) + " " +
            friendCode.substring(4,8) + " " +
            friendCode.substring(8,12);

        try {

            const docRef = await addDoc(collection(db, "trainers"), {

                trainerName,
                friendCode: formattedFriendCode,
                location

            });

            console.log("SUCCESS!", docRef.id);

            document.getElementById("submit-message").innerHTML =
                "✅ Trainer added successfully!";

            form.reset();

            otherLocation.style.display = "none";

            await loadTrainers();

        }

        catch (error) {

            console.error("FIREBASE ERROR:", error);

            alert(error.message);

        }

    });

}