import { db } from "./firebase.js";

import {
    collection,
    doc,
    getDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const REQUIRED_RECURRING_GRAPHICS = [
    {
        type: "goweekly",
        label: "GO Weekly"
    },
    {
        type: "legendary",
        label: "Legendary Raids"
    },
    {
        type: "mega",
        label: "Mega Raids"
    },
    {
        type: "maxmonday",
        label: "Max Monday"
    },
    {
        type: "spotlighthour",
        label: "Spotlight Hour"
    },
    {
        type: "monthly",
        label: "Monthly Calendar"
    },
    {
        type: "seasonaldetails",
        label: "Seasonal Details"
    },
    {
        type: "shadowraids",
        label: "Shadow Raids"
    }
];

const REQUIRED_WEEKLY_NOTIFICATIONS = [
    {
        audience: "maxmonday",
        label: "Max Monday"
    },
    {
        audience: "spotlight",
        label: "Spotlight Hour"
    },
    {
        audience: "raidhour",
        label: "Raid Hour"
    },
    {
        audience: "raidrotation",
        label: "Raid Boss Rotation"
    }
];

/*
 * Daily Bonuses / GO Pass is intentionally NOT included above.
 * It is optional and should never create a weekly dashboard warning.
 */

const GRAPHIC_EXPIRY_WARNING_MS =
    48 * 60 * 60 * 1000;

const TIME_ZONE =
    "America/New_York";

let refreshInProgress = false;
let refreshQueued = false;
let observerRefreshTimer = null;

function getElement(id) {
    return document.getElementById(id);
}

function timestampToDate(value) {

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

function easternDateParts(
    value = new Date()
) {

    const date =
        timestampToDate(value) ||
        new Date();

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
        ).formatToParts(
            date
        );

    const lookup = {};

    parts.forEach(part => {

        if (
            part.type !==
            "literal"
        ) {
            lookup[
                part.type
            ] =
                part.value;
        }
    });

    return {
        year:
            Number(
                lookup.year
            ),
        month:
            Number(
                lookup.month
            ),
        day:
            Number(
                lookup.day
            )
    };
}

function dateKeyFromParts(
    year,
    month,
    day
) {

    return [
        String(year)
            .padStart(4, "0"),
        String(month)
            .padStart(2, "0"),
        String(day)
            .padStart(2, "0")
    ].join("-");
}

function easternDateKey(
    value = new Date()
) {

    const parts =
        easternDateParts(
            value
        );

    return dateKeyFromParts(
        parts.year,
        parts.month,
        parts.day
    );
}

function shiftDateKey(
    dateKey,
    days
) {

    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/
            .exec(
                dateKey
            );

    if (!match) {
        return "";
    }

    const date =
        new Date(
            Date.UTC(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3]) + days,
                12
            )
        );

    return dateKeyFromParts(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate()
    );
}

function getEasternWeekRange(
    now = new Date()
) {

    const todayKey =
        easternDateKey(
            now
        );

    const [
        year,
        month,
        day
    ] =
        todayKey
            .split("-")
            .map(Number);

    const dayOfWeek =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                12
            )
        ).getUTCDay();

    const daysSinceMonday =
        (
            dayOfWeek + 6
        ) % 7;

    const start =
        shiftDateKey(
            todayKey,
            -daysSinceMonday
        );

    const end =
        shiftDateKey(
            start,
            6
        );

    return {
        start,
        end
    };
}

function notificationDateKey(
    notification
) {

    if (
        typeof notification.date ===
            "string" &&
        /^\d{4}-\d{2}-\d{2}$/
            .test(
                notification.date
            )
    ) {
        return notification.date;
    }

    const timestamp =
        notification.publishedAt ||
        notification.updated ||
        notification.created ||
        null;

    return timestamp
        ? easternDateKey(
            timestamp
        )
        : "";
}

function notificationCountsForWeek(
    notifications,
    now = new Date()
) {

    const range =
        getEasternWeekRange(
            now
        );

    const result = {};

    REQUIRED_WEEKLY_NOTIFICATIONS
        .forEach(config => {

            result[
                config.audience
            ] = {
                ...config,
                records: []
            };
        });

    notifications.forEach(
        notification => {

            const bucket =
                result[
                    notification.audience
                ];

            if (!bucket) {
                return;
            }

            const dateKey =
                notificationDateKey(
                    notification
                );

            if (
                dateKey &&
                dateKey >= range.start &&
                dateKey <= range.end
            ) {
                bucket.records.push(
                    notification
                );
            }
        }
    );

    return {
        range,
        result
    };
}

function hasScheduledReplacement(
    graphics,
    asset,
    now = new Date()
) {

    const hideAfter =
        timestampToDate(
            asset.hideAfterAt
        );

    return graphics.some(
        candidate => {

            if (
                candidate.id === asset.id ||
                candidate.type !== asset.type
            ) {
                return false;
            }

            const goLive =
                timestampToDate(
                    candidate.goLiveAt
                );

            if (
                !goLive ||
                goLive <= now
            ) {
                return false;
            }

            /*
             * Count it as a replacement when the next version is scheduled
             * before the current graphic expires, or within 12 hours after.
             * This avoids treating a much-later graphic as adequate coverage.
             */
            const latestAcceptableStart =
                hideAfter
                    ? hideAfter.getTime() +
                        (
                            12 *
                            60 *
                            60 *
                            1000
                        )
                    : Number.POSITIVE_INFINITY;

            return (
                goLive.getTime() <=
                latestAcceptableStart
            );
        }
    );
}

function formatDate(value) {

    const date =
        timestampToDate(value);

    if (!date) {
        return "";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            weekday: "short",
            month: "short",
            day: "numeric"
        }
    );
}

function formatTime(value) {

    const date =
        timestampToDate(value);

    if (!date) {
        return "";
    }

    return date.toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}

function formatShortDateTime(value) {

    const date =
        timestampToDate(value);

    if (!date) {
        return "";
    }

    return `${formatDate(date)} • ${formatTime(date)}`;
}

function setText(
    id,
    value
) {

    const element =
        getElement(id);

    if (element) {
        element.textContent =
            value;
    }
}

function setStatus(
    id,
    tone,
    text
) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.className =
        `site-status-state site-status-${tone}`;

    element.textContent =
        text;
}

function graphicState(
    asset,
    now
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

function getAnnouncementState(
    data,
    now
) {

    if (!data) {
        return {
            tone: "neutral",
            label: "⚪ Not Saved",
            detail: "No homepage announcement saved."
        };
    }

    if (
        data.enabled !== true
    ) {
        return {
            tone: "neutral",
            label: "⚪ Disabled",
            detail:
                data.title ||
                "No announcement is currently displayed."
        };
    }

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
        return {
            tone: "scheduled",
            label: "🕒 Scheduled",
            detail:
                `${data.title || "Announcement"} • ${formatShortDateTime(start)}`
        };
    }

    if (
        end &&
        end <= now
    ) {
        return {
            tone: "muted",
            label: "⚫ Expired",
            detail:
                data.title ||
                "The saved announcement has expired."
        };
    }

    return {
        tone: "good",
        label: "🟢 Live",
        detail:
            data.title ||
            "Homepage announcement is active."
    };
}

function appendAttentionItem(
    container,
    {
        tone = "warning",
        icon = "🟡",
        text,
        href = ""
    }
) {

    const item =
        href
            ? document.createElement(
                "a"
            )
            : document.createElement(
                "div"
            );

    item.className =
        `site-attention-item site-attention-${tone}`;

    if (href) {
        item.href =
            href;
    }

    const iconSpan =
        document.createElement(
            "span"
        );

    iconSpan.className =
        "site-attention-icon";

    iconSpan.textContent =
        icon;

    const textSpan =
        document.createElement(
            "span"
        );

    textSpan.textContent =
        text;

    item.append(
        iconSpan,
        textSpan
    );

    container.appendChild(
        item
    );
}

function scheduleObserverRefresh() {

    if (observerRefreshTimer) {
        clearTimeout(
            observerRefreshTimer
        );
    }

    observerRefreshTimer =
        setTimeout(
            () => {
                refreshSiteStatusDashboard();
            },
            450
        );
}

function observeAdminManagers() {

    const targetIds = [
        "draftCounts",
        "announcement-admin-status",
        "meetup-list",
        "graphicsCounts",
        "featured-event-queue",
        "trainer-admin-count",
        "resource-admin-count"
    ];

    const observer =
        new MutationObserver(
            scheduleObserverRefresh
        );

    targetIds.forEach(id => {

        const target =
            getElement(id);

        if (!target) {
            return;
        }

        observer.observe(
            target,
            {
                childList: true,
                subtree: true,
                characterData: true
            }
        );
    });
}

async function loadDashboardData() {

    const [
        announcementSnapshot,
        meetupSnapshot,
        notificationSnapshot,
        graphicSnapshot,
        featuredSnapshot,
        trainerSnapshot,
        resourceSnapshot
    ] =
        await Promise.all([
            getDoc(
                doc(
                    db,
                    "siteAnnouncements",
                    "homepage"
                )
            ),
            getDocs(
                collection(
                    db,
                    "meetups"
                )
            ),
            getDocs(
                collection(
                    db,
                    "notifications"
                )
            ),
            getDocs(
                collection(
                    db,
                    "graphicAssets"
                )
            ),
            getDocs(
                collection(
                    db,
                    "featuredEvents"
                )
            ),
            getDocs(
                collection(
                    db,
                    "trainers"
                )
            ),
            getDocs(
                collection(
                    db,
                    "resources"
                )
            )
        ]);

    return {
        announcement:
            announcementSnapshot.exists()
                ? announcementSnapshot.data()
                : null,
        meetups:
            meetupSnapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            ),
        notifications:
            notificationSnapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            ),
        graphics:
            graphicSnapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            ),
        featuredEvents:
            featuredSnapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            ),
        trainerCount:
            trainerSnapshot.size,
        resources:
            resourceSnapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            )
    };
}

function renderDashboard(
    data
) {

    const now =
        new Date();

    // ---------------------------------
    // Announcement
    // ---------------------------------

    const announcementState =
        getAnnouncementState(
            data.announcement,
            now
        );

    setStatus(
        "status-announcement-state",
        announcementState.tone,
        announcementState.label
    );

    setText(
        "status-announcement-detail",
        announcementState.detail
    );

    // ---------------------------------
    // Next Meetup
    // ---------------------------------

    const upcomingMeetups =
        data.meetups
            .filter(meetup => {

                const end =
                    timestampToDate(
                        meetup.endDateTime
                    );

                const start =
                    timestampToDate(
                        meetup.startDateTime
                    );

                if (end) {
                    return end >= now;
                }

                return (
                    start &&
                    start >= now
                );
            })
            .sort((a, b) => {

                const aTime =
                    timestampToDate(
                        a.startDateTime
                    )?.getTime() || 0;

                const bTime =
                    timestampToDate(
                        b.startDateTime
                    )?.getTime() || 0;

                return aTime - bTime;
            });

    const nextMeetup =
        upcomingMeetups[0] ||
        null;

    if (nextMeetup) {

        setStatus(
            "status-meetup-state",
            "good",
            "🟢 Scheduled"
        );

        setText(
            "status-meetup-detail",
            nextMeetup.title ||
            "Upcoming Meetup"
        );

        setText(
            "status-meetup-subdetail",
            `${formatDate(
                nextMeetup.startDateTime
            )} • ${formatTime(
                nextMeetup.startDateTime
            )}`
        );

    } else {

        setStatus(
            "status-meetup-state",
            "warning",
            "🟡 None Scheduled"
        );

        setText(
            "status-meetup-detail",
            "No upcoming meetups."
        );

        setText(
            "status-meetup-subdetail",
            ""
        );
    }

    // ---------------------------------
    // Notifications
    // ---------------------------------

    const notificationCounts = {
        draft: 0,
        schedule: 0,
        published: 0
    };

    data.notifications.forEach(
        notification => {

            if (
                Object.hasOwn(
                    notificationCounts,
                    notification.status
                )
            ) {
                notificationCounts[
                    notification.status
                ] += 1;
            }
        }
    );

    setStatus(
        "status-notification-state",
        notificationCounts.draft > 0
            ? "warning"
            : "good",
        notificationCounts.draft > 0
            ? `🟡 ${notificationCounts.draft} Draft${notificationCounts.draft === 1 ? "" : "s"}`
            : "🟢 No Drafts Waiting"
    );

    setText(
        "status-notification-detail",
        `${notificationCounts.schedule} scheduled • ${notificationCounts.published} published`
    );

    // ---------------------------------
    // Graphics
    // ---------------------------------

    const liveGraphics =
        data.graphics.filter(
            asset =>
                graphicState(
                    asset,
                    now
                ) === "live"
        );

    const scheduledGraphics =
        data.graphics.filter(
            asset =>
                graphicState(
                    asset,
                    now
                ) === "scheduled"
        );

    setStatus(
        "status-graphics-state",
        "good",
        `🟢 ${liveGraphics.length} Live`
    );

    setText(
        "status-graphics-detail",
        `${scheduledGraphics.length} scheduled`
    );

    // ---------------------------------
    // Featured Event
    // ---------------------------------

    const currentFeatured =
        data.featuredEvents
            .filter(event => {

                const start =
                    timestampToDate(
                        event.startAt
                    );

                const end =
                    timestampToDate(
                        event.endAt
                    );

                return (
                    start &&
                    end &&
                    start <= now &&
                    end > now
                );
            })
            .sort((a, b) => {

                const aTime =
                    timestampToDate(
                        a.startAt
                    )?.getTime() || 0;

                const bTime =
                    timestampToDate(
                        b.startAt
                    )?.getTime() || 0;

                return aTime - bTime;
            })[0] || null;

    const nextFeatured =
        data.featuredEvents
            .filter(event => {

                const start =
                    timestampToDate(
                        event.startAt
                    );

                const end =
                    timestampToDate(
                        event.endAt
                    );

                return (
                    start &&
                    end &&
                    start > now &&
                    end > now
                );
            })
            .sort((a, b) => {

                const aTime =
                    timestampToDate(
                        a.startAt
                    )?.getTime() || 0;

                const bTime =
                    timestampToDate(
                        b.startAt
                    )?.getTime() || 0;

                return aTime - bTime;
            })[0] || null;

    if (currentFeatured) {

        setStatus(
            "status-featured-state",
            "good",
            "🟢 Current Event"
        );

        setText(
            "status-featured-detail",
            currentFeatured.name ||
            "Featured Event"
        );

        setText(
            "status-featured-subdetail",
            nextFeatured
                ? `Next: ${nextFeatured.name || "Upcoming Event"}`
                : "No next featured event queued."
        );

    } else if (nextFeatured) {

        setStatus(
            "status-featured-state",
            "scheduled",
            "🕒 Next Event Queued"
        );

        setText(
            "status-featured-detail",
            nextFeatured.name ||
            "Upcoming Event"
        );

        setText(
            "status-featured-subdetail",
            `Starts ${formatShortDateTime(
                nextFeatured.startAt
            )}`
        );

    } else {

        setStatus(
            "status-featured-state",
            "warning",
            "🟡 No Event Queued"
        );

        setText(
            "status-featured-detail",
            "No current or upcoming featured event."
        );

        setText(
            "status-featured-subdetail",
            ""
        );
    }

    // ---------------------------------
    // Trainers
    // ---------------------------------

    setStatus(
        "status-trainers-state",
        "good",
        `🟢 ${data.trainerCount} Registered`
    );

    setText(
        "status-trainers-detail",
        `Trainer${data.trainerCount === 1 ? "" : "s"} in the directory`
    );

    // ---------------------------------
    // Resources
    // ---------------------------------

    const resourceCounts = {
        quickguides: {
            active: 0,
            total: 0
        },
        websites: {
            active: 0,
            total: 0
        },
        podcasts: {
            active: 0,
            total: 0
        },
        socials: {
            active: 0,
            total: 0
        }
    };

    data.resources.forEach(
        resource => {

            const bucket =
                resourceCounts[
                    resource.section
                ];

            if (!bucket) {
                return;
            }

            bucket.total += 1;

            if (
                resource.active ===
                true
            ) {
                bucket.active += 1;
            }
        }
    );

    const activeResourceTotal =
        Object.values(
            resourceCounts
        ).reduce(
            (
                total,
                item
            ) =>
                total +
                item.active,
            0
        );

    const resourceTotal =
        Object.values(
            resourceCounts
        ).reduce(
            (
                total,
                item
            ) =>
                total +
                item.total,
            0
        );

    const hiddenResourceTotal =
        Math.max(
            0,
            resourceTotal -
            activeResourceTotal
        );

    setStatus(
        "status-resources-state",
        activeResourceTotal > 0
            ? "good"
            : "neutral",
        activeResourceTotal > 0
            ? `🟢 ${activeResourceTotal} Active`
            : "⚪ 0 Active"
    );

    setText(
        "status-resources-detail",
        `${resourceCounts.quickguides.active} guides • ${resourceCounts.websites.active} websites`
    );

    setText(
        "status-resources-subdetail",
        `${resourceCounts.podcasts.active} podcasts • ${resourceCounts.socials.active} socials${
            hiddenResourceTotal > 0
                ? ` • ${hiddenResourceTotal} hidden`
                : ""
        }`
    );

    // ---------------------------------
    // Needs Attention
    // ---------------------------------

    const attentionContainer =
        getElement(
            "site-attention-list"
        );

    if (attentionContainer) {

        attentionContainer.innerHTML =
            "";

        let attentionCount =
            0;

        if (!nextMeetup) {

            attentionCount += 1;

            appendAttentionItem(
                attentionContainer,
                {
                    tone: "warning",
                    icon: "🟡",
                    text:
                        "No upcoming meetup is scheduled.",
                    href:
                        "#meetup-manager"
                }
            );
        }

        if (
            data.announcement?.enabled === true
        ) {

            const announcementEnd =
                timestampToDate(
                    data.announcement.endAt
                );

            if (
                announcementEnd &&
                announcementEnd <= now
            ) {

                attentionCount += 1;

                appendAttentionItem(
                    attentionContainer,
                    {
                        tone: "warning",
                        icon: "🟡",
                        text:
                            "The homepage announcement is enabled but has expired.",
                        href:
                            "#announcement-manager"
                    }
                );
            }
        }

        if (
            !currentFeatured &&
            !nextFeatured
        ) {

            attentionCount += 1;

            appendAttentionItem(
                attentionContainer,
                {
                    tone: "warning",
                    icon: "🟡",
                    text:
                        "No current or upcoming Featured Event is queued.",
                    href:
                        "#featured-event-manager"
                }
            );

        } else if (
            !currentFeatured &&
            nextFeatured
        ) {

            appendAttentionItem(
                attentionContainer,
                {
                    tone: "good",
                    icon: "🟢",
                    text:
                        `Next Featured Event is queued: ${nextFeatured.name || "Upcoming Event"}.`,
                    href:
                        "#featured-event-manager"
                }
            );
        }

        const missingGraphics =
            REQUIRED_RECURRING_GRAPHICS
                .filter(config => {

                    return !data.graphics.some(
                        asset => {

                            if (
                                asset.type !==
                                config.type
                            ) {
                                return false;
                            }

                            const state =
                                graphicState(
                                    asset,
                                    now
                                );

                            return (
                                state === "live" ||
                                state === "scheduled"
                            );
                        }
                    );
                });

        missingGraphics.forEach(
            graphic => {

                attentionCount += 1;

                appendAttentionItem(
                    attentionContainer,
                    {
                        tone: "warning",
                        icon: "🟡",
                        text:
                            `${graphic.label} graphic has no live or scheduled replacement.`,
                        href:
                            "#graphics-manager"
                    }
                );
            }
        );

        if (
            notificationCounts.draft > 0
        ) {

            attentionCount += 1;

            appendAttentionItem(
                attentionContainer,
                {
                    tone: "warning",
                    icon: "🟡",
                    text:
                        `${notificationCounts.draft} notification draft${notificationCounts.draft === 1 ? "" : "s"} waiting in the pipeline.`,
                    href:
                        "#notification-pipeline"
                }
            );
        }


        /*
         * Required weekly notification checks.
         * GO Pass / Daily Bonuses is intentionally optional and excluded.
         */
        const weeklyNotifications =
            notificationCountsForWeek(
                data.notifications,
                now
            );

        Object.values(
            weeklyNotifications.result
        ).forEach(
            item => {

                if (
                    item.records.length >
                    0
                ) {
                    return;
                }

                attentionCount += 1;

                appendAttentionItem(
                    attentionContainer,
                    {
                        tone:
                            "warning",
                        icon:
                            "🟡",
                        text:
                            `${item.label} notification has not been prepared this week.`,
                        href:
                            "#weekly-checklist"
                    }
                );
            }
        );

        /*
         * Advance warning: a live recurring graphic expires within
         * 48 hours and there is not yet another graphic of the same
         * type scheduled to replace it.
         */
        REQUIRED_RECURRING_GRAPHICS
            .forEach(
                config => {

                    const active =
                        data.graphics
                            .filter(
                                asset =>
                                    asset.type ===
                                        config.type &&
                                    graphicState(
                                        asset,
                                        now
                                    ) ===
                                        "live"
                            )
                            .sort(
                                (
                                    a,
                                    b
                                ) => {

                                    const aTime =
                                        timestampToDate(
                                            a.goLiveAt
                                        )?.getTime() ||
                                        0;

                                    const bTime =
                                        timestampToDate(
                                            b.goLiveAt
                                        )?.getTime() ||
                                        0;

                                    return (
                                        bTime -
                                        aTime
                                    );
                                }
                            )[0] ||
                        null;

                    if (!active) {
                        return;
                    }

                    const hideAfter =
                        timestampToDate(
                            active.hideAfterAt
                        );

                    if (!hideAfter) {
                        return;
                    }

                    const remaining =
                        hideAfter.getTime() -
                        now.getTime();

                    if (
                        remaining <= 0 ||
                        remaining >
                            GRAPHIC_EXPIRY_WARNING_MS
                    ) {
                        return;
                    }

                    if (
                        hasScheduledReplacement(
                            data.graphics,
                            active,
                            now
                        )
                    ) {
                        return;
                    }

                    attentionCount +=
                        1;

                    const hoursLeft =
                        Math.max(
                            1,
                            Math.ceil(
                                remaining /
                                (
                                    60 *
                                    60 *
                                    1000
                                )
                            )
                        );

                    const timingText =
                        hoursLeft <= 24
                            ? (
                                hoursLeft === 1
                                    ? "about 1 hour"
                                    : `about ${hoursLeft} hours`
                              )
                            : "within 48 hours";

                    appendAttentionItem(
                        attentionContainer,
                        {
                            tone:
                                "warning",
                            icon:
                                "🟡",
                            text:
                                `${config.label} graphic expires ${timingText} and has no replacement scheduled.`,
                            href:
                                "#graphics-manager"
                        }
                    );
                }
            );

        if (
            attentionCount === 0
        ) {

            appendAttentionItem(
                attentionContainer,
                {
                    tone: "good",
                    icon: "✅",
                    text:
                        "Everything looks good. No immediate Admin tasks detected."
                }
            );
        }
    }

    const refreshed =
        new Date();

    setText(
        "site-status-refreshed",
        `Last refreshed ${refreshed.toLocaleTimeString(
            "en-US",
            {
                hour:
                    "numeric",
                minute:
                    "2-digit"
            }
        )}`
    );
}

export async function refreshSiteStatusDashboard() {

    if (refreshInProgress) {
        refreshQueued =
            true;
        return;
    }

    refreshInProgress =
        true;

    const refreshButton =
        getElement(
            "refresh-site-status"
        );

    if (refreshButton) {
        refreshButton.disabled =
            true;
        refreshButton.textContent =
            "↻ Refreshing...";
    }

    try {

        const data =
            await loadDashboardData();

        renderDashboard(
            data
        );

    } catch (error) {

        console.error(
            "Unable to refresh Site Status dashboard:",
            error
        );

        setText(
            "site-status-refreshed",
            "Unable to refresh Site Status."
        );

    } finally {

        refreshInProgress =
            false;

        if (refreshButton) {
            refreshButton.disabled =
                false;
            refreshButton.textContent =
                "↻ Refresh Status";
        }

        if (refreshQueued) {

            refreshQueued =
                false;

            setTimeout(
                refreshSiteStatusDashboard,
                100
            );
        }
    }
}

export async function initSiteStatusDashboard() {

    const dashboard =
        getElement(
            "site-status-dashboard"
        );

    if (!dashboard) {
        return;
    }

    const dateElement =
        getElement(
            "site-status-date"
        );

    if (dateElement) {

        dateElement.textContent =
            new Date()
                .toLocaleDateString(
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

    getElement(
        "refresh-site-status"
    )?.addEventListener(
        "click",
        refreshSiteStatusDashboard
    );

    observeAdminManagers();

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.visibilityState ===
                "visible"
            ) {
                refreshSiteStatusDashboard();
            }
        }
    );

    await refreshSiteStatusDashboard();
}
