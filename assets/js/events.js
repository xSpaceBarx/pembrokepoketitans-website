import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("Event Hub loaded");

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

const TYPE_ALIASES = [
    ["communitydayclassic", ["communitydayclassic", "community day classic"]],
    ["megaraidday", ["megaraidday", "mega raid day"]],
    ["shadowraidday", ["shadowraidday", "shadow raid day"]],
    ["maxbattleday", ["maxbattleday", "max battle day"]],
    ["catchmasteryday", ["catchmasteryday", "catch mastery day"]],
    ["spotlighthour", ["spotlighthour", "spotlight hour"]],
    ["seasonaldetails", ["seasonaldetails", "seasonal details", "seasonal"]],
    ["communityday", ["communityday", "community day"]],
    ["maxmonday", ["maxmonday", "max monday"]],
    ["researchday", ["researchday", "research day"]],
    ["globalevent", ["globalevent", "global event"]],
    ["ticketedevent", ["ticketedevent", "ticketed event"]],
    ["hatchday", ["hatchday", "hatch day"]],
    ["raidday", ["raidday", "raid day"]],
    ["monthly", ["monthly", "monthly calendar"]]
];

const FEATURED_ROLE_ALIASES = [
    ["future2", ["futureevent2", "future event 2"]],
    ["current", ["currentevent", "current pokemon go event"]],
    ["upcoming", ["upcomingevent", "upcoming event"]],
    ["future", ["futureevent", "future event"]]
];

function timestampToDate(value) {

    if (!value) return null;

    if (
        typeof value.toDate ===
        "function"
    ) {
        return value.toDate();
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
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
        new Date(`${value}T12:00:00`);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

function normalizeText(value) {

    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function legacySearchText(event) {

    return normalizeText([
        event?.title,
        event?.alt,
        event?.image
    ].join(" "));
}

function inferLegacyType(event) {

    const searchable =
        legacySearchText(event);

    for (const [type, aliases] of TYPE_ALIASES) {

        if (
            aliases.some(alias =>
                searchable.includes(
                    normalizeText(alias)
                )
            )
        ) {
            return type;
        }
    }

    return null;
}

function inferFeaturedRole(event) {

    const searchable =
        legacySearchText(event);

    for (
        const [role, aliases]
        of FEATURED_ROLE_ALIASES
    ) {
        if (
            aliases.some(alias =>
                searchable.includes(
                    normalizeText(alias)
                )
            )
        ) {
            return role;
        }
    }

    return null;
}

function safeHttpUrl(value) {

    if (!value) return "";

    try {

        const url =
            new URL(value, window.location.href);

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

function imageExists(src) {

    return new Promise(resolve => {

        if (!src) {
            resolve(false);
            return;
        }

        const image = new Image();

        image.onload = () =>
            resolve(true);

        image.onerror = () =>
            resolve(false);

        image.src = src;
    });
}

function getActiveGraphicByType(
    graphicAssets,
    type,
    now = new Date()
) {

    return graphicAssets
        .filter(asset => {

            if (asset.type !== type) {
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
    featuredEvents,
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

            const aDate =
                timestampToDate(
                    a.startAt
                )?.getTime() || 0;

            const bDate =
                timestampToDate(
                    b.startAt
                )?.getTime() || 0;

            return aDate - bDate;
        });
}

function getFeaturedRoleState(
    featuredEvents,
    now = new Date()
) {

    const usable =
        featuredEvents
            .filter(event => {

                const end =
                    timestampToDate(
                        event.endAt
                    );

                return end && end >= now;
            })
            .sort((a, b) => {

                const aDate =
                    timestampToDate(
                        a.startAt
                    )?.getTime() || 0;

                const bDate =
                    timestampToDate(
                        b.startAt
                    )?.getTime() || 0;

                return aDate - bDate;
            });

    const active =
        usable
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
                    end >= now
                );
            })
            .sort((a, b) => {

                const aDate =
                    timestampToDate(
                        a.startAt
                    )?.getTime() || 0;

                const bDate =
                    timestampToDate(
                        b.startAt
                    )?.getTime() || 0;

                return bDate - aDate;
            });

    const future =
        usable.filter(event => {

            const start =
                timestampToDate(
                    event.startAt
                );

            return start && start > now;
        });

    return {
        current:
            active[0] || null,
        upcoming:
            future[0] || null,
        future:
            future[1] || null,
        future2:
            future[2] || null
    };
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
        source: "managed-graphic",
        type: asset.type,
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
            asset.type === "ticketedevent"
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
            asset.type === "ticketedevent" &&
            asset.ticketUrl
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
        source: "featured",
        featuredId: event.id,
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

function legacyEventToCard(
    event,
    index
) {

    const sortDate =
        dateOnlyToDate(
            event.eventDate ||
            event.date ||
            event.startDate ||
            ""
        );

    return {
        source: "legacy",
        type:
            inferLegacyType(event),
        featuredRole:
            inferFeaturedRole(event),
        title:
            event.title ||
            "Pokémon GO Event",
        image:
            event.image || "",
        alt:
            event.alt ||
            event.title ||
            "Pokémon GO Event graphic",
        buttonLink:
            event.buttonLink || "",
        buttonText:
            event.buttonText ||
            "Learn More",
        sortDate,
        legacyIndex: index
    };
}

function createEventCard(card) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "event-card";

    const title =
        document.createElement("h2");

    title.className =
        "section-title";

    title.textContent =
        card.title;

    wrapper.appendChild(title);

    const image =
        document.createElement("img");

    image.src =
        card.image;

    image.alt =
        card.alt;

    image.className =
        "current-event-image";

    wrapper.appendChild(image);

    const buttonUrl =
        safeHttpUrl(
            card.buttonLink
        );

    if (buttonUrl) {

        const buttonContainer =
            document.createElement("div");

        buttonContainer.className =
            "event-button-container";

        const button =
            document.createElement("a");

        button.href =
            buttonUrl;

        button.target = "_blank";
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
        dates
            .filter(date =>
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

function updateLastUpdated({
    legacyResponse,
    legacyData,
    managedCards
}) {

    const element =
        document.getElementById(
            "last-updated"
        );

    if (!element) return;

    const dates = [];

    const lastModified =
        legacyResponse?.headers?.get(
            "Last-Modified"
        );

    if (lastModified) {

        const date =
            new Date(lastModified);

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {
            dates.push(date);
        }
    }

    managedCards.forEach(card => {

        if (card.updatedAt) {
            dates.push(card.updatedAt);
        }
    });

    const latest =
        getLatestDate(dates);

    if (latest) {

        element.textContent =
            `Last Updated: ${latest.toLocaleDateString(
                "en-US",
                {
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                }
            )}`;

        return;
    }

    if (legacyData?.lastUpdated) {

        element.textContent =
            `Last Updated: ${legacyData.lastUpdated}`;

        return;
    }

    element.textContent = "";
}

async function loadLegacyEventHub() {

    const response =
        await fetch(
            "./data/eventhub.json"
        );

    if (!response.ok) {
        throw new Error(
            "Unable to load eventhub.json"
        );
    }

    const data =
        await response.json();

    return {
        response,
        data
    };
}

async function loadManagedEventHub() {

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

    const graphicAssets = [];
    const featuredEvents = [];

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

    return {
        graphicAssets,
        featuredEvents
    };
}

async function buildMergedCards({
    legacyData,
    managedData
}) {

    const now = new Date();

    const legacyCards =
        Array.isArray(
            legacyData?.events
        )
            ? legacyData.events.map(
                legacyEventToCard
              )
            : [];

    const activeManagedGraphics = [];

    for (const type of EVENT_PAGE_TYPES) {

        const active =
            getActiveGraphicByType(
                managedData.graphicAssets,
                type,
                now
            );

        if (!active) continue;

        const card =
            managedGraphicToCard(
                active
            );

        if (
            await imageExists(
                card.image
            )
        ) {
            activeManagedGraphics.push(
                card
            );
        } else {
            console.warn(
                `Managed ${type} image is not available yet. Keeping the legacy Event Hub fallback.`
            );
        }
    }

    const usableFeatured =
        getUsableFeaturedEvents(
            managedData.featuredEvents,
            now
        );

    const workingFeatured = [];

    for (const event of usableFeatured) {

        const card =
            featuredEventToCard(
                event
            );

        if (
            await imageExists(
                card.image
            )
        ) {
            workingFeatured.push({
                event,
                card
            });
        } else {
            console.warn(
                `Featured event image for "${event.name || event.id}" is not available yet.`
            );
        }
    }

    const workingFeaturedEvents =
        workingFeatured.map(
            item => item.event
        );

    const featuredRoles =
        getFeaturedRoleState(
            workingFeaturedEvents,
            now
        );

    const managedGraphicTypes =
        new Set(
            activeManagedGraphics.map(
                card => card.type
            )
        );

    const managedFeaturedRoles =
        new Set();

    Object.entries(
        featuredRoles
    ).forEach(([role, event]) => {

        if (event) {
            managedFeaturedRoles.add(role);
        }
    });

    const retainedLegacy =
        legacyCards.filter(card => {

            if (
                card.type &&
                managedGraphicTypes.has(
                    card.type
                )
            ) {
                return false;
            }

            if (
                card.featuredRole &&
                managedFeaturedRoles.has(
                    card.featuredRole
                )
            ) {
                return false;
            }

            return true;
        });

    const pinnedCards = [];

    PINNED_TYPES.forEach(type => {

        const managed =
            activeManagedGraphics.find(
                card =>
                    card.type === type
            );

        if (managed) {
            pinnedCards.push(managed);
            return;
        }

        const fallback =
            retainedLegacy.find(
                card =>
                    card.type === type
            );

        if (fallback) {
            pinnedCards.push(fallback);
        }
    });

    const pinnedCardSet =
        new Set(pinnedCards);

    const dynamicManaged = [
        ...activeManagedGraphics.filter(
            card =>
                !PINNED_TYPES.includes(
                    card.type
                )
        ),
        ...workingFeatured.map(
            item => item.card
        )
    ]
        .sort((a, b) => {

            const aTime =
                a.sortDate?.getTime() ??
                Number.MAX_SAFE_INTEGER;

            const bTime =
                b.sortDate?.getTime() ??
                Number.MAX_SAFE_INTEGER;

            return aTime - bTime;
        });

    const legacyFallback =
        retainedLegacy
            .filter(card =>
                !pinnedCardSet.has(card)
            )
            .sort((a, b) =>
                a.legacyIndex -
                b.legacyIndex
            );

    /*
     * During migration, managed cards sort by Event Date.
     * Any not-yet-migrated JSON cards remain afterward in
     * their existing JSON order as a safe fallback.
     * Once those cards are migrated, the dynamic section is
     * entirely date-driven automatically.
     */
    return {
        cards: [
            ...pinnedCards,
            ...dynamicManaged,
            ...legacyFallback
        ],
        managedCards: [
            ...activeManagedGraphics,
            ...workingFeatured.map(
                item => item.card
            )
        ]
    };
}

async function filterMissingImages(cards) {

    const checks =
        await Promise.all(
            cards.map(async card => ({
                card,
                exists:
                    await imageExists(
                        card.image
                    )
            }))
        );

    return checks
        .filter(item => item.exists)
        .map(item => item.card);
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

            const [
                legacyResult,
                managedResult
            ] =
                await Promise.allSettled([
                    loadLegacyEventHub(),
                    loadManagedEventHub()
                ]);

            const legacyLoaded =
                legacyResult.status ===
                "fulfilled";

            const managedLoaded =
                managedResult.status ===
                "fulfilled";

            if (
                !legacyLoaded &&
                !managedLoaded
            ) {
                throw new Error(
                    "Unable to load either Event Hub source."
                );
            }

            if (!legacyLoaded) {
                console.warn(
                    "Legacy eventhub.json could not be loaded. Using managed Firestore events only.",
                    legacyResult.reason
                );
            }

            if (!managedLoaded) {
                console.warn(
                    "Managed Event Hub data could not be loaded. Using eventhub.json fallback.",
                    managedResult.reason
                );
            }

            const legacyBundle =
                legacyLoaded
                    ? legacyResult.value
                    : {
                        response: null,
                        data: {
                            events: []
                        }
                      };

            let finalCards;
            let managedCards = [];

            if (managedLoaded) {

                const merged =
                    await buildMergedCards({
                        legacyData:
                            legacyBundle.data,
                        managedData:
                            managedResult.value
                    });

                finalCards =
                    merged.cards;

                managedCards =
                    merged.managedCards;

            } else {

                finalCards =
                    Array.isArray(
                        legacyBundle.data?.events
                    )
                        ? legacyBundle.data.events.map(
                            legacyEventToCard
                          )
                        : [];
            }

            /*
             * This repeats the old Event Hub safety behavior:
             * cards whose image cannot be loaded are skipped.
             */
            const visibleCards =
                await filterMissingImages(
                    finalCards
                );

            container.innerHTML = "";

            visibleCards.forEach(card => {
                container.appendChild(
                    createEventCard(card)
                );
            });

            if (!visibleCards.length) {
                container.innerHTML =
                    "<p>No event graphics are currently available.</p>";
            }

            updateLastUpdated({
                legacyResponse:
                    legacyBundle.response,
                legacyData:
                    legacyBundle.data,
                managedCards
            });

        } catch (error) {

            console.error(error);

            container.innerHTML =
                "<p>Unable to load Event Hub.</p>";
        }
    }
);
