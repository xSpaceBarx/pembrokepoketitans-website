import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("Dynamic Event Hub loaded");

const EVENT_PAGE_TYPES = new Set([
    "maxmonday",
    "spotlighthour",
    "monthly",
    "seasonaldetails",
    "communityday",
    "communitydayclassic",
    "hatchday",
    "raidday",
    "megaraidday",
    "shadowraidday",
    "maxbattleday",
    "catchmasteryday",
    "researchday",
    "globalevent",
    "ticketedevent"
]);

const PINNED_TYPES = [
    "monthly",
    "seasonaldetails"
];

let graphicAssets = [];
let featuredEvents = [];
let transitionTimer = null;

function timestampToDate(value) {

    if (!value) return null;

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

function dateOnlyToDate(value) {

    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return null;
    }

    const date =
        new Date(
            `${value}T12:00:00`
        );

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
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

function getActiveGraphicByType(
    type,
    now = new Date()
) {

    return graphicAssets
        .filter(asset => {

            if (
                asset.type !== type
            ) {
                return false;
            }

            const goLive =
                timestampToDate(
                    asset.goLiveAt
                );

            const hideAfter =
                timestampToDate(
                    asset.hideAfterAt
                );

            return (
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

function getUsableFeaturedEvents(
    now = new Date()
) {

    return featuredEvents
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
                end >= now &&
                (
                    event.imageUrl ||
                    event.imagePath
                )
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
        });
}

function managedGraphicToCard(asset) {

    const sortDate =
        dateOnlyToDate(
            asset.eventDate
        ) ||
        timestampToDate(
            asset.goLiveAt
        );

    return {
        source:
            "graphicAssets",
        id:
            asset.id,
        type:
            asset.type,
        title:
            asset.label ||
            "Pokémon GO Event",
        image:
            asset.imageUrl ||
            asset.imagePath,
        alt:
            asset.label ||
            "Pokémon GO Event graphic",
        buttonLink:
            asset.type ===
            "ticketedevent"
                ? (
                    asset.ticketUrl ||
                    asset.link ||
                    ""
                  )
                : (
                    asset.link ||
                    ""
                  ),
        buttonText:
            (
                asset.type ===
                "ticketedevent" &&
                asset.ticketUrl
            )
                ? "Purchase Tickets"
                : "Learn More",
        sortDate,
        updatedAt:
            timestampToDate(
                asset.updatedAt
            ) ||
            timestampToDate(
                asset.createdAt
            )
    };
}

function featuredEventToCard(event) {

    return {
        source:
            "featuredEvents",
        id:
            event.id,
        title:
            event.name ||
            "Pokémon GO Event",
        image:
            event.imageUrl ||
            event.imagePath,
        alt:
            event.name ||
            "Pokémon GO Event graphic",
        buttonLink:
            event.link || "",
        buttonText:
            "Learn More",
        sortDate:
            timestampToDate(
                event.startAt
            ),
        updatedAt:
            timestampToDate(
                event.updatedAt
            ) ||
            timestampToDate(
                event.createdAt
            )
    };
}

function createEventCard(card) {

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "event-card";

    const title =
        document.createElement(
            "h2"
        );

    title.className =
        "section-title";

    title.textContent =
        card.title;

    wrapper.appendChild(
        title
    );

    const imageSource =
        safeHttpUrl(
            card.image
        );

    if (imageSource) {

        const image =
            document.createElement(
                "img"
            );

        image.src =
            imageSource;

        image.alt =
            card.alt;

        image.className =
            "current-event-image";

        image.addEventListener(
            "error",
            () => {
                image.style.display =
                    "none";
            }
        );

        wrapper.appendChild(
            image
        );
    }

    const buttonUrl =
        safeHttpUrl(
            card.buttonLink
        );

    if (buttonUrl) {

        const buttonContainer =
            document.createElement(
                "div"
            );

        buttonContainer.className =
            "event-button-container";

        const button =
            document.createElement(
                "a"
            );

        button.href =
            buttonUrl;

        button.target =
            "_blank";

        button.rel =
            "noopener noreferrer";

        button.className =
            "event-button";

        button.textContent =
            card.buttonText ||
            "Learn More";

        buttonContainer.appendChild(
            button
        );

        wrapper.appendChild(
            buttonContainer
        );
    }

    return wrapper;
}

function getLatestDate(dates) {

    const usable =
        dates.filter(date =>
            date instanceof Date &&
            !Number.isNaN(
                date.getTime()
            )
        );

    if (!usable.length) {
        return null;
    }

    return new Date(
        Math.max(
            ...usable.map(date =>
                date.getTime()
            )
        )
    );
}

function updateLastUpdated(cards) {

    const element =
        document.getElementById(
            "last-updated"
        );

    if (!element) return;

    const latest =
        getLatestDate(
            cards.map(card =>
                card.updatedAt
            )
        );

    if (!latest) {

        element.textContent = "";
        return;
    }

    element.textContent =
        `Last Updated: ${latest.toLocaleDateString(
            "en-US",
            {
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        )}`;
}

function buildEventCards() {

    const now =
        new Date();

    const managedGraphics = [];

    EVENT_PAGE_TYPES
        .forEach(type => {

            const active =
                getActiveGraphicByType(
                    type,
                    now
                );

            if (active) {
                managedGraphics.push(
                    managedGraphicToCard(
                        active
                    )
                );
            }
        });

    const featuredCards =
        getUsableFeaturedEvents(
            now
        )
            .map(
                featuredEventToCard
            );

    const pinned = [];

    PINNED_TYPES.forEach(type => {

        const card =
            managedGraphics.find(
                item =>
                    item.type === type
            );

        if (card) {
            pinned.push(card);
        }
    });

    const chronological = [
        ...managedGraphics.filter(
            card =>
                !PINNED_TYPES.includes(
                    card.type
                )
        ),
        ...featuredCards
    ]
        .sort((a, b) => {

            const aTime =
                a.sortDate?.getTime() ??
                Number.MAX_SAFE_INTEGER;

            const bTime =
                b.sortDate?.getTime() ??
                Number.MAX_SAFE_INTEGER;

            if (aTime !== bTime) {
                return aTime - bTime;
            }

            return String(
                a.title
            ).localeCompare(
                String(b.title)
            );
        });

    return [
        ...pinned,
        ...chronological
    ];
}

function renderEventHub() {

    const container =
        document.getElementById(
            "eventhub-container"
        );

    if (!container) return;

    const cards =
        buildEventCards();

    container.innerHTML = "";

    cards.forEach(card => {
        container.appendChild(
            createEventCard(card)
        );
    });

    if (!cards.length) {
        container.innerHTML =
            "<p>No event graphics are currently available.</p>";
    }

    updateLastUpdated(
        cards
    );
}

function scheduleNextTransition() {

    if (transitionTimer) {

        clearTimeout(
            transitionTimer
        );

        transitionTimer = null;
    }

    const now =
        new Date();

    const futureTimes = [];

    graphicAssets.forEach(asset => {

        if (
            !EVENT_PAGE_TYPES.has(
                asset.type
            )
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

    featuredEvents.forEach(event => {

        const end =
            timestampToDate(
                event.endAt
            );

        if (
            end &&
            end > now
        ) {
            futureTimes.push(
                end.getTime()
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

    transitionTimer =
        setTimeout(
            () => {
                renderEventHub();
                scheduleNextTransition();
            },
            Math.min(
                delay,
                MAX_TIMEOUT
            )
        );
}

async function loadDynamicEventHub() {

    const [
        graphicSnapshot,
        featuredSnapshot
    ] =
        await Promise.all([
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
            )
        ]);

    graphicAssets = [];
    featuredEvents = [];

    graphicSnapshot.forEach(
        documentSnapshot => {

            const data =
                documentSnapshot.data();

            if (
                EVENT_PAGE_TYPES.has(
                    data.type
                )
            ) {
                graphicAssets.push({
                    id:
                        documentSnapshot.id,
                    ...data
                });
            }
        }
    );

    featuredSnapshot.forEach(
        documentSnapshot => {

            featuredEvents.push({
                id:
                    documentSnapshot.id,
                ...documentSnapshot.data()
            });
        }
    );
}

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const container =
            document.getElementById(
                "eventhub-container"
            );

        if (!container) {
            return;
        }

        try {

            await loadDynamicEventHub();

            renderEventHub();

            scheduleNextTransition();

        } catch (error) {

            console.error(
                "Unable to load dynamic Event Hub:",
                error
            );

            container.innerHTML =
                "<p>Unable to load Event Hub.</p>";

            const updated =
                document.getElementById(
                    "last-updated"
                );

            if (updated) {
                updated.textContent = "";
            }
        }
    }
);
