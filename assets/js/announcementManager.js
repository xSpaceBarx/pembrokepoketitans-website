import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const TIME_ZONE =
    "America/New_York";

const ANNOUNCEMENT_COLLECTION =
    "siteAnnouncements";

const ANNOUNCEMENT_DOC_ID =
    "homepage";

let announcementExists =
    false;

function getElement(id) {
    return document.getElementById(id);
}

function timestampToDate(value) {

    if (!value) return null;

    if (
        typeof value.toDate ===
        "function"
    ) {
        return value.toDate();
    }

    const converted =
        new Date(value);

    return Number.isNaN(
        converted.getTime()
    )
        ? null
        : converted;
}

function formatDateTime(value) {

    const date =
        timestampToDate(value);

    if (!date) return "";

    return new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone:
                TIME_ZONE,
            month:
                "short",
            day:
                "numeric",
            year:
                "numeric",
            hour:
                "numeric",
            minute:
                "2-digit"
        }
    ).format(date);
}

function splitEasternDateTime(value) {

    const date =
        timestampToDate(value);

    if (!date) {
        return {
            date: "",
            time: ""
        };
    }

    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    TIME_ZONE,
                year:
                    "numeric",
                month:
                    "2-digit",
                day:
                    "2-digit",
                hour:
                    "2-digit",
                minute:
                    "2-digit",
                hourCycle:
                    "h23"
            }
        ).formatToParts(date);

    const values = {};

    parts.forEach(part => {

        if (
            part.type !==
            "literal"
        ) {
            values[part.type] =
                part.value;
        }
    });

    return {
        date:
            `${values.year}-${values.month}-${values.day}`,
        time:
            `${values.hour}:${values.minute}`
    };
}

function getTimeZoneOffsetMs(
    date,
    timeZone
) {

    const parts =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone,
                year:
                    "numeric",
                month:
                    "2-digit",
                day:
                    "2-digit",
                hour:
                    "2-digit",
                minute:
                    "2-digit",
                second:
                    "2-digit",
                hourCycle:
                    "h23"
            }
        ).formatToParts(date);

    const values = {};

    parts.forEach(part => {

        if (
            part.type !==
            "literal"
        ) {
            values[part.type] =
                Number(
                    part.value
                );
        }
    });

    const representedAsUtc =
        Date.UTC(
            values.year,
            values.month - 1,
            values.day,
            values.hour,
            values.minute,
            values.second
        );

    return (
        representedAsUtc -
        date.getTime()
    );
}

function easternDateTimeToDate(
    dateString,
    timeString
) {

    if (
        !dateString ||
        !timeString
    ) {
        return null;
    }

    const [
        year,
        month,
        day
    ] =
        dateString
            .split("-")
            .map(Number);

    const [
        hour,
        minute
    ] =
        timeString
            .split(":")
            .map(Number);

    if (
        !year ||
        !month ||
        !day ||
        Number.isNaN(hour) ||
        Number.isNaN(minute)
    ) {
        return null;
    }

    const localAsUtc =
        Date.UTC(
            year,
            month - 1,
            day,
            hour,
            minute,
            0
        );

    let candidate =
        new Date(localAsUtc);

    let offset =
        getTimeZoneOffsetMs(
            candidate,
            TIME_ZONE
        );

    candidate =
        new Date(
            localAsUtc -
            offset
        );

    const correctedOffset =
        getTimeZoneOffsetMs(
            candidate,
            TIME_ZONE
        );

    if (
        correctedOffset !==
        offset
    ) {
        candidate =
            new Date(
                localAsUtc -
                correctedOffset
            );
    }

    return candidate;
}

function getEasternTodayString() {

    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    TIME_ZONE,
                year:
                    "numeric",
                month:
                    "2-digit",
                day:
                    "2-digit"
            }
        ).formatToParts(
            new Date()
        );

    const values = {};

    parts.forEach(part => {

        if (
            part.type !==
            "literal"
        ) {
            values[part.type] =
                part.value;
        }
    });

    return (
        `${values.year}-` +
        `${values.month}-` +
        `${values.day}`
    );
}

function getAnnouncementStatus(
    data
) {

    if (!announcementExists) {
        return "⚪ No announcement saved";
    }

    if (!data?.enabled) {
        return "⚪ Disabled";
    }

    const now =
        new Date();

    const start =
        timestampToDate(
            data.startAt
        );

    const end =
        timestampToDate(
            data.endAt
        );

    if (
        start &&
        start > now
    ) {
        return (
            "🕒 Scheduled for " +
            formatDateTime(start)
        );
    }

    if (
        end &&
        end <= now
    ) {
        return (
            "⚫ Expired " +
            formatDateTime(end)
        );
    }

    if (
        !data.title ||
        !data.message
    ) {
        return (
            "⚠ Enabled but missing title or message"
        );
    }

    if (end) {
        return (
            "🟢 Live until " +
            formatDateTime(end)
        );
    }

    return "🟢 Live";
}

function updateStatus(
    data = null
) {

    const status =
        getElement(
            "announcement-admin-status"
        );

    if (!status) return;

    status.textContent =
        getAnnouncementStatus(
            data
        );
}

function clearScheduleFields() {

    getElement(
        "announcement-start-date"
    ).value = "";

    getElement(
        "announcement-start-time"
    ).value = "";

    getElement(
        "announcement-end-date"
    ).value = "";

    getElement(
        "announcement-end-time"
    ).value = "";
}

function populateEditor(
    data = null
) {

    getElement(
        "announcement-enabled"
    ).checked =
        data?.enabled === true;

    getElement(
        "announcement-title-admin"
    ).value =
        data?.title || "";

    getElement(
        "announcement-message-admin"
    ).value =
        data?.message || "";

    getElement(
        "announcement-posted-date"
    ).value =
        data?.postedDate ||
        getEasternTodayString();

    clearScheduleFields();

    const startParts =
        splitEasternDateTime(
            data?.startAt
        );

    const endParts =
        splitEasternDateTime(
            data?.endAt
        );

    getElement(
        "announcement-start-date"
    ).value =
        startParts.date;

    getElement(
        "announcement-start-time"
    ).value =
        startParts.time;

    getElement(
        "announcement-end-date"
    ).value =
        endParts.date;

    getElement(
        "announcement-end-time"
    ).value =
        endParts.time;

    updateStatus(
        data
    );
}

function getOptionalEasternDateTime(
    dateId,
    timeId,
    label
) {

    const dateValue =
        getElement(
            dateId
        ).value;

    const timeValue =
        getElement(
            timeId
        ).value;

    if (
        !dateValue &&
        !timeValue
    ) {
        return null;
    }

    if (
        !dateValue ||
        !timeValue
    ) {
        throw new Error(
            `${label} requires both a date and time.`
        );
    }

    const converted =
        easternDateTimeToDate(
            dateValue,
            timeValue
        );

    if (
        !converted ||
        Number.isNaN(
            converted.getTime()
        )
    ) {
        throw new Error(
            `Please enter a valid ${label.toLowerCase()}.`
        );
    }

    return converted;
}

async function loadAnnouncement() {

    try {

        const announcementRef =
            doc(
                db,
                ANNOUNCEMENT_COLLECTION,
                ANNOUNCEMENT_DOC_ID
            );

        const snapshot =
            await getDoc(
                announcementRef
            );

        announcementExists =
            snapshot.exists();

        if (!announcementExists) {

            populateEditor(
                null
            );

            return;
        }

        populateEditor(
            snapshot.data()
        );

    } catch (error) {

        console.error(
            "Unable to load announcement:",
            error
        );

        getElement(
            "announcement-admin-status"
        ).textContent =
            "Unable to load announcement.";
    }
}

async function saveAnnouncement() {

    const enabled =
        getElement(
            "announcement-enabled"
        ).checked;

    const title =
        getElement(
            "announcement-title-admin"
        )
            .value
            .trim();

    const message =
        getElement(
            "announcement-message-admin"
        )
            .value
            .trim();

    const postedDate =
        getElement(
            "announcement-posted-date"
        ).value ||
        getEasternTodayString();

    if (
        title.length > 100
    ) {
        alert(
            "Announcement title must be 100 characters or fewer."
        );
        return;
    }

    if (
        message.length > 1000
    ) {
        alert(
            "Announcement message must be 1,000 characters or fewer."
        );
        return;
    }

    if (
        enabled &&
        (
            title.length === 0 ||
            message.length === 0
        )
    ) {
        alert(
            "An enabled announcement requires both a title and message."
        );
        return;
    }

    let startDate;
    let endDate;

    try {

        startDate =
            getOptionalEasternDateTime(
                "announcement-start-date",
                "announcement-start-time",
                "Start time"
            );

        endDate =
            getOptionalEasternDateTime(
                "announcement-end-date",
                "announcement-end-time",
                "End time"
            );

    } catch (error) {

        alert(
            error.message
        );

        return;
    }

    if (
        startDate &&
        endDate &&
        endDate <= startDate
    ) {
        alert(
            "Announcement end time must be after the start time."
        );
        return;
    }

    const payload = {
        enabled,
        title,
        message,
        postedDate,
        startAt:
            startDate
                ? Timestamp.fromDate(
                    startDate
                  )
                : null,
        endAt:
            endDate
                ? Timestamp.fromDate(
                    endDate
                  )
                : null,
        updatedAt:
            serverTimestamp()
    };

    if (!announcementExists) {
        payload.createdAt =
            serverTimestamp();
    }

    try {

        const saveButton =
            getElement(
                "saveAnnouncement"
            );

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";

        await setDoc(
            doc(
                db,
                ANNOUNCEMENT_COLLECTION,
                ANNOUNCEMENT_DOC_ID
            ),
            payload,
            {
                merge: true
            }
        );

        announcementExists =
            true;

        await loadAnnouncement();

        alert(
            enabled
                ? "✅ Announcement saved."
                : "✅ Announcement saved as disabled."
        );

    } catch (error) {

        console.error(
            "Unable to save announcement:",
            error
        );

        alert(
            error.message ||
            "Unable to save announcement."
        );

    } finally {

        const saveButton =
            getElement(
                "saveAnnouncement"
            );

        saveButton.disabled =
            false;

        saveButton.textContent =
            "💾 Save Announcement";
    }
}

async function disableAnnouncement() {

    if (!announcementExists) {

        getElement(
            "announcement-enabled"
        ).checked =
            false;

        updateStatus(
            null
        );

        return;
    }

    const confirmed =
        confirm(
            "Disable the homepage announcement now?"
        );

    if (!confirmed) {
        return;
    }

    try {

        await setDoc(
            doc(
                db,
                ANNOUNCEMENT_COLLECTION,
                ANNOUNCEMENT_DOC_ID
            ),
            {
                enabled: false,
                updatedAt:
                    serverTimestamp()
            },
            {
                merge: true
            }
        );

        await loadAnnouncement();

        alert(
            "✅ Announcement disabled."
        );

    } catch (error) {

        console.error(
            "Unable to disable announcement:",
            error
        );

        alert(
            error.message ||
            "Unable to disable announcement."
        );
    }
}

export async function initAnnouncementManager() {

    const manager =
        getElement(
            "announcement-manager"
        );

    if (!manager) {
        return;
    }

    getElement(
        "saveAnnouncement"
    ).addEventListener(
        "click",
        saveAnnouncement
    );

    getElement(
        "disableAnnouncement"
    ).addEventListener(
        "click",
        disableAnnouncement
    );

    await loadAnnouncement();
}
