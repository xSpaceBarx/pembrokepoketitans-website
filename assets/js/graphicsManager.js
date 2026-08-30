import { app, db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    Timestamp,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const TIME_ZONE = "America/New_York";

const CLEANUP_GRACE_MS =
    24 * 60 * 60 * 1000;

const WORKER_URL =
    "https://poketitan-notifications.xspacebarx.workers.dev/";

const graphicAssetsCollection =
    collection(db, "graphicAssets");

const featuredEventsCollection =
    collection(db, "featuredEvents");

const SLOT_CONFIG = {

    goweekly: {
        label: "📅 GO Weekly",
        placement: "Homepage — after Alerts",
        mode: "recurring"
    },

    legendary: {
        label: "👑 Legendary Raids",
        placement: "Homepage — Current Raid Bosses",
        mode: "recurring"
    },

    mega: {
        label: "🧬 Mega Raids",
        placement: "Homepage — Current Raid Bosses, below Legendary Raids",
        mode: "recurring"
    },

    maxmonday: {
        label: "💎 Max Monday",
        placement: "Events page",
        mode: "recurring"
    },

    spotlighthour: {
        label: "✨ Spotlight Hour",
        placement: "Events page",
        mode: "recurring"
    },

    today: {
        label: "🎯 Today Image",
        placement: "Homepage — Next Meet Up card",
        mode: "optional"
    },

    monthly: {
        label: "📆 Monthly Calendar",
        placement: "Events page — permanently pinned #1",
        mode: "recurring"
    },

    seasonaldetails: {
        label: "🌎 Seasonal Details",
        placement: "Events page — permanently pinned #2",
        mode: "recurring"
    },

    shadowraids: {
        label: "🌑 Shadow Raids",
        placement: "Homepage — Current Raid Bosses, below Mega Raids",
        mode: "recurring"
    },

    communityday: {
        label: "🎉 Community Day",
        placement: "Events page",
        mode: "special"
    },

    communitydayclassic: {
        label: "🔁 Community Day Classic",
        placement: "Events page",
        mode: "special"
    },

    hatchday: {
        label: "🥚 Hatch Day",
        placement: "Events page",
        mode: "special"
    },

    raidday: {
        label: "⚔️ Raid Day",
        placement: "Events page",
        mode: "special"
    },

    megaraidday: {
        label: "🧬 Mega Raid Day",
        placement: "Events page",
        mode: "special"
    },

    shadowraidday: {
        label: "🌑 Shadow Raid Day",
        placement: "Events page",
        mode: "special"
    },

    maxbattleday: {
        label: "💎 Max Battle Day",
        placement: "Events page",
        mode: "special"
    },

    catchmasteryday: {
        label: "🎯 Catch Mastery Day",
        placement: "Events page",
        mode: "special"
    },

    researchday: {
        label: "🔬 Research Day",
        placement: "Events page",
        mode: "special"
    },

    globalevent: {
        label: "🌐 Global Event",
        placement: "Events page",
        mode: "special"
    },

    ticketedevent: {
        label: "🎟️ Ticketed Event",
        placement: "Events page — includes Purchase Ticket button",
        mode: "special",
        supportsTicket: true
    }

};

const GRAPHIC_DEFAULTS = {
    goweekly: {
        weekday:
            1,
        goLiveTime:
            "00:00",
        hideDaysAfter:
            6,
        hideTime:
            "23:59"
    },
    legendary: {
        weekday:
            3,
        goLiveTime:
            "00:00",
        hideDaysAfter:
            6,
        hideTime:
            "23:59"
    },
    mega: {
        weekday:
            3,
        goLiveTime:
            "00:00",
        hideDaysAfter:
            6,
        hideTime:
            "23:59"
    },
    /*
     * The user's second "GO Weekly" request
     * (Monday through Thursday) is treated as
     * Spotlight Hour, the remaining weekly slot.
     */
    spotlighthour: {
        weekday:
            1,
        goLiveTime:
            "00:00",
        hideDaysAfter:
            3,
        hideTime:
            "23:59"
    },
    maxmonday: {
        weekday:
            1,
        goLiveTime:
            "00:00",
        hideDaysAfter:
            6,
        hideTime:
            "23:59"
    }
};

const MULTI_RAID_SAME_CYCLE_TYPES =
    new Set([
        "legendary",
        "mega"
    ]);

let graphicAssets = [];
let featuredEvents = [];
let editingGraphic = null;
let editingFeaturedEvent = null;

/* ============================
   BASIC HELPERS
============================ */

function getElement(id) {
    return document.getElementById(id);
}

function inferFeaturedNotificationAudience(
    name = ""
) {

    const normalized =
        String(name)
            .toLowerCase();

    if (
        normalized.includes(
            "community day"
        )
    ) {
        return "communityday";
    }

    if (
        normalized.includes(
            "hatch day"
        )
    ) {
        return "hatchday";
    }

    if (
        normalized.includes(
            "raid day"
        )
    ) {
        return "raidday";
    }

    if (
        normalized.includes(
            "research"
        )
    ) {
        return "research";
    }

    if (
        normalized.includes(
            "go fest"
        ) ||
        normalized.includes(
            "go tour"
        ) ||
        normalized.includes(
            "wild area"
        ) ||
        normalized.includes(
            "global"
        ) ||
        normalized.includes(
            "safari"
        )
    ) {
        return "globalevent";
    }

    return "news";
}

function requestFeaturedNotificationDraft(
    event
) {

    const now =
        new Date();

    const start =
        timestampToDate(
            event.startAt
        );

    const end =
        timestampToDate(
            event.endAt
        );

    const isLive =
        Boolean(
            start &&
            end &&
            start <= now &&
            end >= now
        );

    const eventName =
        event.name ||
        "Pokémon GO Event";

    const statusLine =
        isLive
            ? `${eventName} is live now!`
            : `${eventName} is coming up!`;

    let message =
        `${statusLine}\n\n` +
        `📅 Starts: ${formatDateTime(
            event.startAt
        )}\n` +
        `🏁 Ends: ${formatDateTime(
            event.endAt
        )}`;

    if (event.link) {
        message +=
            "\n\nCheck the PokéTitans Events page for full details.";
    } else {
        message +=
            "\n\nCheck the PokéTitans Events page for details and bonuses.";
    }

    window.dispatchEvent(
        new CustomEvent(
            "poketitans:notification-draft",
            {
                detail: {
                    source:
                        "featured-event",
                    title:
                        `🎉 ${eventName}`,
                    message,
                    audience:
                        inferFeaturedNotificationAudience(
                            eventName
                        )
                }
            }
        )
    );
}

function timestampToDate(value) {

    if (!value) return null;

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    const converted = new Date(value);

    return Number.isNaN(converted.getTime())
        ? null
        : converted;

}

function escapeHtml(value = "") {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

function formatDateTime(value) {

    const date = timestampToDate(value);

    if (!date) return "";

    return new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: TIME_ZONE,
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    ).format(date);

}

function formatDateOnly(value) {

    const date = timestampToDate(value);

    if (!date) return "";

    return new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: TIME_ZONE,
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    ).format(date);

}

function splitEasternDateTime(value) {

    const date = timestampToDate(value);

    if (!date) {
        return {
            date: "",
            time: ""
        };
    }

    const parts = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }
    ).formatToParts(date);

    const values = {};

    parts.forEach(part => {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    });

    return {
        date:
            `${values.year}-${values.month}-${values.day}`,
        time:
            `${values.hour}:${values.minute}`
    };

}

function getTimeZoneOffsetMs(date, timeZone) {

    const parts = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }
    ).formatToParts(date);

    const values = {};

    parts.forEach(part => {
        if (part.type !== "literal") {
            values[part.type] = Number(part.value);
        }
    });

    const representedAsUtc = Date.UTC(
        values.year,
        values.month - 1,
        values.day,
        values.hour,
        values.minute,
        values.second
    );

    return representedAsUtc - date.getTime();

}

function easternDateTimeToDate(dateString, timeString) {

    if (!dateString || !timeString) {
        return null;
    }

    const [year, month, day] =
        dateString.split("-").map(Number);

    const [hour, minute] =
        timeString.split(":").map(Number);

    if (
        !year ||
        !month ||
        !day ||
        Number.isNaN(hour) ||
        Number.isNaN(minute)
    ) {
        return null;
    }

    const localAsUtc = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        0
    );

    let candidate = new Date(localAsUtc);

    let offset =
        getTimeZoneOffsetMs(candidate, TIME_ZONE);

    candidate =
        new Date(localAsUtc - offset);

    const correctedOffset =
        getTimeZoneOffsetMs(candidate, TIME_ZONE);

    if (correctedOffset !== offset) {
        candidate =
            new Date(localAsUtc - correctedOffset);
    }

    return candidate;

}

function easternCalendarNow() {

    const parts =
        new Intl.DateTimeFormat(
            "en-US",
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
        )
            .formatToParts(
                new Date()
            );

    const values = {};

    parts.forEach(
        part => {

            if (
                part.type !==
                "literal"
            ) {
                values[
                    part.type
                ] =
                    Number(
                        part.value
                    );
            }
        }
    );

    const date =
        new Date(
            Date.UTC(
                values.year,
                values.month - 1,
                values.day
            )
        );

    return {
        year:
            values.year,
        month:
            values.month,
        day:
            values.day,
        weekday:
            date.getUTCDay(),
        minutes:
            values.hour *
                60 +
            values.minute
    };
}

function formatCalendarDate(
    date
) {

    return [
        date.getUTCFullYear(),
        String(
            date.getUTCMonth() +
            1
        ).padStart(
            2,
            "0"
        ),
        String(
            date.getUTCDate()
        ).padStart(
            2,
            "0"
        )
    ].join("-");
}

function upcomingWeekdayDate(
    targetWeekday,
    timeValue
) {

    const now =
        easternCalendarNow();

    const [
        hour,
        minute
    ] =
        String(
            timeValue
        )
            .split(":")
            .map(Number);

    const targetMinutes =
        hour * 60 +
        minute;

    let daysAhead =
        (
            targetWeekday -
            now.weekday +
            7
        ) % 7;

    if (
        daysAhead === 0 &&
        now.minutes >=
            targetMinutes
    ) {
        daysAhead =
            7;
    }

    return new Date(
        Date.UTC(
            now.year,
            now.month - 1,
            now.day +
                daysAhead
        )
    );
}

function addCalendarDays(
    date,
    days
) {

    const result =
        new Date(
            date.getTime()
        );

    result.setUTCDate(
        result.getUTCDate() +
        days
    );

    return result;
}

function easternCalendarDateForInstant(
    value
) {

    const date =
        timestampToDate(
            value
        );

    if (!date) {
        return null;
    }

    const parts =
        new Intl.DateTimeFormat(
            "en-US",
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
        )
            .formatToParts(
                date
            );

    const values = {};

    parts.forEach(
        part => {

            if (
                part.type !==
                "literal"
            ) {
                values[
                    part.type
                ] =
                    Number(
                        part.value
                    );
            }
        }
    );

    return new Date(
        Date.UTC(
            values.year,
            values.month - 1,
            values.day
        )
    );
}

function latestGraphicBoundaryDate(type) {

    let latest = null;

    graphicAssets
        .filter(asset =>
            asset.type === type
        )
        .forEach(asset => {

            /*
             * Compare recurring cycles by EASTERN CALENDAR DATE,
             * not by their absolute UTC timestamps.
             *
             * Sunday 11:59 PM Eastern is technically Monday in UTC.
             * The old comparison therefore made a Sunday-ending
             * graphic look like it overlapped the very next Monday
             * and incorrectly skipped ahead one full week.
             */
            const goLive =
                easternCalendarDateForInstant(
                    asset.goLiveAt
                );

            const hideAfter =
                easternCalendarDateForInstant(
                    asset.hideAfterAt
                );

            [goLive, hideAfter]
                .filter(Boolean)
                .forEach(date => {
                    if (
                        !latest ||
                        date > latest
                    ) {
                        latest = date;
                    }
                });
        });

    return latest;
}

function applyGraphicDefaults(
    type
) {

    const defaults =
        GRAPHIC_DEFAULTS[
            type
        ];

    if (!defaults) {
        return;
    }

    let goLiveDate =
        upcomingWeekdayDate(
            defaults.weekday,
            defaults.goLiveTime
        );

    /*
     * If this recurring graphic already has a live or
     * scheduled cycle, move the default forward until it
     * lands after the latest saved cycle. This lets the
     * planner card always prepare the NEXT graphic without
     * editing or replacing the one currently live.
     */
    const latestBoundary =
        latestGraphicBoundaryDate(
            type
        );

    let safety = 0;

    while (
        latestBoundary &&
        goLiveDate <= latestBoundary &&
        safety < 60
    ) {
        goLiveDate =
            addCalendarDays(
                goLiveDate,
                7
            );
        safety += 1;
    }

    const hideDate =
        addCalendarDays(
            goLiveDate,
            defaults.hideDaysAfter
        );

    getElement(
        "graphic-go-live-date"
    ).value =
        formatCalendarDate(
            goLiveDate
        );

    getElement(
        "graphic-go-live-time"
    ).value =
        defaults.goLiveTime;

    getElement(
        "graphic-hide-date"
    ).value =
        formatCalendarDate(
            hideDate
        );

    getElement(
        "graphic-hide-time"
    ).value =
        defaults.hideTime;
}

function scrollToElement(selector) {

    const element =
        document.querySelector(selector);

    if (!element) return;

    element.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* ============================
   MANAGED IMAGE UPLOAD HELPERS
============================ */

function fileToBase64(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();

            reader.onload = () => {

                const result =
                    String(reader.result || "");

                const commaIndex =
                    result.indexOf(",");

                resolve(
                    commaIndex >= 0
                        ? result.slice(commaIndex + 1)
                        : result
                );
            };

            reader.onerror = () => {
                reject(
                    new Error(
                        "Unable to read the selected graphic."
                    )
                );
            };

            reader.readAsDataURL(file);
        }
    );
}

async function getAdminIdToken() {

    const user =
        getAuth(app).currentUser;

    if (!user) {
        throw new Error(
            "Your Admin login has expired. Please refresh the page and sign in again."
        );
    }

    return user.getIdToken();
}

async function readWorkerJson(response) {

    const text =
        await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            success: false,
            error: text
        };
    }
}

async function uploadManagedGraphic(
    file,
    graphicType
) {

    if (!file) {
        throw new Error(
            "Please choose a graphic image."
        );
    }

    if (
        ![
            "image/png",
            "image/jpeg",
            "image/webp"
        ].includes(file.type)
    ) {
        throw new Error(
            "Only PNG, JPEG and WebP graphics are supported."
        );
    }

    if (
        file.size >
        25 * 1024 * 1024
    ) {
        throw new Error(
            "Graphic must be 25 MB or smaller."
        );
    }

    /*
     * The browser performs the Base64 work.
     * The Worker will authenticate this request
     * and stream this already-built GitHub JSON
     * body directly to GitHub without parsing it.
     */
    const contentBase64 =
        await fileToBase64(file);

    const githubPayload =
        JSON.stringify({
            message:
                `Add scheduled graphic: ${graphicType}`,
            content:
                contentBase64,
            branch:
                "main"
        });

    const idToken =
        await getAdminIdToken();

    const params =
        new URLSearchParams({
            type:
                graphicType,
            mime:
                file.type,
            name:
                file.name,
            size:
                String(file.size)
        });

    const response =
        await fetch(
            `${WORKER_URL}graphics/upload?${params.toString()}`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`
                },

                body:
                    githubPayload
            }
        );

    const result =
        await readWorkerJson(response);

    if (
        !response.ok ||
        result.success !== true ||
        !result.imagePath ||
        !result.imageUrl
    ) {
        throw new Error(
            result.error ||
            "Unable to upload the graphic to GitHub."
        );
    }

    return result;
}


async function deleteManagedGraphic(
    imagePath
) {

    if (!imagePath) {
        return {
            success: true,
            skipped: true
        };
    }

    const idToken =
        await getAdminIdToken();

    const response =
        await fetch(
            WORKER_URL,
            {
                method: "DELETE",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`
                },

                body:
                    JSON.stringify({
                        action:
                            "deleteGraphic",

                        imagePath
                    })
            }
        );

    const result =
        await readWorkerJson(response);

    if (
        !response.ok ||
        result.success !== true
    ) {
        throw new Error(
            result.error ||
            "Unable to delete the managed graphic from GitHub."
        );
    }

    return result;
}

/* ============================
   GRAPHIC STATE
============================ */

function getAssetsForType(type) {

    return graphicAssets
        .filter(asset => asset.type === type)
        .sort((a, b) => {

            const aDate =
                timestampToDate(a.goLiveAt)?.getTime() || 0;

            const bDate =
                timestampToDate(b.goLiveAt)?.getTime() || 0;

            return aDate - bDate;

        });

}

function getGraphicState(type) {

    const now = new Date();

    const assets =
        getAssetsForType(type);

    const activeCandidates =
        assets.filter(asset => {

            const goLive =
                timestampToDate(asset.goLiveAt);

            const hideAfter =
                timestampToDate(asset.hideAfterAt);

            return (
                goLive &&
                goLive <= now &&
                (!hideAfter || hideAfter > now)
            );

        });

    const active =
        activeCandidates.length
            ? activeCandidates[activeCandidates.length - 1]
            : null;

    const next =
        assets.find(asset => {

            const goLive =
                timestampToDate(asset.goLiveAt);

            return goLive && goLive > now;

        }) || null;

    return {
        active,
        next
    };

}

function setPlannerStatus(elementId, text, detail = "") {

    const element =
        getElement(elementId);

    if (!element) return;

    element.innerHTML =
        detail
            ? `${text}<small>${escapeHtml(detail)}</small>`
            : text;

}

function renderGraphicStatuses() {

    Object.entries(SLOT_CONFIG)
        .forEach(([type, config]) => {

            const state =
                getGraphicState(type);

            const id =
                `graphic-status-${type}`;

            if (config.mode === "recurring") {

                if (state.active && state.next) {

                    setPlannerStatus(
                        id,
                        "✅ Ready",
                        `Next: ${formatDateTime(state.next.goLiveAt)}`
                    );

                } else if (state.active) {

                    setPlannerStatus(
                        id,
                        "🟢 Live",
                        `Since: ${formatDateTime(state.active.goLiveAt)}`
                    );

                } else if (state.next) {

                    setPlannerStatus(
                        id,
                        "🕒 Scheduled",
                        formatDateTime(state.next.goLiveAt)
                    );

                } else {

                    setPlannerStatus(
                        id,
                        "⚪ Missing"
                    );

                }

                return;
            }

            if (config.mode === "optional") {

                if (state.active && state.next) {

                    setPlannerStatus(
                        id,
                        "✅ Ready",
                        `Next: ${formatDateTime(state.next.goLiveAt)}`
                    );

                } else if (state.active) {

                    setPlannerStatus(
                        id,
                        "🟢 Live",
                        formatDateTime(state.active.goLiveAt)
                    );

                } else if (state.next) {

                    setPlannerStatus(
                        id,
                        "🕒 Scheduled",
                        formatDateTime(state.next.goLiveAt)
                    );

                } else {

                    setPlannerStatus(
                        id,
                        "⚪ Optional"
                    );

                }

                return;
            }

            if (state.active) {

                setPlannerStatus(
                    id,
                    "🟢 Live",
                    state.active.eventDate ||
                    formatDateOnly(state.active.goLiveAt)
                );

            } else if (state.next) {

                setPlannerStatus(
                    id,
                    "🕒 Scheduled",
                    state.next.eventDate ||
                    formatDateTime(state.next.goLiveAt)
                );

            } else {

                setPlannerStatus(
                    id,
                    "⚪ Inactive"
                );

            }

        });

}

/* ============================
   GRAPHIC EDITOR
============================ */

function clearGraphicEditor() {

    editingGraphic = null;

    getElement("graphic-id").value = "";
    getElement("graphic-type").value = "";
    getElement("graphic-event-date").value = "";
    getElement("graphic-go-live-date").value = "";
    getElement("graphic-go-live-time").value = "";
    getElement("graphic-hide-date").value = "";
    getElement("graphic-hide-time").value = "";
    getElement("graphic-link").value = "";
    getElement("graphic-ticket-url").value = "";
    getElement("graphic-placement").value = "";
    getElement("graphic-image").value = "";

    getElement("graphic-ticket-field").style.display =
        "none";

    getElement("graphic-editor-title").textContent =
        "Select a graphic card above";

    getElement("saveGraphic").textContent =
        "💾 Save Schedule";

    getElement("graphic-current-preview").textContent =
        "No active graphic loaded.";

    getElement("graphic-next-preview").textContent =
        "Nothing scheduled.";

}

function renderGraphicPreview(asset, containerId, emptyText) {

    const container =
        getElement(containerId);

    if (!asset) {
        container.textContent = emptyText;
        return;
    }

    const imageUrl =
        asset.imageUrl || "";

    container.innerHTML = `
        ${
            imageUrl
                ? `
                    <img
                        src="${escapeHtml(imageUrl)}"
                        alt="${escapeHtml(asset.label || "Scheduled graphic")}"
                        style="display:block;max-width:100%;max-height:320px;object-fit:contain;margin:0 auto 15px;">
                  `
                : `<p><strong>No uploaded image found.</strong></p>`
        }

        <p>
            Go Live:
            ${escapeHtml(formatDateTime(asset.goLiveAt))}
        </p>

        ${
            asset.eventDate
                ? `
                    <p>
                        Event Date:
                        ${escapeHtml(asset.eventDate)}
                    </p>
                  `
                : ""
        }
    `;
}

function openGraphicEditor(type, asset = null) {

    const config =
        SLOT_CONFIG[type];

    if (!config) return;

    editingGraphic = asset;

    getElement("graphic-id").value =
        asset?.id || "";

    getElement("graphic-type").value =
        type;

    getElement("graphic-editor-title").textContent =
        asset
            ? `✏ Edit ${config.label}`
            : `➕ Schedule ${config.label}`;

    getElement("saveGraphic").textContent =
        asset
            ? "💾 Save Changes"
            : "💾 Save New Schedule";

    getElement("graphic-placement").value =
        config.placement;

    getElement("graphic-ticket-field").style.display =
        config.supportsTicket
            ? "block"
            : "none";

    const state =
        getGraphicState(type);

    renderGraphicPreview(
        state.active,
        "graphic-current-preview",
        "No active graphic."
    );

    renderGraphicPreview(
        state.next,
        "graphic-next-preview",
        "Nothing scheduled."
    );

    getElement("graphic-event-date").value =
        asset?.eventDate || "";

    const goLive =
        splitEasternDateTime(asset?.goLiveAt);

    getElement("graphic-go-live-date").value =
        goLive.date;

    getElement("graphic-go-live-time").value =
        goLive.time;

    const hideAfter =
        splitEasternDateTime(asset?.hideAfterAt);

    getElement("graphic-hide-date").value =
        hideAfter.date;

    getElement("graphic-hide-time").value =
        hideAfter.time;

    if (!asset) {
        applyGraphicDefaults(
            type
        );
    }

    getElement("graphic-link").value =
        asset?.link || "";

    getElement("graphic-ticket-url").value =
        asset?.ticketUrl || "";

    getElement("graphic-image").value = "";

    scrollToElement("#graphics-editor");

}


function openGraphicEditorForSameCycle(
    sourceAsset
) {

    if (
        !sourceAsset ||
        !MULTI_RAID_SAME_CYCLE_TYPES.has(
            sourceAsset.type
        )
    ) {
        return;
    }

    const type =
        sourceAsset.type;

    const config =
        SLOT_CONFIG[type];

    if (!config) {
        return;
    }

    /*
     * Open the normal NEW schedule editor first, then
     * replace the auto-advanced dates with this card's
     * exact cycle. The hidden ID stays blank, so saving
     * creates a second Firestore record instead of
     * replacing the first one.
     */
    openGraphicEditor(
        type
    );

    editingGraphic =
        null;

    getElement(
        "graphic-id"
    ).value =
        "";

    getElement(
        "graphic-editor-title"
    ).textContent =
        `➕ Add Another ${config.label} — Same Cycle`;

    getElement(
        "saveGraphic"
    ).textContent =
        "💾 Save Additional Graphic";

    getElement(
        "graphic-event-date"
    ).value =
        sourceAsset.eventDate ||
        "";

    const goLive =
        splitEasternDateTime(
            sourceAsset.goLiveAt
        );

    getElement(
        "graphic-go-live-date"
    ).value =
        goLive.date;

    getElement(
        "graphic-go-live-time"
    ).value =
        goLive.time;

    const hideAfter =
        splitEasternDateTime(
            sourceAsset.hideAfterAt
        );

    getElement(
        "graphic-hide-date"
    ).value =
        hideAfter.date;

    getElement(
        "graphic-hide-time"
    ).value =
        hideAfter.time;

    /*
     * The additional boss gets its own uploaded image.
     * Do not inherit the source graphic's link or image.
     */
    getElement(
        "graphic-link"
    ).value =
        "";

    getElement(
        "graphic-image"
    ).value =
        "";
}

async function saveGraphic({ publishNow = false } = {}) {

    const type =
        getElement("graphic-type").value;

    const config =
        SLOT_CONFIG[type];

    if (!config) {
        alert("Please select a graphic card first.");
        return;
    }

    let goLiveDate;

    if (publishNow) {

        goLiveDate =
            new Date();

    } else {

        goLiveDate =
            easternDateTimeToDate(
                getElement("graphic-go-live-date").value,
                getElement("graphic-go-live-time").value
            );

        if (!goLiveDate) {
            alert(
                "Please enter a valid Go Live date and time."
            );
            return;
        }
    }

    const hideDateValue =
        getElement("graphic-hide-date").value;

    const hideTimeValue =
        getElement("graphic-hide-time").value;

    let hideAfterDate = null;

    if (
        hideDateValue ||
        hideTimeValue
    ) {

        if (
            !hideDateValue ||
            !hideTimeValue
        ) {
            alert(
                "Please enter both a Hide After date and time, or leave both blank."
            );
            return;
        }

        hideAfterDate =
            easternDateTimeToDate(
                hideDateValue,
                hideTimeValue
            );

        if (!hideAfterDate) {
            alert(
                "Please enter a valid Hide After date and time."
            );
            return;
        }

        if (
            hideAfterDate <=
            goLiveDate
        ) {
            alert(
                "Hide After must be later than Go Live."
            );
            return;
        }
    }

    const selectedFile =
        getElement("graphic-image").files[0] || null;

    if (
        !selectedFile &&
        !editingGraphic?.imagePath
    ) {
        alert(
            "Please choose a graphic image."
        );
        return;
    }

    const id =
        getElement("graphic-id").value;

    const oldImagePath =
        editingGraphic?.imagePath || "";

    let uploadedImage = null;

    try {

        if (selectedFile) {

            uploadedImage =
                await uploadManagedGraphic(
                    selectedFile,
                    type
                );
        }

        const payload = {
            type,
            label:
                config.label,
            placement:
                config.placement,
            eventDate:
                getElement("graphic-event-date").value || "",
            goLiveAt:
                Timestamp.fromDate(
                    goLiveDate
                ),
            hideAfterAt:
                hideAfterDate
                    ? Timestamp.fromDate(
                        hideAfterDate
                      )
                    : null,
            link:
                getElement("graphic-link").value.trim(),
            ticketUrl:
                config.supportsTicket
                    ? getElement("graphic-ticket-url").value.trim()
                    : "",
            originalFileName:
                selectedFile?.name ||
                editingGraphic?.originalFileName ||
                "",
            updatedAt:
                serverTimestamp()
        };

        if (uploadedImage) {

            payload.imagePath =
                uploadedImage.imagePath;

            payload.imageUrl =
                uploadedImage.imageUrl;

            payload.githubSha =
                uploadedImage.githubSha || "";

        } else {

            payload.imagePath =
                editingGraphic.imagePath;

            payload.imageUrl =
                editingGraphic.imageUrl || "";

            payload.githubSha =
                editingGraphic.githubSha || "";
        }

        if (id) {

            await updateDoc(
                doc(
                    db,
                    "graphicAssets",
                    id
                ),
                payload
            );

        } else {

            payload.createdAt =
                serverTimestamp();

            await addDoc(
                graphicAssetsCollection,
                payload
            );
        }

        let cleanupWarning = false;

        if (
            uploadedImage &&
            oldImagePath &&
            oldImagePath !==
                uploadedImage.imagePath
        ) {

            try {

                await deleteManagedGraphic(
                    oldImagePath
                );

            } catch (cleanupError) {

                cleanupWarning = true;

                console.warn(
                    "New graphic saved, but the replaced GitHub image could not be removed:",
                    cleanupError
                );
            }
        }

        await loadAllGraphicsData();

        clearGraphicEditor();

        const successMessage =
            id
                ? "✅ Graphic updated successfully."
                : publishNow
                    ? "✅ Graphic published successfully."
                    : "✅ Graphic scheduled successfully.";

        alert(
            successMessage +
            (
                cleanupWarning
                    ? "\n\nThe new graphic is saved, but an older managed image could not be cleaned up automatically."
                    : ""
            )
        );

    } catch (error) {

        /*
         * If GitHub upload succeeded but Firestore save
         * failed, remove the newly uploaded orphan file.
         */
        if (
            uploadedImage?.imagePath
        ) {
            try {
                await deleteManagedGraphic(
                    uploadedImage.imagePath
                );
            } catch (rollbackError) {
                console.warn(
                    "Unable to roll back newly uploaded graphic:",
                    rollbackError
                );
            }
        }

        console.error(
            "Unable to save graphic:",
            error
        );

        alert(
            error.message ||
            "Unable to save graphic."
        );
    }
}

/* ============================
   FEATURED EVENT QUEUE
============================ */

function getFeaturedRoleState() {

    const now = new Date();

    const usableEvents =
        featuredEvents
            .filter(event => {

                const end =
                    timestampToDate(event.endAt);

                return end && end >= now;

            })
            .sort((a, b) => {

                const aDate =
                    timestampToDate(a.startAt)?.getTime() || 0;

                const bDate =
                    timestampToDate(b.startAt)?.getTime() || 0;

                return aDate - bDate;

            });

    const activeEvents =
        usableEvents
            .filter(event => {

                const start =
                    timestampToDate(event.startAt);

                const end =
                    timestampToDate(event.endAt);

                return (
                    start &&
                    end &&
                    start <= now &&
                    end >= now
                );

            })
            .sort((a, b) => {

                const aDate =
                    timestampToDate(a.startAt)?.getTime() || 0;

                const bDate =
                    timestampToDate(b.startAt)?.getTime() || 0;

                return bDate - aDate;

            });

    const current =
        activeEvents[0] || null;

    const future =
        usableEvents.filter(event => {

            const start =
                timestampToDate(event.startAt);

            return start && start > now;

        });

    return {
        current,
        upcoming: future[0] || null,
        future: future[1] || null,
        future2: future[2] || null,
        queuedBeyond: future.slice(3)
    };

}

function renderFeaturedPositionCards() {

    const roles =
        getFeaturedRoleState();

    const cardConfig = [
        {
            key: "current",
            id: "graphic-status-currentevent",
            empty: "⚪ Missing",
            active: "🟢 Live"
        },
        {
            key: "upcoming",
            id: "graphic-status-upcomingevent",
            empty: "⚪ Missing",
            active: "🕒 Queued"
        },
        {
            key: "future",
            id: "graphic-status-futureevent",
            empty: "⚪ Missing",
            active: "🕒 Queued"
        },
        {
            key: "future2",
            id: "graphic-status-futureevent2",
            empty: "⚪ Missing",
            active: "🕒 Queued"
        }
    ];

    cardConfig.forEach(item => {

        const event =
            roles[item.key];

        if (!event) {

            setPlannerStatus(
                item.id,
                item.empty
            );

            return;
        }

        setPlannerStatus(
            item.id,
            item.active,
            `${event.name} • ${formatDateOnly(event.startAt)}`
        );

    });

}

function clearFeaturedEventEditor() {

    editingFeaturedEvent = null;

    getElement("featured-event-id").value = "";
    getElement("featured-event-name").value = "";
    getElement("featured-event-image").value = "";
    getElement("featured-event-start-date").value = "";
    getElement("featured-event-start-time").value = "10:00";
    getElement("featured-event-end-date").value = "";
    getElement("featured-event-end-time").value = "20:00";
    getElement("featured-event-link").value = "";

    getElement("featured-event-editor-title").textContent =
        "➕ Add Featured Event";

    getElement("saveFeaturedEvent").textContent =
        "💾 Save Featured Event";

}

function loadFeaturedEventIntoEditor(event) {

    if (!event) {
        clearFeaturedEventEditor();
        scrollToElement("#featured-event-manager");
        return;
    }

    editingFeaturedEvent = event;

    getElement("featured-event-id").value =
        event.id;

    getElement("featured-event-name").value =
        event.name || "";

    const start =
        splitEasternDateTime(event.startAt);

    getElement("featured-event-start-date").value =
        start.date;

    getElement("featured-event-start-time").value =
        start.time;

    const end =
        splitEasternDateTime(event.endAt);

    getElement("featured-event-end-date").value =
        end.date;

    getElement("featured-event-end-time").value =
        end.time;

    getElement("featured-event-link").value =
        event.link || "";

    getElement("featured-event-image").value = "";

    getElement("featured-event-editor-title").textContent =
        "✏ Edit Featured Event";

    getElement("saveFeaturedEvent").textContent =
        "💾 Update Featured Event";

    scrollToElement("#featured-event-manager");

}

async function saveFeaturedEvent() {

    const name =
        getElement("featured-event-name").value.trim();

    const startDate =
        easternDateTimeToDate(
            getElement("featured-event-start-date").value,
            getElement("featured-event-start-time").value
        );

    const endDate =
        easternDateTimeToDate(
            getElement("featured-event-end-date").value,
            getElement("featured-event-end-time").value
        );

    if (!name) {
        alert(
            "Please enter an event name."
        );
        return;
    }

    if (
        !startDate ||
        !endDate
    ) {
        alert(
            "Please enter valid event start and end dates/times."
        );
        return;
    }

    if (
        endDate <=
        startDate
    ) {
        alert(
            "The event end must be later than the event start."
        );
        return;
    }

    const selectedFile =
        getElement("featured-event-image").files[0] || null;

    if (
        !selectedFile &&
        !editingFeaturedEvent?.imagePath
    ) {
        alert(
            "Please choose an event graphic."
        );
        return;
    }

    const id =
        getElement("featured-event-id").value;

    const oldImagePath =
        editingFeaturedEvent?.imagePath || "";

    let uploadedImage = null;

    try {

        if (selectedFile) {

            uploadedImage =
                await uploadManagedGraphic(
                    selectedFile,
                    "featured"
                );
        }

        const payload = {
            name,
            startAt:
                Timestamp.fromDate(
                    startDate
                ),
            endAt:
                Timestamp.fromDate(
                    endDate
                ),
            eventDate:
                getElement("featured-event-start-date").value,
            link:
                getElement("featured-event-link").value.trim(),
            placement:
                "Homepage when Current + Events page in chronological order",
            originalFileName:
                selectedFile?.name ||
                editingFeaturedEvent?.originalFileName ||
                "",
            updatedAt:
                serverTimestamp()
        };

        if (uploadedImage) {

            payload.imagePath =
                uploadedImage.imagePath;

            payload.imageUrl =
                uploadedImage.imageUrl;

            payload.githubSha =
                uploadedImage.githubSha || "";

        } else {

            payload.imagePath =
                editingFeaturedEvent.imagePath;

            payload.imageUrl =
                editingFeaturedEvent.imageUrl || "";

            payload.githubSha =
                editingFeaturedEvent.githubSha || "";
        }

        if (id) {

            await updateDoc(
                doc(
                    db,
                    "featuredEvents",
                    id
                ),
                payload
            );

        } else {

            payload.createdAt =
                serverTimestamp();

            await addDoc(
                featuredEventsCollection,
                payload
            );
        }

        let cleanupWarning = false;

        if (
            uploadedImage &&
            oldImagePath &&
            oldImagePath !==
                uploadedImage.imagePath
        ) {

            try {

                await deleteManagedGraphic(
                    oldImagePath
                );

            } catch (cleanupError) {

                cleanupWarning = true;

                console.warn(
                    "Featured event saved, but the replaced GitHub image could not be removed:",
                    cleanupError
                );
            }
        }

        await loadAllGraphicsData();

        clearFeaturedEventEditor();

        alert(
            "✅ Featured event and graphic saved successfully." +
            (
                cleanupWarning
                    ? "\n\nThe new event is saved, but an older managed image could not be cleaned up automatically."
                    : ""
            )
        );

    } catch (error) {

        if (
            uploadedImage?.imagePath
        ) {
            try {
                await deleteManagedGraphic(
                    uploadedImage.imagePath
                );
            } catch (rollbackError) {
                console.warn(
                    "Unable to roll back newly uploaded featured-event graphic:",
                    rollbackError
                );
            }
        }

        console.error(
            "Unable to save featured event:",
            error
        );

        alert(
            error.message ||
            "Unable to save featured event."
        );
    }
}

async function deleteFeaturedEvent(event) {

    const confirmed =
        confirm(
            `Delete featured event "${event.name}"?`
        );

    if (!confirmed) return;

    try {

        /*
         * Delete the managed GitHub file first.
         * Firestore is removed only after GitHub
         * cleanup succeeds.
         */
        if (event.imagePath) {

            await deleteManagedGraphic(
                event.imagePath
            );
        }

        await deleteDoc(
            doc(
                db,
                "featuredEvents",
                event.id
            )
        );

        await loadAllGraphicsData();

        clearFeaturedEventEditor();

    } catch (error) {

        console.error(
            "Unable to delete featured event:",
            error
        );

        alert(
            error.message ||
            "Unable to delete featured event. The Firestore record was kept so the graphic remains traceable."
        );
    }
}

function renderFeaturedQueue() {

    const container =
        getElement("featured-event-queue");

    const now = new Date();

    const events =
        featuredEvents
            .filter(event => {

                const end =
                    timestampToDate(event.endAt);

                return end && end >= now;

            })
            .sort((a, b) => {

                const aDate =
                    timestampToDate(a.startAt)?.getTime() || 0;

                const bDate =
                    timestampToDate(b.startAt)?.getTime() || 0;

                return aDate - bDate;

            });

    if (!events.length) {
        container.textContent =
            "No featured events scheduled.";
        return;
    }

    const roles =
        getFeaturedRoleState();

    function roleForEvent(event) {

        if (roles.current?.id === event.id) {
            return "🔥 Current Event";
        }

        if (roles.upcoming?.id === event.id) {
            return "⏭️ Upcoming Event";
        }

        if (roles.future?.id === event.id) {
            return "🔭 Future Event";
        }

        if (roles.future2?.id === event.id) {
            return "🔭 Future Event 2";
        }

        return "📋 Queued";
    }

    container.innerHTML = "";

    events.forEach(event => {

        const card =
            document.createElement("div");

        card.className =
            "admin-card featured-event-card";

        card.innerHTML = `
            <h3>${escapeHtml(event.name)}</h3>
            <p><strong>${escapeHtml(roleForEvent(event))}</strong></p>
            <p>Starts: ${escapeHtml(formatDateTime(event.startAt))}</p>
            <p>Ends: ${escapeHtml(formatDateTime(event.endAt))}</p>
            <button class="btn-orange featured-notification">🔔 Create Notification Draft</button>
            <button class="btn-orange featured-edit">✏ Edit</button>
            <button class="btn-orange featured-delete">🗑 Delete</button>
        `;

        card
            .querySelector(".featured-notification")
            .addEventListener("click", () => {
                requestFeaturedNotificationDraft(event);
            });

        card
            .querySelector(".featured-edit")
            .addEventListener("click", () => {
                loadFeaturedEventIntoEditor(event);
            });

        card
            .querySelector(".featured-delete")
            .addEventListener("click", () => {
                deleteFeaturedEvent(event);
            });

        container.appendChild(card);

    });

}

/* ============================
   LIVE + SCHEDULED GRAPHICS
============================ */

function getGraphicPipelineState(
    asset,
    now = new Date()
) {

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
        goLive <= now &&
        (
            !hideAfter ||
            hideAfter > now
        )
    ) {
        return "live";
    }

    if (
        goLive &&
        goLive > now
    ) {
        return "scheduled";
    }

    return "expired";
}

async function deleteGraphicAsset(
    asset
) {

    const state =
        getGraphicPipelineState(
            asset
        );

    const isLive =
        state === "live";

    const confirmed =
        confirm(
            isLive
                ? `Delete the LIVE ${asset.label || "graphic"}?\n\nThis removes the managed image and its Firestore record immediately.`
                : `Cancel the scheduled ${asset.label || "graphic"}?`
        );

    if (!confirmed) return;

    try {

        /*
         * Always delete the GitHub image first.
         * Firestore is removed only after GitHub cleanup
         * succeeds (or the file is already missing).
         */
        if (asset.imagePath) {

            await deleteManagedGraphic(
                asset.imagePath
            );
        }

        await deleteDoc(
            doc(
                db,
                "graphicAssets",
                asset.id
            )
        );

        await loadAllGraphicsData();

        clearGraphicEditor();

    } catch (error) {

        console.error(
            "Unable to delete graphic:",
            error
        );

        alert(
            error.message ||
            "Unable to delete the graphic. The Firestore record was kept so the graphic remains traceable."
        );
    }
}

function renderGraphicPipelineCard(
    asset,
    state
) {

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "admin-card scheduled-graphic-card";

    const imageUrl =
        asset.imageUrl || "";

    const statusText =
        state === "live"
            ? "🟢 Live"
            : "🕒 Scheduled";

    const actionText =
        state === "live"
            ? "🗑 Delete"
            : "🗑 Cancel";

    card.innerHTML = `
        <h3>${escapeHtml(asset.label || asset.type)}</h3>
        <p><strong>${statusText}</strong></p>
        ${
            imageUrl
                ? `
                    <img
                        src="${escapeHtml(imageUrl)}"
                        alt="${escapeHtml(asset.label || "Managed graphic") }"
                        style="display:block;max-width:100%;max-height:180px;object-fit:contain;margin:0 auto 15px;">
                  `
                : ""
        }
        <p>Go Live: ${escapeHtml(formatDateTime(asset.goLiveAt))}</p>
        ${
            asset.hideAfterAt
                ? `<p>Hide After: ${escapeHtml(formatDateTime(asset.hideAfterAt))}</p>`
                : ""
        }
        ${
            asset.eventDate
                ? `<p>Event Date: ${escapeHtml(asset.eventDate)}</p>`
                : ""
        }
        <p>${escapeHtml(asset.placement || "")}</p>
        <button class="btn-orange graphic-edit">✏ Edit</button>
        ${
            MULTI_RAID_SAME_CYCLE_TYPES.has(
                asset.type
            )
                ? `<button class="btn-orange graphic-add-same-cycle">➕ Add Another This Cycle</button>`
                : ""
        }
        ${
            GRAPHIC_DEFAULTS[asset.type]
                ? `<button class="btn-orange graphic-schedule-next">➕ Schedule Next</button>`
                : ""
        }
        <button class="btn-orange graphic-delete">${actionText}</button>
    `;

    card
        .querySelector(
            ".graphic-edit"
        )
        .addEventListener(
            "click",
            () => {
                openGraphicEditor(
                    asset.type,
                    asset
                );
            }
        );

    card
        .querySelector(
            ".graphic-add-same-cycle"
        )
        ?.addEventListener(
            "click",
            () => {
                openGraphicEditorForSameCycle(
                    asset
                );
            }
        );

    card
        .querySelector(
            ".graphic-schedule-next"
        )
        ?.addEventListener(
            "click",
            () => {
                openGraphicEditor(
                    asset.type
                );
            }
        );

    card
        .querySelector(
            ".graphic-delete"
        )
        .addEventListener(
            "click",
            () => {
                deleteGraphicAsset(
                    asset
                );
            }
        );

    return card;
}

function renderGraphicsPipeline() {

    const container =
        getElement(
            "graphicsQueue"
        );

    const counts =
        getElement(
            "graphicsCounts"
        );

    const now =
        new Date();

    const live =
        graphicAssets
            .filter(asset =>
                getGraphicPipelineState(
                    asset,
                    now
                ) === "live"
            )
            .sort((a, b) =>
                String(
                    a.label || a.type
                ).localeCompare(
                    String(
                        b.label || b.type
                    )
                )
            );

    const scheduled =
        graphicAssets
            .filter(asset =>
                getGraphicPipelineState(
                    asset,
                    now
                ) === "scheduled"
            )
            .sort((a, b) => {

                const aDate =
                    timestampToDate(
                        a.goLiveAt
                    )?.getTime() || 0;

                const bDate =
                    timestampToDate(
                        b.goLiveAt
                    )?.getTime() || 0;

                return aDate - bDate;
            });

    counts.textContent =
        `${live.length} live • ${scheduled.length} scheduled`;

    container.innerHTML = "";

    if (
        !live.length &&
        !scheduled.length
    ) {
        container.textContent =
            "No live or scheduled graphics.";
        return;
    }

    if (live.length) {

        const heading =
            document.createElement(
                "h3"
            );

        heading.textContent =
            "🟢 Live Graphics";

        container.appendChild(
            heading
        );

        live.forEach(asset => {
            container.appendChild(
                renderGraphicPipelineCard(
                    asset,
                    "live"
                )
            );
        });
    }

    if (scheduled.length) {

        const heading =
            document.createElement(
                "h3"
            );

        heading.textContent =
            "🕒 Scheduled Graphics";

        if (live.length) {
            heading.style.marginTop =
                "28px";
        }

        container.appendChild(
            heading
        );

        scheduled.forEach(asset => {
            container.appendChild(
                renderGraphicPipelineCard(
                    asset,
                    "scheduled"
                )
            );
        });
    }
}

/* ============================
   EXPIRED METADATA CLEANUP
============================ */

function isExpiredBeyondCleanupGrace(
    value,
    now = new Date()
) {

    const expiresAt =
        timestampToDate(
            value
        );

    if (!expiresAt) {
        return false;
    }

    return (
        expiresAt.getTime() <=
        now.getTime() -
            CLEANUP_GRACE_MS
    );
}

async function cleanupExpiredMetadataOnAdminLoad() {

    const now =
        new Date();

    const expiredGraphics =
        graphicAssets.filter(asset =>
            isExpiredBeyondCleanupGrace(
                asset.hideAfterAt,
                now
            )
        );

    const expiredFeatured =
        featuredEvents.filter(event =>
            isExpiredBeyondCleanupGrace(
                event.endAt,
                now
            )
        );

    let cleaned = 0;

    for (const asset of expiredGraphics) {

        try {

            if (asset.imagePath) {
                await deleteManagedGraphic(
                    asset.imagePath
                );
            }

            await deleteDoc(
                doc(
                    db,
                    "graphicAssets",
                    asset.id
                )
            );

            cleaned += 1;

        } catch (error) {

            console.warn(
                "Expired graphic cleanup was deferred:",
                asset.id,
                error
            );
        }
    }

    for (const event of expiredFeatured) {

        try {

            if (event.imagePath) {
                await deleteManagedGraphic(
                    event.imagePath
                );
            }

            await deleteDoc(
                doc(
                    db,
                    "featuredEvents",
                    event.id
                )
            );

            cleaned += 1;

        } catch (error) {

            console.warn(
                "Expired featured-event cleanup was deferred:",
                event.id,
                error
            );
        }
    }

    return cleaned;
}

/* ============================
   LOAD FIRESTORE DATA
============================ */

async function loadGraphicAssets() {

    const snapshot =
        await getDocs(graphicAssetsCollection);

    graphicAssets = [];

    snapshot.forEach(documentSnapshot => {
        graphicAssets.push({
            id: documentSnapshot.id,
            ...documentSnapshot.data()
        });
    });

}

async function loadFeaturedEvents() {

    const snapshot =
        await getDocs(featuredEventsCollection);

    featuredEvents = [];

    snapshot.forEach(documentSnapshot => {
        featuredEvents.push({
            id: documentSnapshot.id,
            ...documentSnapshot.data()
        });
    });

}

async function loadAllGraphicsData() {

    try {

        await Promise.all([
            loadGraphicAssets(),
            loadFeaturedEvents()
        ]);

        renderGraphicStatuses();
        renderFeaturedPositionCards();
        renderFeaturedQueue();
        renderGraphicsPipeline();

    } catch (error) {

        console.error(
            "Unable to load Event Graphics Manager data:",
            error
        );

        getElement("graphicsCounts").textContent =
            "Unable to load graphics data.";

        getElement("featured-event-queue").textContent =
            "Unable to load featured events.";

    }

}

/* ============================
   INITIALIZE
============================ */

export async function initGraphicsManager() {

    document
        .querySelectorAll(
            ".graphic-planner-item[data-graphic-type]"
        )
        .forEach(card => {

            card.addEventListener("click", () => {

                openGraphicEditor(
                    card.dataset.graphicType
                );

            });

        });

    document
        .querySelectorAll(
            ".featured-queue-card[data-featured-position]"
        )
        .forEach(card => {

            card.addEventListener("click", () => {

                const roles =
                    getFeaturedRoleState();

                const event =
                    roles[card.dataset.featuredPosition] || null;

                loadFeaturedEventIntoEditor(event);

            });

        });

    getElement("saveGraphic")
        .addEventListener("click", () => {
            saveGraphic({ publishNow: false });
        });

    getElement("publishGraphicNow")
        .addEventListener("click", () => {
            saveGraphic({ publishNow: true });
        });

    getElement("clearGraphic")
        .addEventListener(
            "click",
            clearGraphicEditor
        );

    getElement("saveFeaturedEvent")
        .addEventListener(
            "click",
            saveFeaturedEvent
        );

    getElement("clearFeaturedEvent")
        .addEventListener(
            "click",
            clearFeaturedEventEditor
        );

    await loadAllGraphicsData();

    const cleaned =
        await cleanupExpiredMetadataOnAdminLoad();

    if (cleaned > 0) {
        await loadAllGraphicsData();
    }

}
