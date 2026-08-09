import { db } from "./firebase.js";
import { loadTrainers } from "./trainers.js?v=2";

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const form =
    document.getElementById(
        "trainer-form"
    );

const friendCodeInput =
    document.getElementById(
        "friendCode"
    );

const locationSelect =
    document.getElementById(
        "location"
    );

const otherLocation =
    document.getElementById(
        "otherLocation"
    );

function formatFriendCodeInput(
    value
) {

    const digits =
        String(value || "")
            .replace(/\D/g, "")
            .slice(0, 12);

    if (digits.length > 8) {

        return (
            digits.slice(0, 4) +
            " " +
            digits.slice(4, 8) +
            " " +
            digits.slice(8)
        );
    }

    if (digits.length > 4) {

        return (
            digits.slice(0, 4) +
            " " +
            digits.slice(4)
        );
    }

    return digits;
}

if (
    locationSelect &&
    otherLocation
) {

    locationSelect.addEventListener(
        "change",
        () => {

            const isOther =
                locationSelect.value ===
                "Other";

            otherLocation.style.display =
                isOther
                    ? "block"
                    : "none";

            otherLocation.required =
                isOther;

            if (!isOther) {
                otherLocation.value =
                    "";
            }
        }
    );
}

if (friendCodeInput) {

    friendCodeInput.addEventListener(
        "input",
        event => {

            event.target.value =
                formatFriendCodeInput(
                    event.target.value
                );
        }
    );
}

if (form) {

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );

            const submitMessage =
                document.getElementById(
                    "submit-message"
                );

            const trainerName =
                document
                    .getElementById(
                        "trainerName"
                    )
                    .value
                    .trim();

            const friendCodeDigits =
                document
                    .getElementById(
                        "friendCode"
                    )
                    .value
                    .replace(/\D/g, "");

            let location =
                locationSelect.value;

            if (
                location ===
                "Other"
            ) {

                location =
                    otherLocation.value.trim();
            }

            if (
                trainerName.length <
                    3 ||
                trainerName.length >
                    30
            ) {

                alert(
                    "Trainer Name must be between 3 and 30 characters."
                );

                return;
            }

            if (
                friendCodeDigits.length !==
                12
            ) {

                alert(
                    "Friend Code must contain exactly 12 digits."
                );

                return;
            }

            if (
                !location ||
                location.length > 60
            ) {

                alert(
                    "Please enter a valid main play location."
                );

                return;
            }

            const formattedFriendCode =
                friendCodeDigits.slice(
                    0,
                    4
                ) +
                " " +
                friendCodeDigits.slice(
                    4,
                    8
                ) +
                " " +
                friendCodeDigits.slice(
                    8,
                    12
                );

            try {

                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        "Submitting...";
                }

                await addDoc(
                    collection(
                        db,
                        "trainers"
                    ),
                    {
                        trainerName,
                        friendCode:
                            formattedFriendCode,
                        location
                    }
                );

                if (submitMessage) {

                    submitMessage.textContent =
                        "✅ Trainer added successfully!";
                }

                form.reset();

                otherLocation.style.display =
                    "none";

                otherLocation.required =
                    false;

                await loadTrainers();

            } catch (error) {

                console.error(
                    "Unable to submit trainer:",
                    error
                );

                alert(
                    error.message ||
                    "Unable to submit trainer."
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Submit Trainer";
                }
            }
        }
    );
}
