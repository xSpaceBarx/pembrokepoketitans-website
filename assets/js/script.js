import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("Script loaded");

let allGraphicAssets = [];
let todayGraphics = [];
let todayTransitionTimer = null;
let announcementData = null;
let announcementTransitionTimer = null;

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

function getActiveTodayGraphic(
    now = new Date()
) {

    return todayGraphics
        .filter(asset => {

            const goLive =
                timestampToDate(
                    asset.goLiveAt
                );

            const hideAfter =
                timestampToDate(
                    asset.hideAfterAt
                );

            return (
                asset.type === "today" &&
                goLive &&
                goLive <= now &&
                (
                    !hideAfter ||
                    hideAfter > now
                ) &&
                (
                    asset.imageUrl ||
                    asset.imagePath
                )
            );
        })
        .sort((a, b) => {

            const aTime =
                timestampToDate(
                    a.goLiveAt
                )?.getTime() || 0;

            const bTime =
                timestampToDate(
                    b.goLiveAt
                )?.getTime() || 0;

            return bTime - aTime;
        })[0] || null;
}


function getActiveGraphicByType(
    type,
    now = new Date()
) {

    return allGraphicAssets
        .filter(asset => {

            const goLive =
                timestampToDate(
                    asset.goLiveAt
                );

            const hideAfter =
                timestampToDate(
                    asset.hideAfterAt
                );

            return (
                asset.type === type &&
                goLive &&
                goLive <= now &&
                (
                    !hideAfter ||
                    hideAfter > now
                ) &&
                (
                    asset.imageUrl ||
                    asset.imagePath
                )
            );
        })
        .sort((a, b) => {

            const aTime =
                timestampToDate(
                    a.goLiveAt
                )?.getTime() || 0;

            const bTime =
                timestampToDate(
                    b.goLiveAt
                )?.getTime() || 0;

            return bTime - aTime;
        })[0] || null;
}

function formatGraphicEventDate(
    value
) {

    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return "";
    }

    const date =
        new Date(
            `${value}T12:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );
}

function getTodayGraphicHtml() {

    const activeToday =
        getActiveTodayGraphic();

    if (!activeToday) {
        return "";
    }

    const imageSource =
        activeToday.imageUrl ||
        activeToday.imagePath;

    return `
        <img
            src="${imageSource}"
            class="today-counters"
            alt="Today's Featured Graphic"
            onerror="this.style.display='none';">
    `;
}

function scheduleTodayTransition(
    renderNextMeetup
) {

    if (todayTransitionTimer) {

        clearTimeout(
            todayTransitionTimer
        );

        todayTransitionTimer = null;
    }

    const now =
        new Date();

    const futureTimes = [];

    todayGraphics.forEach(asset => {

        if (
            asset.type !== "today"
        ) {
            return;
        }

        const goLive =
            timestampToDate(
                asset.goLiveAt
            );

        const hideAfter =
            timestampToDate(
                asset.hideAfterAt
            );

        if (
            goLive &&
            goLive > now
        ) {
            futureTimes.push(
                goLive.getTime()
            );
        }

        if (
            hideAfter &&
            hideAfter > now
        ) {
            futureTimes.push(
                hideAfter.getTime()
            );
        }
    });

    if (!futureTimes.length) {
        return;
    }

    const nextTime =
        Math.min(
            ...futureTimes
        );

    const delay =
        Math.max(
            1000,
            nextTime -
            now.getTime() +
            1000
        );

    const MAX_TIMEOUT =
        2147483647;

    todayTransitionTimer =
        setTimeout(
            () => {

                renderNextMeetup();

                scheduleTodayTransition(
                    renderNextMeetup
                );
            },
            Math.min(
                delay,
                MAX_TIMEOUT
            )
        );
}

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            // ==========================
            // MEET UPS + TODAY GRAPHIC
            // ==========================

            const [
                meetupSnapshot,
                graphicsSnapshot
            ] =
                await Promise.all([
                    getDocs(
                        query(
                            collection(
                                db,
                                "meetups"
                            ),
                            orderBy(
                                "startDateTime",
                                "asc"
                            )
                        )
                    ),
                    getDocs(
                        collection(
                            db,
                            "graphicAssets"
                        )
                    )
                ]);

            const now =
                new Date();

            const events = [];

            meetupSnapshot.forEach(
                docSnapshot => {

                    const event =
                        docSnapshot.data();

                    // Hide meetup after its end time
                    if (
                        event.endDateTime &&
                        event.endDateTime.toDate() <
                            now
                    ) {
                        return;
                    }

                    events.push({
                        id:
                            docSnapshot.id,
                        ...event
                    });
                }
            );

            allGraphicAssets = [];
            todayGraphics = [];

            graphicsSnapshot.forEach(
                docSnapshot => {

                    const asset = {
                        id:
                            docSnapshot.id,
                        ...docSnapshot.data()
                    };

                    allGraphicAssets.push(
                        asset
                    );

                    if (
                        asset.type ===
                        "today"
                    ) {
                        todayGraphics.push(
                            asset
                        );
                    }
                }
            );

            function formatMeetupDate(
                timestamp
            ) {

                return timestamp
                    .toDate()
                    .toLocaleDateString(
                        "en-US",
                        {
                            weekday:
                                "long",
                            month:
                                "long",
                            day:
                                "numeric"
                        }
                    );
            }

            function formatMeetupTime(
                event
            ) {

                const start =
                    event
                        .startDateTime
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

                if (
                    !event.endTime ||
                    !event.endDateTime
                ) {
                    return start;
                }

                const end =
                    event
                        .endDateTime
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

                return `${start}–${end}`;
            }

            function getMeetupMapLink(
                location
            ) {

                if (
                    location ===
                    "Pembroke Historical Society Museum"
                ) {
                    return "https://www.google.com/maps/search/?api=1&query=Pembroke+Historical+Society+Museum+147+Center+Street+Pembroke+MA";
                }

                return (
                    "https://www.google.com/maps/search/?api=1&query=" +
                    encodeURIComponent(
                        location
                    )
                );
            }

            // ==========================
            // NEXT MEET UP
            // ==========================

            const eventCard =
                document.getElementById(
                    "event-card"
                );

            function renderNextMeetup() {

                if (!eventCard) {
                    return;
                }

                if (
                    events.length === 0
                ) {

                    eventCard.innerHTML = `
                        <div class="event-card">
                            <p>
                                No upcoming meetups scheduled.
                            </p>
                        </div>
                    `;

                    return;
                }

                const nextEvent =
                    events[0];

                const nextMapLink =
                    getMeetupMapLink(
                        nextEvent.location
                    );

                const nextDate =
                    formatMeetupDate(
                        nextEvent.startDateTime
                    );

                const nextTime =
                    formatMeetupTime(
                        nextEvent
                    );

                const todayGraphic =
                    getTodayGraphicHtml();

                eventCard.innerHTML = `

                    <div class="event-card">

                        <h3>
                            ${nextEvent.title}
                        </h3>

                        <p>
                            📅 ${nextDate}
                        </p>

                        <p>
                            🕕 ${nextTime}
                        </p>

                        <p>
                            📍
                            <a
                                href="${nextMapLink}"
                                target="_blank"
                                class="event-link">

                                ${nextEvent.location}

                            </a>
                        </p>

                        ${
                            nextEvent.attendance
                                ? `<p>👥 ${nextEvent.attendance}</p>`
                                : ""
                        }

                        ${
                            nextEvent.description
                                ? `<p>${nextEvent.description}</p>`
                                : ""
                        }

                        ${todayGraphic}

                        ${
                            nextEvent.link
                                ? `
                                <br>

                                <a
                                    href="${nextEvent.link}"
                                    target="_blank"
                                    class="hero-button">

                                    Join Campfire Meet Up

                                </a>
                                `
                                : ""
                        }

                    </div>

                `;
            }

            renderNextMeetup();

            scheduleTodayTransition(
                renderNextMeetup
            );

            // ==========================
            // UPCOMING MEET UPS
            // ==========================

            const upcomingContainer =
                document.getElementById(
                    "upcoming-events-list"
                );

            if (upcomingContainer) {

                upcomingContainer.innerHTML =
                    "";

                const upcomingEvents =
                    events.slice(1);

                if (
                    upcomingEvents.length ===
                    0
                ) {

                    upcomingContainer.innerHTML = `
                        <p style="text-align:center;">
                            No additional meetups scheduled.
                        </p>
                    `;

                } else {

                    upcomingEvents.forEach(
                        event => {

                            const mapLink =
                                getMeetupMapLink(
                                    event.location
                                );

                            const eventDate =
                                formatMeetupDate(
                                    event.startDateTime
                                );

                            const eventTime =
                                formatMeetupTime(
                                    event
                                );

                            upcomingContainer.innerHTML += `

                                <div class="event-card">

                                    <h3>
                                        ${event.title}
                                    </h3>

                                    <p>
                                        📅 ${eventDate}
                                    </p>

                                    <p>
                                        🕕 ${eventTime}
                                    </p>

                                    <p>
                                        📍
                                        <a
                                            href="${mapLink}"
                                            target="_blank"
                                            class="event-link">

                                            ${event.location}

                                        </a>
                                    </p>

                                    ${
                                        event.attendance
                                            ? `<p>👥 ${event.attendance}</p>`
                                            : ""
                                    }

                                    ${
                                        event.description
                                            ? `<p>${event.description}</p>`
                                            : ""
                                    }

                                    ${
                                        event.link
                                            ? `
                                            <br>

                                            <a
                                                href="${event.link}"
                                                target="_blank"
                                                class="hero-button">

                                                Join Campfire Meet Up

                                            </a>
                                            `
                                            : ""
                                    }

                                </div>

                            `;
                        }
                    );
                }
            }

            // ==========================
            // RAIDS
            // ==========================

            const raidContainer =
                document.getElementById(
                    "raid-container"
                );

            if (raidContainer) {

                raidContainer.innerHTML =
                    "";

                const raidTypes = [
                    "legendary",
                    "mega",
                    "shadowraids"
                ];

                const activeRaids =
                    raidTypes
                        .map(type =>
                            getActiveGraphicByType(
                                type
                            )
                        )
                        .filter(Boolean);

                if (
                    activeRaids.length ===
                    0
                ) {

                    raidContainer.innerHTML =
                        "<p>No current raid graphics are available.</p>";

                } else {

                    activeRaids.forEach(
                        raid => {

                            const imageSource =
                                raid.imageUrl ||
                                raid.imagePath;

                            const eventDate =
                                formatGraphicEventDate(
                                    raid.eventDate
                                );

                            raidContainer.innerHTML += `

                                <div class="raid-card">

                                    <h3>
                                        ${raid.label || "Current Raid"}
                                    </h3>

                                    ${
                                        eventDate
                                            ? `
                                            <p class="raid-date">
                                                ${eventDate}
                                            </p>
                                            `
                                            : ""
                                    }

                                    <img
                                        src="${imageSource}"
                                        alt="${raid.label || raid.type}"
                                        class="raid-image"
                                        onerror="this.style.display='none';">

                                </div>

                            `;
                        }
                    );
                }
            }

        } catch (err) {

            console.error(err);

            const eventCard =
                document.getElementById(
                    "event-card"
                );

            if (eventCard) {
                eventCard.innerHTML =
                    "<p>Unable to load meet ups.</p>";
            }

            const raidContainer =
                document.getElementById(
                    "raid-container"
                );

            if (raidContainer) {
                raidContainer.innerHTML =
                    "<p>Unable to load raid information.</p>";
            }
        }
    }
);

// ==========================
// HOMEPAGE ANNOUNCEMENT
// ==========================

function formatAnnouncementPostedDate(
    value
) {

    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {
        return value || "";
    }

    const date =
        new Date(
            `${value}T12:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month:
                "long",
            day:
                "numeric",
            year:
                "numeric"
        }
    );
}

function renderAnnouncement() {

    const section =
        document.getElementById(
            "announcement-section"
        );

    const title =
        document.getElementById(
            "announcement-title"
        );

    const message =
        document.getElementById(
            "announcement-message"
        );

    const date =
        document.getElementById(
            "announcement-date"
        );

    if (!section) {
        return;
    }

    section.style.display =
        "none";

    const data =
        announcementData;

    if (
        !data ||
        data.enabled !== true ||
        !data.title ||
        !data.message
    ) {
        return;
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
        return;
    }

    if (
        end &&
        end <= now
    ) {
        return;
    }

    section.style.display =
        "block";

    if (title) {
        title.textContent =
            "📢 " +
            data.title;
    }

    if (message) {
        message.textContent =
            data.message;
    }

    if (date) {

        const postedDate =
            formatAnnouncementPostedDate(
                data.postedDate
            );

        date.textContent =
            postedDate
                ? "Posted " +
                  postedDate
                : "";
    }
}

function scheduleAnnouncementTransition() {

    if (
        announcementTransitionTimer
    ) {

        clearTimeout(
            announcementTransitionTimer
        );

        announcementTransitionTimer =
            null;
    }

    if (
        !announcementData ||
        announcementData.enabled !== true
    ) {
        return;
    }

    const now =
        new Date();

    const futureTimes = [];

    const start =
        timestampToDate(
            announcementData.startAt
        );

    const end =
        timestampToDate(
            announcementData.endAt
        );

    if (
        start &&
        start > now
    ) {
        futureTimes.push(
            start.getTime()
        );
    }

    if (
        end &&
        end > now
    ) {
        futureTimes.push(
            end.getTime()
        );
    }

    if (!futureTimes.length) {
        return;
    }

    const nextTime =
        Math.min(
            ...futureTimes
        );

    const delay =
        Math.max(
            1000,
            nextTime -
            now.getTime() +
            1000
        );

    const MAX_TIMEOUT =
        2147483647;

    announcementTransitionTimer =
        setTimeout(
            () => {

                renderAnnouncement();
                scheduleAnnouncementTransition();
            },
            Math.min(
                delay,
                MAX_TIMEOUT
            )
        );
}

async function loadAnnouncement() {

    const section =
        document.getElementById(
            "announcement-section"
        );

    if (section) {
        section.style.display =
            "none";
    }

    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "siteAnnouncements",
                    "homepage"
                )
            );

        announcementData =
            snapshot.exists()
                ? snapshot.data()
                : null;

        renderAnnouncement();
        scheduleAnnouncementTransition();

    } catch (error) {

        console.error(
            "Unable to load announcement:",
            error
        );

        announcementData =
            null;

        renderAnnouncement();
    }
}

loadAnnouncement();
