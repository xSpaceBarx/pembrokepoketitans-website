import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    Timestamp,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const meetupsCollection =
    collection(
        db,
        "meetups"
    );

/* ============================
   HELPERS
============================ */

function getElement(id) {
    return document.getElementById(id);
}

function formatDate(timestamp) {

    if (!timestamp) {
        return "";
    }

    const date =
        timestamp.toDate();

    return date.toLocaleDateString(
        "en-US",
        {
            weekday:
                "long",
            month:
                "long",
            day:
                "numeric",
            year:
                "numeric"
        }
    );
}

function formatTime(timestamp) {

    if (!timestamp) {
        return "";
    }

    return timestamp
        .toDate()
        .toLocaleTimeString(
            "en-US",
            {
                hour:
                    "numeric",
                minute:
                    "2-digit"
            }
        );
}

function getMeetupTimeText(meetup) {

    let timeText =
        formatTime(
            meetup.startDateTime
        );

    if (
        meetup.endTime &&
        meetup.endDateTime
    ) {

        timeText +=
            ` – ${formatTime(
                meetup.endDateTime
            )}`;
    }

    return timeText;
}

function requestNotificationDraft(
    meetup
) {

    const eventDate =
        formatDate(
            meetup.startDateTime
        );

    const timeText =
        getMeetupTimeText(
            meetup
        );

    const description =
        String(
            meetup.description || ""
        ).trim();

    let message =
        `Join us for ${meetup.title || "our upcoming PokéTitans meetup"}!\n\n` +
        `📅 ${eventDate}\n` +
        `🕕 ${timeText}\n` +
        `📍 ${meetup.location || ""}`;

    if (description) {
        message +=
            `\n\n${description}`;
    }

    message +=
        "\n\nWe hope to see you there!";

    window.dispatchEvent(
        new CustomEvent(
            "poketitans:notification-draft",
            {
                detail: {
                    source:
                        "meetup",
                    title:
                        `📍 ${meetup.title || "PokéTitans Meetup"}`,
                    message,
                    audience:
                        "meetup"
                }
            }
        )
    );
}

/* ============================
   CLEAR EDITOR
============================ */

function clearMeetupEditor() {

    getElement(
        "meetup-id"
    ).value = "";

    getElement(
        "meetup-title"
    ).value = "";

    getElement(
        "meetup-type"
    ).value =
        "Raid Hour";

    getElement(
        "meetup-date"
    ).value = "";

    getElement(
        "meetup-start-time"
    ).value = "";

    getElement(
        "meetup-end-time"
    ).value = "";

    getElement(
        "meetup-location"
    ).value =
        "Pembroke Historical Society Museum";

    getElement(
        "meetup-attendance"
    ).value = "";

    getElement(
        "meetup-description"
    ).value = "";

    getElement(
        "meetup-link"
    ).value = "";

    getElement(
        "meetup-editor-title"
    ).textContent =
        "➕ Create Meetup";

    getElement(
        "saveMeetup"
    ).textContent =
        "💾 Save Meetup";
}

/* ============================
   SAVE / UPDATE
============================ */

async function saveMeetup() {

    const id =
        getElement(
            "meetup-id"
        ).value;

    const title =
        getElement(
            "meetup-title"
        ).value.trim();

    const eventType =
        getElement(
            "meetup-type"
        ).value;

    const date =
        getElement(
            "meetup-date"
        ).value;

    const startTime =
        getElement(
            "meetup-start-time"
        ).value;

    const endTime =
        getElement(
            "meetup-end-time"
        ).value;

    const location =
        getElement(
            "meetup-location"
        ).value.trim();

    const attendance =
        getElement(
            "meetup-attendance"
        ).value.trim();

    const description =
        getElement(
            "meetup-description"
        ).value.trim();

    const link =
        getElement(
            "meetup-link"
        ).value.trim();

    if (
        !title ||
        !date ||
        !startTime ||
        !location
    ) {

        alert(
            "Please enter a title, date, start time and location."
        );

        return;
    }

    const startDate =
        new Date(
            `${date}T${startTime}:00`
        );

    let endDate;

    if (endTime) {

        endDate =
            new Date(
                `${date}T${endTime}:00`
            );

    } else {

        endDate =
            startDate;
    }

    if (
        Number.isNaN(
            startDate.getTime()
        ) ||
        Number.isNaN(
            endDate.getTime()
        )
    ) {

        alert(
            "Please enter a valid meetup date and time."
        );

        return;
    }

    if (
        endTime &&
        endDate < startDate
    ) {

        alert(
            "The meetup end time cannot be before the start time."
        );

        return;
    }

    const meetup = {
        title,
        eventType,
        date,
        startTime,
        endTime,
        location,
        attendance,
        description,
        link,

        startDateTime:
            Timestamp.fromDate(
                startDate
            ),

        endDateTime:
            Timestamp.fromDate(
                endDate
            ),

        updatedAt:
            serverTimestamp()
    };

    try {

        if (id) {

            await updateDoc(
                doc(
                    db,
                    "meetups",
                    id
                ),
                meetup
            );

        } else {

            meetup.createdAt =
                serverTimestamp();

            await addDoc(
                meetupsCollection,
                meetup
            );
        }

        clearMeetupEditor();

        await loadMeetups();

    } catch (error) {

        console.error(
            "Unable to save meetup:",
            error
        );

        alert(
            "Unable to save meetup."
        );
    }
}

/* ============================
   EDIT
============================ */

function editMeetup(
    id,
    meetup
) {

    getElement(
        "meetup-id"
    ).value =
        id;

    getElement(
        "meetup-title"
    ).value =
        meetup.title || "";

    getElement(
        "meetup-type"
    ).value =
        meetup.eventType ||
        "Other";

    getElement(
        "meetup-date"
    ).value =
        meetup.date || "";

    getElement(
        "meetup-start-time"
    ).value =
        meetup.startTime || "";

    getElement(
        "meetup-end-time"
    ).value =
        meetup.endTime || "";

    getElement(
        "meetup-location"
    ).value =
        meetup.location || "";

    getElement(
        "meetup-attendance"
    ).value =
        meetup.attendance || "";

    getElement(
        "meetup-description"
    ).value =
        meetup.description || "";

    getElement(
        "meetup-link"
    ).value =
        meetup.link || "";

    getElement(
        "meetup-editor-title"
    ).textContent =
        "✏ Edit Meetup";

    getElement(
        "saveMeetup"
    ).textContent =
        "💾 Update Meetup";

    document
        .querySelector(
            ".meetup-manager"
        )
        ?.scrollIntoView({
            behavior:
                "smooth",
            block:
                "start"
        });
}

/* ============================
   DUPLICATE
============================ */

function duplicateMeetup(
    meetup
) {

    getElement(
        "meetup-id"
    ).value = "";

    getElement(
        "meetup-title"
    ).value =
        meetup.title || "";

    getElement(
        "meetup-type"
    ).value =
        meetup.eventType ||
        "Other";

    getElement(
        "meetup-date"
    ).value = "";

    getElement(
        "meetup-start-time"
    ).value =
        meetup.startTime || "";

    getElement(
        "meetup-end-time"
    ).value =
        meetup.endTime || "";

    getElement(
        "meetup-location"
    ).value =
        meetup.location ||
        "Pembroke Historical Society Museum";

    getElement(
        "meetup-attendance"
    ).value =
        meetup.attendance || "";

    getElement(
        "meetup-description"
    ).value =
        meetup.description || "";

    getElement(
        "meetup-link"
    ).value = "";

    getElement(
        "meetup-editor-title"
    ).textContent =
        "📋 Duplicate Meetup";

    getElement(
        "saveMeetup"
    ).textContent =
        "💾 Save New Meetup";

    document
        .querySelector(
            ".meetup-manager"
        )
        ?.scrollIntoView({
            behavior:
                "smooth",
            block:
                "start"
        });
}

/* ============================
   DELETE
============================ */

async function deleteMeetup(
    id,
    title
) {

    const confirmed =
        confirm(
            `Delete "${title}"?`
        );

    if (!confirmed) {
        return;
    }

    try {

        await deleteDoc(
            doc(
                db,
                "meetups",
                id
            )
        );

        await loadMeetups();

    } catch (error) {

        console.error(
            "Unable to delete meetup:",
            error
        );

        alert(
            "Unable to delete meetup."
        );
    }
}

/* ============================
   LOAD MEETUPS
============================ */

async function loadMeetups() {

    const container =
        getElement(
            "meetup-list"
        );

    try {

        const meetupQuery =
            query(
                meetupsCollection,
                orderBy(
                    "startDateTime",
                    "asc"
                )
            );

        const snapshot =
            await getDocs(
                meetupQuery
            );

        const now =
            new Date();

        const meetups = [];

        snapshot.forEach(
            documentSnapshot => {

                const meetup =
                    documentSnapshot.data();

                if (
                    meetup.endDateTime &&
                    meetup.endDateTime
                        .toDate() < now
                ) {
                    return;
                }

                meetups.push({
                    id:
                        documentSnapshot.id,
                    ...meetup
                });
            }
        );

        container.innerHTML =
            "";

        if (!meetups.length) {

            const empty =
                document.createElement(
                    "p"
                );

            empty.textContent =
                "No upcoming meetups scheduled.";

            container.appendChild(
                empty
            );

            return;
        }

        meetups.forEach(
            meetup => {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "admin-card meetup-admin-card";

                const heading =
                    document.createElement(
                        "h3"
                    );

                heading.textContent =
                    meetup.title || "";

                const type =
                    document.createElement(
                        "p"
                    );

                const strong =
                    document.createElement(
                        "strong"
                    );

                strong.textContent =
                    meetup.eventType || "";

                type.appendChild(
                    strong
                );

                const date =
                    document.createElement(
                        "p"
                    );

                date.textContent =
                    `📅 ${formatDate(
                        meetup.startDateTime
                    )}`;

                const time =
                    document.createElement(
                        "p"
                    );

                time.textContent =
                    `🕕 ${getMeetupTimeText(
                        meetup
                    )}`;

                const location =
                    document.createElement(
                        "p"
                    );

                location.textContent =
                    `📍 ${meetup.location || ""}`;

                card.append(
                    heading,
                    type,
                    date,
                    time,
                    location
                );

                if (
                    meetup.attendance
                ) {

                    const attendance =
                        document.createElement(
                            "p"
                        );

                    attendance.textContent =
                        `👥 ${meetup.attendance}`;

                    card.appendChild(
                        attendance
                    );
                }

                const buttonRow =
                    document.createElement(
                        "div"
                    );

                buttonRow.className =
                    "button-row";

                const notificationButton =
                    document.createElement(
                        "button"
                    );

                notificationButton.type =
                    "button";

                notificationButton.className =
                    "btn-orange meetup-notification";

                notificationButton.textContent =
                    "🔔 Create Notification Draft";

                notificationButton.addEventListener(
                    "click",
                    () => {
                        requestNotificationDraft(
                            meetup
                        );
                    }
                );

                const duplicateButton =
                    document.createElement(
                        "button"
                    );

                duplicateButton.type =
                    "button";

                duplicateButton.className =
                    "btn-orange meetup-duplicate";

                duplicateButton.textContent =
                    "📋 Duplicate";

                duplicateButton.addEventListener(
                    "click",
                    () => {
                        duplicateMeetup(
                            meetup
                        );
                    }
                );

                const editButton =
                    document.createElement(
                        "button"
                    );

                editButton.type =
                    "button";

                editButton.className =
                    "btn-orange meetup-edit";

                editButton.textContent =
                    "✏ Edit";

                editButton.addEventListener(
                    "click",
                    () => {
                        editMeetup(
                            meetup.id,
                            meetup
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
                    "btn-orange meetup-delete";

                deleteButton.textContent =
                    "🗑 Delete";

                deleteButton.addEventListener(
                    "click",
                    () => {
                        deleteMeetup(
                            meetup.id,
                            meetup.title
                        );
                    }
                );

                buttonRow.append(
                    notificationButton,
                    duplicateButton,
                    editButton,
                    deleteButton
                );

                card.appendChild(
                    buttonRow
                );

                container.appendChild(
                    card
                );
            }
        );

    } catch (error) {

        console.error(
            "Unable to load meetups:",
            error
        );

        container.innerHTML =
            "";

        const message =
            document.createElement(
                "p"
            );

        message.textContent =
            "Unable to load meetups.";

        container.appendChild(
            message
        );
    }
}

/* ============================
   INITIALIZE
============================ */

export async function initMeetupManager() {

    getElement(
        "saveMeetup"
    ).addEventListener(
        "click",
        saveMeetup
    );

    getElement(
        "clearMeetup"
    ).addEventListener(
        "click",
        clearMeetupEditor
    );

    await loadMeetups();
}
