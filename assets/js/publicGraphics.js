import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

let goWeeklyAssets = [];
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

    const converted =
        new Date(value);

    return Number.isNaN(
        converted.getTime()
    )
        ? null
        : converted;
}

function getActiveGoWeekly(
    now = new Date()
) {

    return goWeeklyAssets
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
                asset.type ===
                    "goweekly" &&
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

function findGoWeeklyImage() {

    return Array.from(
        document.querySelectorAll("img")
    )
        .find(image => {

            const searchable =
                [
                    image.getAttribute(
                        "src"
                    ) || "",
                    image.getAttribute(
                        "alt"
                    ) || ""
                ]
                    .join(" ")
                    .toLowerCase();

            return (
                searchable.includes(
                    "goweekly"
                ) ||
                searchable.includes(
                    "go weekly"
                )
            );
        }) || null;
}

function findCurrentEventImage() {

    return Array.from(
        document.querySelectorAll("img")
    )
        .find(image => {

            const searchable =
                [
                    image.getAttribute(
                        "src"
                    ) || "",
                    image.getAttribute(
                        "alt"
                    ) || ""
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

function hideManagedImage(image) {

    if (!image) return;

    image.onerror = null;
    image.style.display = "none";
}

function showManagedImage(
    image,
    source,
    label
) {

    if (
        !image ||
        !source
    ) {
        return;
    }

    image.onerror = () => {

        console.warn(
            `${label} graphic failed to load:`,
            source
        );

        hideManagedImage(
            image
        );
    };

    image.style.display =
        "block";

    if (
        image.getAttribute(
            "src"
        ) !== source
    ) {
        image.setAttribute(
            "src",
            source
        );
    }
}

function applyGoWeekly() {

    const image =
        findGoWeeklyImage();

    if (!image) {
        return;
    }

    const active =
        getActiveGoWeekly();

    if (!active) {

        hideManagedImage(
            image
        );

        return;
    }

    showManagedImage(
        image,
        active.imageUrl ||
            active.imagePath,
        "GO Weekly"
    );
}

function applyCurrentFeaturedEvent() {

    const image =
        findCurrentEventImage();

    if (!image) {
        return;
    }

    const current =
        getCurrentFeaturedEvent();

    if (!current) {

        hideManagedImage(
            image
        );

        return;
    }

    showManagedImage(
        image,
        current.imageUrl ||
            current.imagePath,
        "Current Event"
    );
}

function applyHomepageGraphics() {

    applyGoWeekly();

    applyCurrentFeaturedEvent();
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

    goWeeklyAssets.forEach(asset => {

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

                applyHomepageGraphics();

                scheduleNextTransition();
            },
            Math.min(
                delay,
                MAX_TIMEOUT
            )
        );
}

async function loadHomepageGraphics() {

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

        goWeeklyAssets = [];
        featuredEvents = [];

        graphicSnapshot.forEach(
            documentSnapshot => {

                const data =
                    documentSnapshot.data();

                if (
                    data.type ===
                    "goweekly"
                ) {
                    goWeeklyAssets.push({
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

        applyHomepageGraphics();

        scheduleNextTransition();

    } catch (error) {

        console.error(
            "Unable to load homepage graphics:",
            error
        );

        hideManagedImage(
            findGoWeeklyImage()
        );

        hideManagedImage(
            findCurrentEventImage()
        );
    }
}

function initializeHomepageGraphics() {

    /*
     * Hide the deleted legacy image references immediately.
     * Active managed graphics are then shown after Firestore
     * loads. This prevents broken-image placeholders when the
     * old static files no longer exist.
     */
    hideManagedImage(
        findGoWeeklyImage()
    );

    hideManagedImage(
        findCurrentEventImage()
    );

    loadHomepageGraphics();
}

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeHomepageGraphics,
        {
            once: true
        }
    );

} else {

    initializeHomepageGraphics();
}
