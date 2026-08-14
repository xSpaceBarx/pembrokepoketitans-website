import { db } from "./firebase.js";
import { loadDraft } from "./editDraft.js";
import { deleteDraft } from "./deleteDraft.js";
import { duplicateDraft } from "./duplicateDraft.js";
import { updatePlannerStatus } from "./plannerStatus.js";
import { plannerLookup } from "./plannerLookup.js";

import {
    collection,
    getDocs,
    orderBy,
    query,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const audienceNames = {

    meetup: "📍 PokéTitans Campfire Meetups",
    raidhour: "⚡ Raid Hour",
    spotlight: "✨ Spotlight Hour",
    maxmonday: "💎 Max Monday",
    raidrotation: "🆕 New Raid Boss Rotation",
    gopass: "🎟 Daily Bonuses & GO Pass",

    communityday: "🎉 Community Day",
    raidday: "⚔ Raid Day",
    hatchday: "🥚 Hatch Day",
    globalevent: "🌎 Global Events",
    trinket: "🍀 Lucky Trinket",
    research: "📦 Special Research",
    codes: "🎁 Redemption Codes",
    news: "🚨 Breaking News"

};

const statusPriority = {

    draft: 1,
    schedule: 2,
    published: 3

};

const TIME_ZONE =
    "America/New_York";

let scheduledFinalizeTimer =
    null;

function easternDateTimeToDate(
    dateValue,
    timeValue
) {

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            dateValue || ""
        ) ||
        !/^\d{2}:\d{2}$/.test(
            timeValue || ""
        )
    ) {
        return null;
    }

    const [
        year,
        month,
        day
    ] =
        dateValue
            .split("-")
            .map(Number);

    const [
        hour,
        minute
    ] =
        timeValue
            .split(":")
            .map(Number);

    let result =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
                0,
                0
            )
        );

    const formatter =
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
                second:
                    "2-digit",
                hourCycle:
                    "h23"
            }
        );

    for (
        let pass = 0;
        pass < 2;
        pass += 1
    ) {

        const parts =
            Object.fromEntries(
                formatter
                    .formatToParts(
                        result
                    )
                    .filter(
                        part =>
                            part.type !==
                            "literal"
                    )
                    .map(
                        part => [
                            part.type,
                            part.value
                        ]
                    )
            );

        const representedAsUtc =
            Date.UTC(
                Number(
                    parts.year
                ),
                Number(
                    parts.month
                ) - 1,
                Number(
                    parts.day
                ),
                Number(
                    parts.hour
                ),
                Number(
                    parts.minute
                ),
                Number(
                    parts.second
                )
            );

        const offset =
            representedAsUtc -
            result.getTime();

        result =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day,
                    hour,
                    minute,
                    0,
                    0
                ) -
                offset
            );
    }

    return result;
}

function scheduledTimeFor(
    notification
) {

    if (
        notification.status !==
            "schedule" ||
        !notification.date ||
        !notification.time
    ) {
        return null;
    }

    return easternDateTimeToDate(
        notification.date,
        notification.time
    );
}

async function finalizeDueScheduledNotifications(
    notifications,
    now = new Date()
) {

    const due =
        notifications.filter(
            notification => {

                const scheduledTime =
                    scheduledTimeFor(
                        notification
                    );

                return (
                    scheduledTime &&
                    scheduledTime <=
                        now
                );
            }
        );

    if (!due.length) {
        return false;
    }

    await Promise.all(
        due.map(
            notification =>
                updateDoc(
                    doc(
                        db,
                        "notifications",
                        notification.id
                    ),
                    {
                        status:
                            "published",
                        publishedAt:
                            serverTimestamp(),
                        updated:
                            serverTimestamp()
                    }
                )
        )
    );

    return true;
}

function scheduleNextPipelineRefresh(
    notifications
) {

    if (
        scheduledFinalizeTimer
    ) {
        clearTimeout(
            scheduledFinalizeTimer
        );

        scheduledFinalizeTimer =
            null;
    }

    const now =
        new Date();

    const futureTimes =
        notifications
            .map(
                scheduledTimeFor
            )
            .filter(
                value =>
                    value &&
                    value > now
            )
            .sort(
                (a, b) =>
                    a - b
            );

    if (!futureTimes.length) {
        return;
    }

    const nextTime =
        futureTimes[0];

    const delay =
        Math.max(
            1000,
            nextTime.getTime() -
            now.getTime() +
            1500
        );

    const MAX_TIMEOUT =
        2147483647;

    scheduledFinalizeTimer =
        setTimeout(
            async () => {

                try {
                    await loadDrafts();
                    await updatePlannerStatus();
                } catch (error) {
                    console.error(
                        "Unable to auto-finalize scheduled notification:",
                        error
                    );
                }

            },
            Math.min(
                delay,
                MAX_TIMEOUT
            )
        );
}


export async function loadDrafts() {

    const draftContainer = document.getElementById("draftQueue");

    if (!draftContainer) return;

    draftContainer.innerHTML = "Loading notifications...";

    Object.keys(plannerLookup).forEach(key => delete plannerLookup[key]);

    try {

        const q = query(
            collection(db, "notifications"),
            orderBy("created", "desc")
        );

        let snapshot = await getDocs(q);

        let notifications =
            snapshot.docs.map(
                item => ({
                    id:
                        item.id,
                    ...item.data()
                })
            );

        const finalized =
            await finalizeDueScheduledNotifications(
                notifications
            );

        if (finalized) {

            snapshot =
                await getDocs(q);

            notifications =
                snapshot.docs.map(
                    item => ({
                        id:
                            item.id,
                        ...item.data()
                    })
                );
        }

        const drafts = [];
        const scheduled = [];
        const published = [];

        notifications.forEach(
            notification => {

            const existing = plannerLookup[notification.audience];

            if (

                !existing ||

                statusPriority[notification.status] >
                statusPriority[existing.status]

            ) {

                plannerLookup[notification.audience] = {

                    id: notification.id,
                    status: notification.status

                };

            }

            switch (notification.status) {

                case "draft":
                    drafts.push(notification);
                    break;

                case "schedule":
                    scheduled.push(notification);
                    break;

                case "published":
                    published.push(notification);
                    break;

            }

        });

        scheduleNextPipelineRefresh(
            notifications
        );

        // Drafts -> newest updated first
        drafts.sort((a, b) => {

            const aTime =
                a.updated?.seconds || a.created?.seconds || 0;

            const bTime =
                b.updated?.seconds || b.created?.seconds || 0;

            return bTime - aTime;

        });

        // Scheduled -> soonest date/time first
        scheduled.sort((a, b) => {

            const aDate = new Date(
                `${a.date || "9999-12-31"}T${a.time || "23:59"}`
            );

            const bDate = new Date(
                `${b.date || "9999-12-31"}T${b.time || "23:59"}`
            );

            return aDate - bDate;

        });

        // Published -> newest published first
        published.sort((a, b) => {

            const aTime =
                a.publishedAt?.seconds ||
                a.updated?.seconds ||
                a.created?.seconds ||
                0;

            const bTime =
                b.publishedAt?.seconds ||
                b.updated?.seconds ||
                b.created?.seconds ||
                0;

            return bTime - aTime;

        });

        document.getElementById("draftCounts").innerHTML = `
            📝 Drafts: <strong>${drafts.length}</strong>
            &nbsp;&nbsp;&nbsp;
            📅 Scheduled: <strong>${scheduled.length}</strong>
            &nbsp;&nbsp;&nbsp;
            🚀 Published: <strong>${published.length}</strong>
        `;

        draftContainer.innerHTML = "";

        renderSection(
            "📝 Drafts",
            "Newest drafts appear first",
            drafts
        );

        renderSection(
            "📅 Scheduled",
            "Soonest notifications appear first",
            scheduled
        );

        renderSection(
            "🚀 Published",
            "Most recently published first",
            published,
            true
        );

        wireButtons();

    }

    catch (err) {

        console.error(err);

        draftContainer.innerHTML =
            "<p>Unable to load notifications.</p>";

    }

}

function notificationCardHtml(notification) {

    return `

        <div class="draft-card">

            <h3>${notification.title}</h3>

            <p>
                <strong>Audience:</strong>
                ${audienceNames[notification.audience] || notification.audience}
            </p>

            <p>
                <strong>Date:</strong>
                ${notification.date || "--"}
            </p>

            <p>
                <strong>Time:</strong>
                ${notification.time || "--"}
            </p>

            <div class="button-row">

                <button
                    class="edit-draft"
                    data-id="${notification.id}">
                    ✏ Edit
                </button>

                <button
                    class="duplicate-draft"
                    data-id="${notification.id}">
                    📋 Duplicate
                </button>

                <button
                    class="delete-draft"
                    data-id="${notification.id}">
                    🗑 Delete
                </button>

            </div>

        </div>

    `;

}

function renderSection(
    title,
    subtitle,
    list,
    collapsed = false
) {

    const container =
        document.getElementById(
            "draftQueue"
        );

    if (collapsed) {

        const cards =
            list.length
                ? list
                    .map(
                        notification =>
                            notificationCardHtml(
                                notification
                            )
                    )
                    .join("")
                : `
                    <p class="empty-section">
                        No notifications.
                    </p>
                `;

        container.innerHTML += `
            <details class="pipeline-collapsible">
                <summary>
                    <div class="pipeline-collapsible-summary">
                        <strong>${title} (${list.length})</strong>
                        <span>${subtitle} • Click to expand</span>
                    </div>
                </summary>

                <div class="pipeline-collapsible-content">
                    ${cards}
                </div>
            </details>
        `;

        return;
    }

    container.innerHTML += `
        <div class="pipeline-section-header">
            <h3>${title} (${list.length})</h3>
            <p>${subtitle}</p>
        </div>
    `;

    if (list.length === 0) {

        container.innerHTML += `
            <p class="empty-section">
                No notifications.
            </p>
        `;

        return;
    }

    list.forEach(notification => {

        container.innerHTML +=
            notificationCardHtml(
                notification
            );
    });

}

function wireButtons() {

    document.querySelectorAll(".edit-draft").forEach(button => {

        button.addEventListener("click", () => {

            loadDraft(button.dataset.id);

        });

    });

    document.querySelectorAll(".duplicate-draft").forEach(button => {

        button.addEventListener("click", async () => {

            await duplicateDraft(button.dataset.id);

            await loadDrafts();

            await updatePlannerStatus();

        });

    });

    document.querySelectorAll(".delete-draft").forEach(button => {

        button.addEventListener("click", async () => {

            await deleteDraft(button.dataset.id);

            await loadDrafts();

            await updatePlannerStatus();

        });

    });

}

loadDrafts();
