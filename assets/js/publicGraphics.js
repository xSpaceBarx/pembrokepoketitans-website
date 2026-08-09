import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const GRAPHIC_SLOTS = {
    goweekly: {
        scope: "document",
        keywords: [
            "goweekly",
            "go weekly"
        ]
    },

    legendary: {
        scope: "raids",
        keywords: [
            "legendary"
        ]
    },

    mega: {
        scope: "raids",
        keywords: [
            "mega"
        ]
    },

    shadowraids: {
        scope: "raids",
        keywords: [
            "shadow"
        ]
    }
};

let graphicAssets = [];
let featuredEvents = [];
let transitionTimer = null;
let raidObserver = null;

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

function getAssetsForType(type) {

    return graphicAssets
        .filter(asset =>
            asset.type === type
        );
}

function getActiveAsset(
    type,
    now = new Date()
) {

    return getAssetsForType(type)
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

function imageMatchesSlot(
    image,
    slot
) {

    if (!image) return false;

    const searchable =
        [
            image.getAttribute("src") || "",
            image.dataset.staticGraphicSrc || "",
            image.getAttribute("alt") || ""
        ]
            .join(" ")
            .toLowerCase();

    return slot.keywords
        .some(keyword =>
            searchable.includes(
                keyword.toLowerCase()
            )
        );
}

function findSlotImage(type) {

    const slot =
        GRAPHIC_SLOTS[type];

    if (!slot) {
        return null;
    }

    let root =
        document;

    if (
        slot.scope === "raids"
    ) {

        root =
            document.getElementById(
                "raid-container"
            );

        if (!root) {
            return null;
        }
    }

    return Array.from(
        root.querySelectorAll("img")
    )
        .find(image =>
            imageMatchesSlot(
                image,
                slot
            )
        ) || null;
}

function restoreStaticImage(
    image,
    type
) {

    if (!image) return;

    const fallback =
        image.dataset.staticGraphicSrc;

    if (!fallback) {
        return;
    }

    image.onerror = null;

    if (
        image.getAttribute("src") !==
        fallback
    ) {
        image.setAttribute(
            "src",
            fallback
        );
    }

    delete image.dataset.managedGraphic;
    delete image.dataset.managedGraphicType;

    console.info(
        `Using static ${type} graphic fallback.`
    );
}

function applySlot(type) {

    const image =
        findSlotImage(type);

    if (!image) {
        return false;
    }

    /*
     * Capture the original script.js-rendered
     * static image before replacing it.
     */
    if (
        !image.dataset.staticGraphicSrc
    ) {
        image.dataset.staticGraphicSrc =
            image.getAttribute("src") || "";
    }

    const active =
        getActiveAsset(type);

    if (!active) {

        restoreStaticImage(
            image,
            type
        );

        return true;
    }

    const dynamicSrc =
        active.imageUrl ||
        active.imagePath;

    if (!dynamicSrc) {

        restoreStaticImage(
            image,
            type
        );

        return true;
    }

    image.dataset.managedGraphic =
        active.id || type;

    image.dataset.managedGraphicType =
        type;

    image.onerror = () => {

        const failedSrc =
            image.getAttribute("src");

        console.warn(
            `Managed ${type} graphic failed to load; restoring static fallback:`,
            failedSrc
        );

        restoreStaticImage(
            image,
            type
        );
    };

    if (
        image.getAttribute("src") !==
        dynamicSrc
    ) {
        image.setAttribute(
            "src",
            dynamicSrc
        );
    }

    return true;
}

function applyAllRaidGraphics() {

    Object.keys(
        GRAPHIC_SLOTS
    )
        .forEach(type => {
            applySlot(type);
        });
}

function getCurrentFeaturedEvent(
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
                start <= now &&
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

            return bTime - aTime;
        })[0] || null;
}

function findCurrentEventImage() {

    return Array.from(
        document.querySelectorAll("img")
    )
        .find(image => {

            const searchable =
                [
                    image.getAttribute("src") || "",
                    image.dataset.staticGraphicSrc || "",
                    image.getAttribute("alt") || ""
                ]
                    .join(" ")
                    .toLowerCase();

            return (
                searchable.includes(
                    "currentevent"
                ) ||
                searchable.includes(
                    "current pokémon go event"
                ) ||
                searchable.includes(
                    "current pokemon go event"
                )
            );
        }) || null;
}

function restoreStaticCurrentEvent(
    image
) {

    if (!image) return;

    const fallback =
        image.dataset.staticGraphicSrc ||
        "assets/images/currentevent.png";

    image.onerror = null;

    if (
        image.getAttribute("src") !==
        fallback
    ) {
        image.setAttribute(
            "src",
            fallback
        );
    }

    delete image.dataset.managedFeaturedEvent;
}

function applyCurrentFeaturedEvent() {

    const image =
        findCurrentEventImage();

    if (!image) {
        return false;
    }

    if (
        !image.dataset.staticGraphicSrc
    ) {
        image.dataset.staticGraphicSrc =
            image.getAttribute("src") ||
            "assets/images/currentevent.png";
    }

    const current =
        getCurrentFeaturedEvent();

    if (!current) {

        restoreStaticCurrentEvent(
            image
        );

        return true;
    }

    const dynamicSrc =
        current.imageUrl ||
        current.imagePath;

    if (!dynamicSrc) {

        restoreStaticCurrentEvent(
            image
        );

        return true;
    }

    image.dataset.managedFeaturedEvent =
        current.id || "current";

    image.onerror = () => {

        const failedSrc =
            image.getAttribute("src");

        console.warn(
            "Managed Current Event graphic failed to load; restoring static fallback:",
            failedSrc
        );

        restoreStaticCurrentEvent(
            image
        );
    };

    if (
        image.getAttribute("src") !==
        dynamicSrc
    ) {
        image.setAttribute(
            "src",
            dynamicSrc
        );
    }

    return true;
}

function applyAllPublicGraphics() {

    applyAllRaidGraphics();

    applyCurrentFeaturedEvent();
}

function watchRaidContainer() {

    const raidContainer =
        document.getElementById(
            "raid-container"
        );

    if (
        !raidContainer ||
        raidObserver
    ) {
        return;
    }

    raidObserver =
        new MutationObserver(() => {
            applyAllPublicGraphics();
        });

    raidObserver.observe(
        raidContainer,
        {
            childList: true,
            subtree: true
        }
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

    graphicAssets
        .forEach(asset => {

            if (
                !GRAPHIC_SLOTS[
                    asset.type
                ]
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

    featuredEvents
        .forEach(event => {

            const start =
                timestampToDate(
                    event.startAt
                );

            const end =
                timestampToDate(
                    event.endAt
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
                applyAllPublicGraphics();
                scheduleNextTransition();
            },
            Math.min(
                delay,
                MAX_TIMEOUT
            )
        );
}

async function loadManagedPublicGraphics() {

    try {

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
                    GRAPHIC_SLOTS[
                        data.type
                    ]
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

        applyAllPublicGraphics();

        scheduleNextTransition();

    } catch (error) {

        console.error(
            "Unable to load managed public graphics. Static fallbacks remain active:",
            error
        );
    }
}

function initializePublicGraphics() {

    watchRaidContainer();

    applyAllPublicGraphics();

    loadManagedPublicGraphics();
}

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePublicGraphics,
        {
            once: true
        }
    );

} else {

    initializePublicGraphics();
}
