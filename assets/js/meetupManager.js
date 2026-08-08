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
    collection(db, "meetups");


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

    const date = timestamp.toDate();

    return date.toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
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
                hour: "numeric",
                minute: "2-digit"
            }
        );
}


/* ============================
   CLEAR EDITOR
============================ */

function clearMeetupEditor() {

    getElement("meetup-id").value = "";

    getElement("meetup-title").value = "";

    getElement("meetup-type").value =
        "Raid Hour";

    getElement("meetup-date").value = "";

    getElement("meetup-start-time").value = "";

    getElement("meetup-end-time").value = "";

    getElement("meetup-location").value =
        "Pembroke Historical Society Museum";

    getElement("meetup-attendance").value = "";

    getElement("meetup-description").value = "";

    getElement("meetup-link").value = "";

    getElement("meetup-editor-title").textContent =
        "➕ Create Meetup";

    getElement("saveMeetup").textContent =
        "💾 Save Meetup";
}


/* ============================
   SAVE / UPDATE
============================ */

async function saveMeetup() {

    const id =
        getElement("meetup-id").value;

    const title =
        getElement("meetup-title").value.trim();

    const eventType =
        getElement("meetup-type").value;

    const date =
        getElement("meetup-date").value;

    const startTime =
        getElement("meetup-start-time").value;

    const endTime =
        getElement("meetup-end-time").value;

    const location =
        getElement("meetup-location").value.trim();

    const attendance =
        getElement("meetup-attendance").value.trim();

    const description =
        getElement("meetup-description").value.trim();

    const link =
        getElement("meetup-link").value.trim();


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
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
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
            Timestamp.fromDate(startDate),

        endDateTime:
            Timestamp.fromDate(endDate),

        updatedAt:
            serverTimestamp()
    };


    try {

        if (id) {

            await updateDoc(
                doc(db, "meetups", id),
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

function editMeetup(id, meetup) {

    getElement("meetup-id").value =
        id;

    getElement("meetup-title").value =
        meetup.title || "";

    getElement("meetup-type").value =
        meetup.eventType || "Other";

    getElement("meetup-date").value =
        meetup.date || "";

    getElement("meetup-start-time").value =
        meetup.startTime || "";

    getElement("meetup-end-time").value =
        meetup.endTime || "";

    getElement("meetup-location").value =
        meetup.location || "";

    getElement("meetup-attendance").value =
        meetup.attendance || "";

    getElement("meetup-description").value =
        meetup.description || "";

    getElement("meetup-link").value =
        meetup.link || "";

    getElement("meetup-editor-title").textContent =
        "✏ Edit Meetup";

    getElement("saveMeetup").textContent =
        "💾 Update Meetup";


    document
        .querySelector(".meetup-manager")
        .scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}


/* ============================
   DUPLICATE
============================ */

function duplicateMeetup(meetup) {

    // Clear ID so Save creates a NEW Firestore document
    getElement("meetup-id").value = "";

    getElement("meetup-title").value =
        meetup.title || "";

    getElement("meetup-type").value =
        meetup.eventType || "Other";

    // Leave date blank so an old date is not duplicated accidentally
    getElement("meetup-date").value = "";

    getElement("meetup-start-time").value =
        meetup.startTime || "";

    getElement("meetup-end-time").value =
        meetup.endTime || "";

    getElement("meetup-location").value =
        meetup.location ||
        "Pembroke Historical Society Museum";

    getElement("meetup-attendance").value =
        meetup.attendance || "";

    getElement("meetup-description").value =
        meetup.description || "";

    // Campfire meetup URLs should be unique
    getElement("meetup-link").value = "";

    getElement("meetup-editor-title").textContent =
        "📋 Duplicate Meetup";

    getElement("saveMeetup").textContent =
        "💾 Save New Meetup";


    document
        .querySelector(".meetup-manager")
        .scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}


/* ============================
   DELETE
============================ */

async function deleteMeetup(id, title) {

    const confirmed =
        confirm(
            `Delete "${title}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(db, "meetups", id)
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
        getElement("meetup-list");


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
            await getDocs(meetupQuery);


        const now =
            new Date();


        const meetups = [];


        snapshot.forEach(documentSnapshot => {

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
        });


        if (!meetups.length) {

            container.innerHTML = `
                <p>
                    No upcoming meetups scheduled.
                </p>
            `;

            return;
        }


        container.innerHTML = "";


        meetups.forEach(meetup => {

            const card =
                document.createElement("div");

            card.className =
                "admin-card meetup-admin-card";


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


            card.innerHTML = `

                <h3>
                    ${meetup.title}
                </h3>

                <p>
                    <strong>
                        ${meetup.eventType || ""}
                    </strong>
                </p>

                <p>
                    📅
                    ${formatDate(
                        meetup.startDateTime
                    )}
                </p>

                <p>
                    🕕 ${timeText}
                </p>

                <p>
                    📍 ${meetup.location}
                </p>

                ${
                    meetup.attendance
                        ? `<p>👥 ${meetup.attendance}</p>`
                        : ""
                }

                <button
                    class="btn-orange meetup-duplicate">

                    📋 Duplicate

                </button>

                <button
                    class="btn-orange meetup-edit">

                    ✏ Edit

                </button>

                <button
                    class="btn-orange meetup-delete">

                    🗑 Delete

                </button>

            `;


            card
                .querySelector(
                    ".meetup-duplicate"
                )
                .addEventListener(
                    "click",
                    () => {

                        duplicateMeetup(
                            meetup
                        );
                    }
                );


            card
                .querySelector(
                    ".meetup-edit"
                )
                .addEventListener(
                    "click",
                    () => {

                        editMeetup(
                            meetup.id,
                            meetup
                        );
                    }
                );


            card
                .querySelector(
                    ".meetup-delete"
                )
                .addEventListener(
                    "click",
                    () => {

                        deleteMeetup(
                            meetup.id,
                            meetup.title
                        );
                    }
                );


            container.appendChild(card);
        });


    } catch (error) {

        console.error(
            "Unable to load meetups:",
            error
        );

        container.innerHTML = `
            <p>
                Unable to load meetups.
            </p>
        `;
    }
}


/* ============================
   INITIALIZE
============================ */

export async function initMeetupManager() {

    getElement("saveMeetup")
        .addEventListener(
            "click",
            saveMeetup
        );


    getElement("clearMeetup")
        .addEventListener(
            "click",
            clearMeetupEditor
        );


    await loadMeetups();
}
