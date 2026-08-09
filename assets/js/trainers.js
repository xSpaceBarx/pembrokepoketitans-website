import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function normalizeFriendCode(value) {
    return String(value || "")
        .replace(/\D/g, "")
        .slice(0, 12);
}

function formatFriendCode(value) {

    const digits =
        normalizeFriendCode(value);

    if (digits.length !== 12) {
        return String(value || "");
    }

    return (
        digits.slice(0, 4) +
        " " +
        digits.slice(4, 8) +
        " " +
        digits.slice(8, 12)
    );
}

async function copyFriendCode(
    button,
    code
) {

    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator.clipboard.writeText(
                code
            );

        } else {

            const textArea =
                document.createElement(
                    "textarea"
                );

            textArea.value =
                code;

            textArea.style.position =
                "fixed";

            textArea.style.top =
                "-9999px";

            textArea.style.left =
                "-9999px";

            document.body.appendChild(
                textArea
            );

            textArea.focus();
            textArea.select();

            const successful =
                document.execCommand(
                    "copy"
                );

            textArea.remove();

            if (!successful) {
                throw new Error(
                    "Fallback copy failed."
                );
            }
        }

        const originalText =
            button.textContent;

        button.textContent =
            "✅ Copied!";

        setTimeout(
            () => {
                button.textContent =
                    originalText;
            },
            1500
        );

    } catch (error) {

        console.error(
            "Copy failed:",
            error
        );

        alert(
            "Unable to copy friend code. Please copy it manually."
        );
    }
}

function createTrainerCard(
    trainer
) {

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "event-card";

    const name =
        document.createElement(
            "h3"
        );

    name.textContent =
        trainer.trainerName || "";

    const location =
        document.createElement(
            "p"
        );

    location.textContent =
        `📍 ${trainer.location || ""}`;

    const friendCode =
        document.createElement(
            "p"
        );

    friendCode.className =
        "friend-code";

    friendCode.textContent =
        formatFriendCode(
            trainer.friendCode
        );

    const digits =
        normalizeFriendCode(
            trainer.friendCode
        );

    const copyButton =
        document.createElement(
            "button"
        );

    copyButton.type =
        "button";

    copyButton.className =
        "hero-button copy-button";

    copyButton.textContent =
        "Copy Friend Code";

    copyButton.disabled =
        digits.length !== 12;

    copyButton.addEventListener(
        "click",
        async () => {

            await copyFriendCode(
                copyButton,
                digits
            );
        }
    );

    card.append(
        name,
        location,
        friendCode,
        copyButton
    );

    return card;
}

export async function loadTrainers() {

    const trainerList =
        document.getElementById(
            "trainer-list"
        );

    if (!trainerList) return;

    trainerList.innerHTML = "";

    const loading =
        document.createElement(
            "p"
        );

    loading.textContent =
        "Loading Trainers...";

    trainerList.appendChild(
        loading
    );

    try {

        const trainerQuery =
            query(
                collection(
                    db,
                    "trainers"
                ),
                orderBy(
                    "trainerName"
                )
            );

        const snapshot =
            await getDocs(
                trainerQuery
            );

        const trainerCount =
            document.getElementById(
                "trainer-count"
            );

        if (trainerCount) {

            trainerCount.textContent =
                `👥 ${snapshot.size} Registered Trainer${snapshot.size === 1 ? "" : "s"}`;
        }

        trainerList.innerHTML = "";

        if (snapshot.empty) {

            const empty =
                document.createElement(
                    "p"
                );

            empty.textContent =
                "No trainers have been added yet.";

            trainerList.appendChild(
                empty
            );

            return;
        }

        snapshot.forEach(
            documentSnapshot => {

                trainerList.appendChild(
                    createTrainerCard(
                        documentSnapshot.data()
                    )
                );
            }
        );

    } catch (error) {

        console.error(
            "Unable to load trainers:",
            error
        );

        trainerList.innerHTML = "";

        const message =
            document.createElement(
                "p"
            );

        message.textContent =
            "Unable to load trainers.";

        trainerList.appendChild(
            message
        );
    }
}

loadTrainers();
