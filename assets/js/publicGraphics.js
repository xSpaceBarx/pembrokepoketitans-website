import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const GRAPHIC_TYPE = "legendary";
const STATIC_LEGENDARY_PATH = "assets/images/legendary.png";

let legendaryAssets = [];
let transitionTimer = null;
let raidObserver = null;

function timestampToDate(value) {

    if (!value) return null;

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    const converted =
        new Date(value);

    return Number.isNaN(converted.getTime())
        ? null
        : converted;
}

function getActiveLegendaryAsset(now = new Date()) {

    return legendaryAssets
        .filter(asset => {

            if (asset.type !== GRAPHIC_TYPE) {
                return false;
            }

            const goLive =
                timestampToDate(asset.goLiveAt);

            const hideAfter =
                timestampToDate(asset.hideAfterAt);

            return (
                goLive &&
                goLive <= now &&
                (!hideAfter || hideAfter > now) &&
                (asset.imageUrl || asset.imagePath)
            );
        })
        .sort((a, b) => {

            const aTime =
                timestampToDate(a.goLiveAt)?.getTime() || 0;

            const bTime =
                timestampToDate(b.goLiveAt)?.getTime() || 0;

            return bTime - aTime;
        })[0] || null;
}

function isLegendaryImage(image) {

    if (!image) return false;

    const src =
        image.getAttribute("src") || "";

    const originalSrc =
        image.dataset.staticGraphicSrc || "";

    const alt =
        image.getAttribute("alt") || "";

    return (
        src.toLowerCase().includes("legendary") ||
        originalSrc.toLowerCase().includes("legendary") ||
        alt.toLowerCase().includes("legendary")
    );
}

function findLegendaryImage() {

    const raidContainer =
        document.getElementById("raid-container");

    if (!raidContainer) {
        return null;
    }

    return Array.from(
        raidContainer.querySelectorAll("img")
    ).find(isLegendaryImage) || null;
}

function restoreStaticLegendary(image) {

    if (!image) return;

    const fallback =
        image.dataset.staticGraphicSrc ||
        STATIC_LEGENDARY_PATH;

    image.onerror = null;

    if (
        image.getAttribute("src") !== fallback
    ) {
        image.setAttribute(
            "src",
            fallback
        );
    }

    delete image.dataset.managedGraphic;
}

function applyActiveLegendaryGraphic() {

    const image =
        findLegendaryImage();

    if (!image) {
        return false;
    }

    if (!image.dataset.staticGraphicSrc) {
        image.dataset.staticGraphicSrc =
            image.getAttribute("src") ||
            STATIC_LEGENDARY_PATH;
    }

    const active =
        getActiveLegendaryAsset();

    if (!active) {
        restoreStaticLegendary(image);
        return true;
    }

    const dynamicSrc =
        active.imageUrl ||
        active.imagePath;

    if (!dynamicSrc) {
        restoreStaticLegendary(image);
        return true;
    }

    image.dataset.managedGraphic =
        active.id || GRAPHIC_TYPE;

    image.onerror = () => {

        const failedSrc =
            image.getAttribute("src");

        console.warn(
            "Managed Legendary graphic failed to load; restoring static fallback:",
            failedSrc
        );

        restoreStaticLegendary(image);
    };

    if (
        image.getAttribute("src") !== dynamicSrc
    ) {
        image.setAttribute(
            "src",
            dynamicSrc
        );
    }

    return true;
}

function watchRaidContainer() {

    const raidContainer =
        document.getElementById("raid-container");

    if (!raidContainer || raidObserver) {
        return;
    }

    raidObserver =
        new MutationObserver(() => {
            applyActiveLegendaryGraphic();
        });

    raidObserver.observe(
        raidContainer,
        {
            childList: true,
            subtree: true
        }
    );
}

function scheduleNextLegendaryTransition() {

    if (transitionTimer) {
        clearTimeout(transitionTimer);
        transitionTimer = null;
    }

    const now =
        new Date();

    const futureTimes = [];

    legendaryAssets.forEach(asset => {

        if (asset.type !== GRAPHIC_TYPE) {
            return;
        }

        const goLive =
            timestampToDate(asset.goLiveAt);

        const hideAfter =
            timestampToDate(asset.hideAfterAt);

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
        Math.min(...futureTimes);

    const delay =
        Math.max(
            1000,
            nextTime - now.getTime() + 1000
        );

    const MAX_TIMEOUT =
        2147483647;

    transitionTimer =
        setTimeout(
            () => {
                applyActiveLegendaryGraphic();
                scheduleNextLegendaryTransition();
            },
            Math.min(delay, MAX_TIMEOUT)
        );
}

async function loadLegendaryGraphics() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "graphicAssets"
                )
            );

        legendaryAssets = [];

        snapshot.forEach(documentSnapshot => {

            const data =
                documentSnapshot.data();

            if (
                data.type === GRAPHIC_TYPE
            ) {
                legendaryAssets.push({
                    id:
                        documentSnapshot.id,
                    ...data
                });
            }
        });

        applyActiveLegendaryGraphic();
        scheduleNextLegendaryTransition();

    } catch (error) {

        console.error(
            "Unable to load managed Legendary graphics. Static fallback remains active:",
            error
        );
    }
}

function initializeLegendaryGraphic() {

    watchRaidContainer();

    applyActiveLegendaryGraphic();

    loadLegendaryGraphics();
}

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeLegendaryGraphic,
        { once: true }
    );
} else {
    initializeLegendaryGraphic();
}
