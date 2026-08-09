import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const STANDARD_LOCATIONS = [
    "Pembroke",
    "Hanover",
    "Hanson",
    "Halifax",
    "Kingston",
    "Marshfield",
    "Rockland",
    "Scituate",
    "Quincy",
    "Plymouth",
    "Abington",
    "Whitman",
    "Plympton",
    "Carver"
];

let trainers = [];
let editingTrainer = null;

function getElement(id) {
    return document.getElementById(id);
}

function normalizeFriendCode(value) {
    return String(value || "")
        .replace(/\D/g, "")
        .slice(0, 12);
}

function formatFriendCode(value) {

    const digits =
        normalizeFriendCode(value);

    if (digits.length !== 12) {
        return digits;
    }

    return (
        digits.slice(0, 4) +
        " " +
        digits.slice(4, 8) +
        " " +
        digits.slice(8, 12)
    );
}

function formatFriendCodeInput(value) {

    const digits =
        normalizeFriendCode(value);

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

function setOtherLocationVisibility(
    show,
    value = ""
) {

    const field =
        getElement(
            "trainer-admin-other-location"
        );

    if (!field) return;

    field.style.display =
        show
            ? "block"
            : "none";

    field.required = show;

    field.value =
        show
            ? value
            : "";
}

function clearTrainerEditor() {

    editingTrainer = null;

    getElement(
        "trainer-admin-id"
    ).value = "";

    getElement(
        "trainer-admin-name"
    ).value = "";

    getElement(
        "trainer-admin-code"
    ).value = "";

    getElement(
        "trainer-admin-location"
    ).value = "";

    setOtherLocationVisibility(
        false
    );

    getElement(
        "trainer-admin-editor-title"
    ).textContent =
        "Select a trainer below to edit";

    const saveButton =
        getElement(
            "saveTrainerAdmin"
        );

    saveButton.disabled = true;
    saveButton.textContent =
        "💾 Save Changes";
}

function loadTrainerIntoEditor(
    trainer
) {

    editingTrainer = trainer;

    getElement(
        "trainer-admin-id"
    ).value =
        trainer.id;

    getElement(
        "trainer-admin-name"
    ).value =
        trainer.trainerName || "";

    getElement(
        "trainer-admin-code"
    ).value =
        formatFriendCode(
            trainer.friendCode
        );

    const location =
        String(
            trainer.location || ""
        ).trim();

    const locationSelect =
        getElement(
            "trainer-admin-location"
        );

    if (
        STANDARD_LOCATIONS.includes(
            location
        )
    ) {

        locationSelect.value =
            location;

        setOtherLocationVisibility(
            false
        );

    } else if (location) {

        locationSelect.value =
            "Other";

        setOtherLocationVisibility(
            true,
            location
        );

    } else {

        locationSelect.value =
            "";

        setOtherLocationVisibility(
            false
        );
    }

    getElement(
        "trainer-admin-editor-title"
    ).textContent =
        `✏ Edit ${trainer.trainerName || "Trainer"}`;

    const saveButton =
        getElement(
            "saveTrainerAdmin"
        );

    saveButton.disabled = false;
    saveButton.textContent =
        "💾 Save Changes";

    getElement(
        "trainer-manager"
    )?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function getEditorLocation() {

    const selected =
        getElement(
            "trainer-admin-location"
        ).value;

    if (selected === "Other") {

        return getElement(
            "trainer-admin-other-location"
        ).value.trim();
    }

    return selected.trim();
}

function buildTrainerCard(
    trainer
) {

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "admin-card trainer-admin-card";

    const title =
        document.createElement(
            "h3"
        );

    title.textContent =
        trainer.trainerName ||
        "Unnamed Trainer";

    const location =
        document.createElement(
            "p"
        );

    location.textContent =
        `📍 ${trainer.location || "No location"}`;

    const code =
        document.createElement(
            "p"
        );

    code.className =
        "friend-code";

    code.textContent =
        formatFriendCode(
            trainer.friendCode
        ) ||
        "No Friend Code";

    const buttonRow =
        document.createElement(
            "div"
        );

    buttonRow.className =
        "button-row";

    const editButton =
        document.createElement(
            "button"
        );

    editButton.type =
        "button";

    editButton.className =
        "btn-orange";

    editButton.textContent =
        "✏ Edit";

    editButton.addEventListener(
        "click",
        () => {
            loadTrainerIntoEditor(
                trainer
            );
        }
    );

    const deleteButton =
        document.createElement(
            "button"
        );

    deleteButton.type =
        "button";

    deleteButton.className =
        "btn-orange";

    deleteButton.textContent =
        "🗑 Delete";

    deleteButton.addEventListener(
        "click",
        async () => {
            await deleteTrainer(
                trainer
            );
        }
    );

    buttonRow.append(
        editButton,
        deleteButton
    );

    card.append(
        title,
        location,
        code,
        buttonRow
    );

    return card;
}

function renderTrainers() {

    const list =
        getElement(
            "trainer-admin-list"
        );

    const count =
        getElement(
            "trainer-admin-count"
        );

    const searchValue =
        getElement(
            "trainer-admin-search"
        )
            .value
            .trim()
            .toLowerCase();

    const filtered =
        trainers.filter(
            trainer => {

                if (!searchValue) {
                    return true;
                }

                const searchable =
                    [
                        trainer.trainerName,
                        trainer.friendCode,
                        trainer.location
                    ]
                        .join(" ")
                        .toLowerCase();

                return searchable.includes(
                    searchValue
                );
            }
        );

    count.textContent =
        searchValue
            ? `${filtered.length} of ${trainers.length} trainers shown`
            : `${trainers.length} registered trainer${trainers.length === 1 ? "" : "s"}`;

    list.innerHTML = "";

    if (!filtered.length) {

        const empty =
            document.createElement(
                "p"
            );

        empty.textContent =
            searchValue
                ? "No trainers match your search."
                : "No trainers are currently registered.";

        list.appendChild(
            empty
        );

        return;
    }

    filtered.forEach(
        trainer => {

            list.appendChild(
                buildTrainerCard(
                    trainer
                )
            );
        }
    );
}

async function loadTrainerData() {

    const list =
        getElement(
            "trainer-admin-list"
        );

    list.textContent =
        "Loading trainers...";

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "trainers"
                )
            );

        trainers = [];

        snapshot.forEach(
            documentSnapshot => {

                trainers.push({
                    id:
                        documentSnapshot.id,
                    ...documentSnapshot.data()
                });
            }
        );

        trainers.sort(
            (a, b) =>
                String(
                    a.trainerName || ""
                ).localeCompare(
                    String(
                        b.trainerName || ""
                    ),
                    undefined,
                    {
                        sensitivity:
                            "base"
                    }
                )
        );

        renderTrainers();

    } catch (error) {

        console.error(
            "Unable to load trainers:",
            error
        );

        list.textContent =
            "Unable to load trainers.";

        getElement(
            "trainer-admin-count"
        ).textContent =
            "Trainer data unavailable.";
    }
}

async function saveTrainerChanges() {

    if (!editingTrainer) {
        return;
    }

    const id =
        getElement(
            "trainer-admin-id"
        ).value;

    const trainerName =
        getElement(
            "trainer-admin-name"
        )
            .value
            .trim();

    const friendCodeDigits =
        normalizeFriendCode(
            getElement(
                "trainer-admin-code"
            ).value
        );

    const location =
        getEditorLocation();

    if (trainerName.length < 3) {

        alert(
            "Please enter a valid Trainer Name."
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

    if (!location) {

        alert(
            "Please enter the trainer's main play location."
        );

        return;
    }

    const formattedFriendCode =
        formatFriendCode(
            friendCodeDigits
        );

    try {

        await updateDoc(
            doc(
                db,
                "trainers",
                id
            ),
            {
                trainerName,
                friendCode:
                    formattedFriendCode,
                location
            }
        );

        await loadTrainerData();

        clearTrainerEditor();

        alert(
            "✅ Trainer updated successfully."
        );

    } catch (error) {

        console.error(
            "Unable to update trainer:",
            error
        );

        alert(
            error.message ||
            "Unable to update trainer."
        );
    }
}

async function deleteTrainer(
    trainer
) {

    const confirmed =
        confirm(
            `Delete trainer "${trainer.trainerName || "Unnamed Trainer"}"?\n\nThis removes the trainer from the public directory immediately.`
        );

    if (!confirmed) {
        return;
    }

    try {

        await deleteDoc(
            doc(
                db,
                "trainers",
                trainer.id
            )
        );

        if (
            editingTrainer?.id ===
            trainer.id
        ) {
            clearTrainerEditor();
        }

        await loadTrainerData();

    } catch (error) {

        console.error(
            "Unable to delete trainer:",
            error
        );

        alert(
            error.message ||
            "Unable to delete trainer."
        );
    }
}

export async function initTrainerManager() {

    const manager =
        getElement(
            "trainer-manager"
        );

    if (!manager) {
        return;
    }

    clearTrainerEditor();

    getElement(
        "trainer-admin-search"
    ).addEventListener(
        "input",
        renderTrainers
    );

    getElement(
        "trainer-admin-code"
    ).addEventListener(
        "input",
        event => {

            event.target.value =
                formatFriendCodeInput(
                    event.target.value
                );
        }
    );

    getElement(
        "trainer-admin-location"
    ).addEventListener(
        "change",
        event => {

            setOtherLocationVisibility(
                event.target.value ===
                    "Other"
            );
        }
    );

    getElement(
        "saveTrainerAdmin"
    ).addEventListener(
        "click",
        saveTrainerChanges
    );

    getElement(
        "clearTrainerAdmin"
    ).addEventListener(
        "click",
        clearTrainerEditor
    );

    await loadTrainerData();
}
