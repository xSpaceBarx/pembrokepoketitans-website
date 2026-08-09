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
        "trainer-admin-count"
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
        trainerSnapshot
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
            trainerSnapshot.size
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
