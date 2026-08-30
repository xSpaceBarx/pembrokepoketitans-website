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

function safeHttpUrl(value) {

    if (!value) return "";

    try {

        const url =
            new URL(
                value,
                window.location.href
            );

        if (
            url.protocol === "http:" ||
            url.protocol === "https:"
        ) {
            return url.href;
        }

    } catch {
        // Ignore invalid URLs.
    }

    return "";
}

function createTextParagraph(
    text,
    className = ""
) {

    const paragraph =
        document.createElement(
            "p"
        );

    if (className) {
        paragraph.className =
            className;
    }

    paragraph.textContent =
        text;

    return paragraph;
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


function getActiveGraphicsByType(
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
        });
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

function createTodayGraphicElement() {

    const activeToday =
        getActiveTodayGraphic();

    if (!activeToday) {
        return null;
    }

    const imageSource =
        safeHttpUrl(
            activeToday.imageUrl ||
            activeToday.imagePath
        );

    if (!imageSource) {
        return null;
    }

    const image =
        document.createElement(
            "img"
        );

    image.src =
        imageSource;

    image.className =
        "today-counters";

    image.alt =
        "Today's Featured Graphic";

    image.addEventListener(
        "error",
        () => {
            image.style.display =
                "none";
        }
    );

    return image;
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

            function meetupDateObject(
                value
            ) {

                if (!value) {
                    return null;
                }

                if (
                    typeof value.toDate ===
                    "function"
                ) {
                    return value.toDate();
                }

                const date =
                    new Date(value);

                return Number.isNaN(
                    date.getTime()
                )
                    ? null
                    : date;
            }

            function formatMeetupShareDate(
                event
            ) {

                const start =
                    meetupDateObject(
                        event.startDateTime
                    );

                if (!start) {
                    return "";
                }

                return start.toLocaleDateString(
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

            function formatMeetupShareTime(
                event
            ) {

                const start =
                    meetupDateObject(
                        event.startDateTime
                    );

                if (!start) {
                    return "";
                }

                const startText =
                    start.toLocaleTimeString(
                        "en-US",
                        {
                            hour:
                                "numeric",
                            minute:
                                "2-digit"
                        }
                    );

                const end =
                    meetupDateObject(
                        event.endDateTime
                    );

                if (!end) {
                    return startText;
                }

                const endText =
                    end.toLocaleTimeString(
                        "en-US",
                        {
                            hour:
                                "numeric",
                            minute:
                                "2-digit"
                        }
                    );

                return `${startText}–${endText}`;
            }

            function buildMeetupShareText(
                event
            ) {

                const lines = [
                    event.title ||
                        "Pembroke PokéTitans Meetup"
                ];

                const dateText =
                    formatMeetupShareDate(
                        event
                    );

                const timeText =
                    formatMeetupShareTime(
                        event
                    );

                if (
                    dateText ||
                    timeText
                ) {
                    lines.push(
                        [
                            dateText,
                            timeText
                        ]
                            .filter(Boolean)
                            .join(" • ")
                    );
                }

                if (event.location) {
                    lines.push(
                        event.location
                    );
                }

                if (event.description) {
                    lines.push(
                        "",
                        event.description
                    );
                }

                if (event.link) {
                    lines.push(
                        "",
                        "Join the meetup:",
                        event.link
                    );
                }

                lines.push(
                    "",
                    "Pembroke PokéTitans",
                    "https://pembrokepoketitans.com"
                );

                return lines.join("\n");
            }

            async function shareMeetup(
                event
            ) {

                const title =
                    event.title ||
                    "Pembroke PokéTitans Meetup";

                const text =
                    buildMeetupShareText(
                        event
                    );

                const pageUrl =
                    new URL(
                        "#events",
                        window.location.href
                    ).href;

                if (navigator.share) {

                    try {

                        await navigator.share({
                            title,
                            text,
                            url:
                                pageUrl
                        });

                        return;

                    } catch (error) {

                        if (
                            error?.name ===
                            "AbortError"
                        ) {
                            return;
                        }

                        console.warn(
                            "Native meetup sharing failed:",
                            error
                        );
                    }
                }

                const fallbackText =
                    `${text}\n\n${pageUrl}`;

                try {

                    if (
                        navigator.clipboard &&
                        window.isSecureContext
                    ) {

                        await navigator.clipboard.writeText(
                            fallbackText
                        );

                        alert(
                            "✅ Meetup details copied to your clipboard."
                        );

                        return;
                    }

                } catch (error) {

                    console.warn(
                        "Clipboard meetup sharing failed:",
                        error
                    );
                }

                window.prompt(
                    "Copy these meetup details:",
                    fallbackText
                );
            }

            function escapeIcsText(
                value
            ) {

                return String(
                    value || ""
                )
                    .replace(
                        /\\/g,
                        "\\\\"
                    )
                    .replace(
                        /\r?\n/g,
                        "\\n"
                    )
                    .replace(
                        /,/g,
                        "\\,"
                    )
                    .replace(
                        /;/g,
                        "\\;"
                    );
            }

            function formatIcsUtc(
                date
            ) {

                const pad =
                    value =>
                        String(value)
                            .padStart(
                                2,
                                "0"
                            );

                return (
                    date.getUTCFullYear() +
                    pad(
                        date.getUTCMonth() +
                        1
                    ) +
                    pad(
                        date.getUTCDate()
                    ) +
                    "T" +
                    pad(
                        date.getUTCHours()
                    ) +
                    pad(
                        date.getUTCMinutes()
                    ) +
                    pad(
                        date.getUTCSeconds()
                    ) +
                    "Z"
                );
            }

            function buildMeetupCalendarDescription(
                event
            ) {

                const lines = [];

                if (event.description) {
                    lines.push(
                        event.description
                    );
                }

                if (event.link) {

                    if (lines.length) {
                        lines.push("");
                    }

                    lines.push(
                        "Campfire Meetup:",
                        event.link
                    );
                }

                if (lines.length) {
                    lines.push("");
                }

                lines.push(
                    "Pembroke PokéTitans",
                    "https://pembrokepoketitans.com"
                );

                return lines.join("\n");
            }

            function addMeetupToCalendar(
                event
            ) {

                const start =
                    meetupDateObject(
                        event.startDateTime
                    );

                if (!start) {

                    alert(
                        "Unable to add this meetup to your calendar because the start time is unavailable."
                    );

                    return;
                }

                const suppliedEnd =
                    meetupDateObject(
                        event.endDateTime
                    );

                const end =
                    suppliedEnd &&
                    suppliedEnd > start
                        ? suppliedEnd
                        : new Date(
                            start.getTime() +
                            60 * 60 * 1000
                        );

                const title =
                    event.title ||
                    "Pembroke PokéTitans Meetup";

                const description =
                    buildMeetupCalendarDescription(
                        event
                    );

                const location =
                    event.location || "";

                const uid =
                    [
                        event.id ||
                            "meetup",
                        start.getTime(),
                        "pembrokepoketitans.com"
                    ].join("-");

                const icsLines = [
                    "BEGIN:VCALENDAR",
                    "VERSION:2.0",
                    "PRODID:-//Pembroke PokeTitans//Meetup Calendar//EN",
                    "CALSCALE:GREGORIAN",
                    "METHOD:PUBLISH",
                    "BEGIN:VEVENT",
                    `UID:${escapeIcsText(uid)}`,
                    `DTSTAMP:${formatIcsUtc(new Date())}`,
                    `DTSTART:${formatIcsUtc(start)}`,
                    `DTEND:${formatIcsUtc(end)}`,
                    `SUMMARY:${escapeIcsText(title)}`,
                    `LOCATION:${escapeIcsText(location)}`,
                    `DESCRIPTION:${escapeIcsText(description)}`,
                    "END:VEVENT",
                    "END:VCALENDAR"
                ];

                const blob =
                    new Blob(
                        [
                            icsLines.join(
                                "\r\n"
                            )
                        ],
                        {
                            type:
                                "text/calendar;charset=utf-8"
                        }
                    );

                const objectUrl =
                    URL.createObjectURL(
                        blob
                    );

                const link =
                    document.createElement(
                        "a"
                    );

                const fileName =
                    String(title)
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9]+/g,
                            "-"
                        )
                        .replace(
                            /^-+|-+$/g,
                            ""
                        ) ||
                    "poketitans-meetup";

                link.href =
                    objectUrl;

                link.download =
                    `${fileName}.ics`;

                link.style.display =
                    "none";

                document.body.appendChild(
                    link
                );

                link.click();
                link.remove();

                setTimeout(
                    () => {
                        URL.revokeObjectURL(
                            objectUrl
                        );
                    },
                    1000
                );
            }

            function createMeetupActionButton(
                label,
                onClick
            ) {

                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    "hero-button";

                button.textContent =
                    label;

                button.style.border =
                    "0";

                button.style.cursor =
                    "pointer";

                button.addEventListener(
                    "click",
                    onClick
                );

                return button;
            }

            function createMeetupActions(
                event
            ) {

                const actions =
                    document.createElement(
                        "div"
                    );

                actions.className =
                    "meetup-actions";

                actions.style.display =
                    "flex";

                actions.style.flexWrap =
                    "wrap";

                actions.style.gap =
                    "10px";

                actions.style.marginTop =
                    "18px";

                const shareButton =
                    createMeetupActionButton(
                        "📤 Share Meetup",
                        () => {
                            shareMeetup(
                                event
                            );
                        }
                    );

                const calendarButton =
                    createMeetupActionButton(
                        "📅 Add to Calendar",
                        () => {
                            addMeetupToCalendar(
                                event
                            );
                        }
                    );

                actions.append(
                    shareButton,
                    calendarButton
                );

                return actions;
            }

            function createMeetupCard(
                event,
                includeTodayGraphic = false
            ) {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "event-card";

                const title =
                    document.createElement(
                        "h3"
                    );

                title.textContent =
                    event.title || "";

                card.appendChild(
                    title
                );

                card.appendChild(
                    createTextParagraph(
                        "📅 " +
                        formatMeetupDate(
                            event.startDateTime
                        )
                    )
                );

                card.appendChild(
                    createTextParagraph(
                        "🕕 " +
                        formatMeetupTime(
                            event
                        )
                    )
                );

                const locationParagraph =
                    document.createElement(
                        "p"
                    );

                locationParagraph.append(
                    document.createTextNode(
                        "📍 "
                    )
                );

                const locationLink =
                    document.createElement(
                        "a"
                    );

                const mapLink =
                    safeHttpUrl(
                        getMeetupMapLink(
                            event.location || ""
                        )
                    );

                if (mapLink) {

                    locationLink.href =
                        mapLink;

                    locationLink.target =
                        "_blank";

                    locationLink.rel =
                        "noopener noreferrer";

                    locationLink.className =
                        "event-link";

                    locationLink.textContent =
                        event.location || "";

                    locationParagraph.appendChild(
                        locationLink
                    );

                } else {

                    locationParagraph.append(
                        document.createTextNode(
                            event.location || ""
                        )
                    );
                }

                card.appendChild(
                    locationParagraph
                );

                if (event.attendance) {

                    card.appendChild(
                        createTextParagraph(
                            "👥 " +
                            event.attendance
                        )
                    );
                }

                if (event.description) {

                    card.appendChild(
                        createTextParagraph(
                            event.description
                        )
                    );
                }

                if (includeTodayGraphic) {

                    const todayGraphic =
                        createTodayGraphicElement();

                    if (todayGraphic) {
                        card.appendChild(
                            todayGraphic
                        );
                    }
                }

                card.appendChild(
                    createMeetupActions(
                        event
                    )
                );

                const eventLink =
                    safeHttpUrl(
                        event.link
                    );

                if (eventLink) {

                    card.appendChild(
                        document.createElement(
                            "br"
                        )
                    );

                    const joinButton =
                        document.createElement(
                            "a"
                        );

                    joinButton.href =
                        eventLink;

                    joinButton.target =
                        "_blank";

                    joinButton.rel =
                        "noopener noreferrer";

                    joinButton.className =
                        "hero-button";

                    joinButton.textContent =
                        "Join Campfire Meet Up";

                    card.appendChild(
                        joinButton
                    );
                }

                return card;
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

                eventCard.innerHTML =
                    "";

                if (
                    events.length === 0
                ) {

                    const emptyCard =
                        document.createElement(
                            "div"
                        );

                    emptyCard.className =
                        "event-card";

                    emptyCard.appendChild(
                        createTextParagraph(
                            "No upcoming meetups scheduled."
                        )
                    );

                    eventCard.appendChild(
                        emptyCard
                    );

                    return;
                }

                eventCard.appendChild(
                    createMeetupCard(
                        events[0],
                        true
                    )
                );
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

                    const empty =
                        createTextParagraph(
                            "No additional meetups scheduled."
                        );

                    empty.style.textAlign =
                        "center";

                    upcomingContainer.appendChild(
                        empty
                    );

                } else {

                    upcomingEvents.forEach(
                        event => {

                            upcomingContainer.appendChild(
                                createMeetupCard(
                                    event
                                )
                            );
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
                        .flatMap(type =>
                            getActiveGraphicsByType(
                                type
                            )
                        );

                if (
                    activeRaids.length ===
                    0
                ) {

                    raidContainer.appendChild(
                        createTextParagraph(
                            "No current raid graphics are available."
                        )
                    );

                } else {

                    activeRaids.forEach(
                        raid => {

                            const imageSource =
                                safeHttpUrl(
                                    raid.imageUrl ||
                                    raid.imagePath
                                );

                            if (!imageSource) {
                                return;
                            }

                            const raidCard =
                                document.createElement(
                                    "div"
                                );

                            raidCard.className =
                                "raid-card";

                            const heading =
                                document.createElement(
                                    "h3"
                                );

                            heading.textContent =
                                raid.label ||
                                "Current Raid";

                            raidCard.appendChild(
                                heading
                            );

                            const eventDate =
                                formatGraphicEventDate(
                                    raid.eventDate
                                );

                            if (eventDate) {

                                raidCard.appendChild(
                                    createTextParagraph(
                                        eventDate,
                                        "raid-date"
                                    )
                                );
                            }

                            const image =
                                document.createElement(
                                    "img"
                                );

                            image.src =
                                imageSource;

                            image.alt =
                                raid.label ||
                                raid.type ||
                                "Current Raid";

                            image.className =
                                "raid-image";

                            image.addEventListener(
                                "error",
                                () => {
                                    image.style.display =
                                        "none";
                                }
                            );

                            raidCard.appendChild(
                                image
                            );

                            raidContainer.appendChild(
                                raidCard
                            );
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
                    "";

                eventCard.appendChild(
                    createTextParagraph(
                        "Unable to load meet ups."
                    )
                );
            }

            const raidContainer =
                document.getElementById(
                    "raid-container"
                );

            if (raidContainer) {

                raidContainer.innerHTML =
                    "";

                raidContainer.appendChild(
                    createTextParagraph(
                        "Unable to load raid information."
                    )
                );
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
