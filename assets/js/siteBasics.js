/* ==========================================
   PokéTitans Public Site Basics v3
   - Automatic footer year
   - Accessibility fallbacks for static images
   - Click / tap to enlarge event graphics
   - In-page lightbox for instruction-image links
========================================== */

const ENLARGEABLE_GRAPHIC_SELECTOR = [
    ".current-event-image",
    ".raid-image",
    ".today-counters"
].join(",");

const LIGHTBOX_LINK_SELECTOR =
    ".site-image-lightbox-link";

let lastGraphicTrigger = null;

function setCurrentFooterYear() {
    const currentYear =
        new Date().getFullYear();

    document
        .querySelectorAll("footer p")
        .forEach(paragraph => {
            const text =
                paragraph.textContent || "";

            if (
                /©\s*\d{4}\s+Pembroke PokéTitans/i
                    .test(text)
            ) {
                paragraph.textContent =
                    text.replace(
                        /©\s*\d{4}/,
                        `© ${currentYear}`
                    );
            }
        });
}

function setAltIfMissing(
    selector,
    altText
) {
    document
        .querySelectorAll(selector)
        .forEach(image => {
            if (
                !image.hasAttribute("alt") ||
                !image.getAttribute("alt")?.trim()
            ) {
                image.setAttribute(
                    "alt",
                    altText
                );
            }
        });
}

function safeImageUrl(value) {
    if (!value) {
        return "";
    }

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

function installGraphicLightboxStyles() {
    if (
        document.getElementById(
            "site-graphic-lightbox-styles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "site-graphic-lightbox-styles";

    style.textContent = `
        ${ENLARGEABLE_GRAPHIC_SELECTOR} {
            cursor: zoom-in;
        }

        ${ENLARGEABLE_GRAPHIC_SELECTOR}:focus-visible,
        ${LIGHTBOX_LINK_SELECTOR}:focus-visible {
            outline: 3px solid #F57C00;
            outline-offset: 4px;
        }

        .site-graphic-lightbox {
            position: fixed;
            inset: 0;
            z-index: 5000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 60px 24px 28px;
            background: rgba(0,0,0,.86);
            overflow-y: auto;
        }

        .site-graphic-lightbox.is-open {
            display: flex;
        }

        .site-graphic-lightbox-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 18px;
            max-width: 96vw;
            max-height: 92vh;
        }

        .site-graphic-lightbox-image {
            display: block;
            max-width: min(1200px, 96vw);
            max-height: 82vh;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 10px;
            box-shadow: 0 12px 40px rgba(0,0,0,.4);
        }

        .site-graphic-lightbox-close {
            position: fixed;
            top: 14px;
            right: 20px;
            width: 44px;
            height: 44px;
            border: 0;
            border-radius: 50%;
            background: #ffffff;
            color: #153A5B;
            font-size: 2rem;
            line-height: 1;
            cursor: pointer;
            z-index: 5001;
        }

        .site-graphic-lightbox-return {
            display: none;
            border: 0;
            border-radius: 999px;
            padding: 12px 20px;
            background: #F57C00;
            color: #ffffff;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(0,0,0,.25);
        }

        .site-graphic-lightbox.instruction-mode
            .site-graphic-lightbox-return {
            display: inline-block;
        }

        .site-graphic-lightbox-open {
            overflow: hidden;
        }

        @media (max-width: 700px) {
            .site-graphic-lightbox {
                padding: 64px 12px 22px;
                align-items: flex-start;
            }

            .site-graphic-lightbox-content {
                margin: auto;
            }

            .site-graphic-lightbox-image {
                max-width: 96vw;
                max-height: 78vh;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}

function ensureGraphicLightbox() {
    let lightbox =
        document.getElementById(
            "site-graphic-lightbox"
        );

    if (lightbox) {
        return lightbox;
    }

    lightbox =
        document.createElement("div");

    lightbox.id =
        "site-graphic-lightbox";

    lightbox.className =
        "site-graphic-lightbox";

    lightbox.setAttribute(
        "aria-hidden",
        "true"
    );

    lightbox.setAttribute(
        "role",
        "dialog"
    );

    lightbox.setAttribute(
        "aria-modal",
        "true"
    );

    lightbox.setAttribute(
        "aria-label",
        "Enlarged image"
    );

    const close =
        document.createElement("button");

    close.type =
        "button";

    close.className =
        "site-graphic-lightbox-close";

    close.setAttribute(
        "aria-label",
        "Close enlarged image"
    );

    close.textContent =
        "×";

    const content =
        document.createElement("div");

    content.className =
        "site-graphic-lightbox-content";

    const image =
        document.createElement("img");

    image.className =
        "site-graphic-lightbox-image";

    image.alt =
        "";

    const returnButton =
        document.createElement("button");

    returnButton.type =
        "button";

    returnButton.className =
        "site-graphic-lightbox-return";

    returnButton.textContent =
        "← Back to PokéTitans Alerts";

    const closeLightbox =
        () => {
            lightbox.classList.remove(
                "is-open",
                "instruction-mode"
            );

            lightbox.setAttribute(
                "aria-hidden",
                "true"
            );

            document.body.classList.remove(
                "site-graphic-lightbox-open"
            );

            image.removeAttribute(
                "src"
            );

            image.alt =
                "";

            if (
                lastGraphicTrigger &&
                document.contains(
                    lastGraphicTrigger
                )
            ) {
                lastGraphicTrigger.focus({
                    preventScroll:
                        true
                });
            }

            lastGraphicTrigger =
                null;
        };

    close.addEventListener(
        "click",
        closeLightbox
    );

    returnButton.addEventListener(
        "click",
        closeLightbox
    );

    lightbox.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                lightbox
            ) {
                closeLightbox();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                    "Escape" &&
                lightbox.classList.contains(
                    "is-open"
                )
            ) {
                closeLightbox();
            }
        }
    );

    content.append(
        image,
        returnButton
    );

    lightbox.append(
        close,
        content
    );

    document.body.appendChild(
        lightbox
    );

    lightbox.openSource =
        (
            source,
            altText,
            trigger,
            instructionMode = false
        ) => {
            const safeSource =
                safeImageUrl(
                    source
                );

            if (!safeSource) {
                return;
            }

            lastGraphicTrigger =
                trigger || null;

            image.src =
                safeSource;

            image.alt =
                altText ||
                "PokéTitans image";

            lightbox.classList.toggle(
                "instruction-mode",
                instructionMode
            );

            lightbox.classList.add(
                "is-open"
            );

            lightbox.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "site-graphic-lightbox-open"
            );

            close.focus();
        };

    lightbox.openGraphic =
        triggerImage => {
            lightbox.openSource(
                triggerImage.currentSrc ||
                    triggerImage.src ||
                    "",
                triggerImage.alt ||
                    "Pokémon GO graphic",
                triggerImage,
                false
            );
        };

    return lightbox;
}

function decorateGraphic(
    image
) {
    if (
        !image ||
        image.dataset.enlargeReady ===
            "true"
    ) {
        return;
    }

    image.dataset.enlargeReady =
        "true";

    image.setAttribute(
        "tabindex",
        "0"
    );

    image.setAttribute(
        "role",
        "button"
    );

    image.setAttribute(
        "aria-label",
        `Enlarge ${
            image.alt ||
            "Pokémon GO graphic"
        }`
    );
}

function decorateAllGraphics() {
    document
        .querySelectorAll(
            ENLARGEABLE_GRAPHIC_SELECTOR
        )
        .forEach(
            decorateGraphic
        );
}

function installGraphicLightboxBehavior() {
    installGraphicLightboxStyles();
    ensureGraphicLightbox();
    decorateAllGraphics();

    const observer =
        new MutationObserver(
            mutations => {
                mutations.forEach(
                    mutation => {
                        mutation.addedNodes
                            .forEach(
                                node => {
                                    if (
                                        !(
                                            node instanceof
                                            Element
                                        )
                                    ) {
                                        return;
                                    }

                                    if (
                                        node.matches?.(
                                            ENLARGEABLE_GRAPHIC_SELECTOR
                                        )
                                    ) {
                                        decorateGraphic(
                                            node
                                        );
                                    }

                                    node
                                        .querySelectorAll?.(
                                            ENLARGEABLE_GRAPHIC_SELECTOR
                                        )
                                        .forEach(
                                            decorateGraphic
                                        );
                                }
                            );
                    }
                );
            }
        );

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );

    document.addEventListener(
        "click",
        event => {
            const instructionLink =
                event.target.closest?.(
                    LIGHTBOX_LINK_SELECTOR
                );

            if (instructionLink) {
                event.preventDefault();

                ensureGraphicLightbox()
                    .openSource(
                        instructionLink.href,
                        instructionLink.dataset.lightboxAlt ||
                            instructionLink.getAttribute(
                                "aria-label"
                            ) ||
                            "PokéTitans iPhone notification setup instructions",
                        instructionLink,
                        true
                    );

                return;
            }

            const image =
                event.target.closest?.(
                    ENLARGEABLE_GRAPHIC_SELECTOR
                );

            if (!image) {
                return;
            }

            ensureGraphicLightbox()
                .openGraphic(
                    image
                );
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key !==
                    "Enter" &&
                event.key !==
                    " "
            ) {
                return;
            }

            const image =
                event.target.closest?.(
                    ENLARGEABLE_GRAPHIC_SELECTOR
                );

            if (!image) {
                return;
            }

            event.preventDefault();

            ensureGraphicLightbox()
                .openGraphic(
                    image
                );
        }
    );
}

function initializeSiteBasics() {
    setCurrentFooterYear();

    setAltIfMissing(
        ".community-photo",
        "Pembroke PokéTitans community gathering"
    );

    setAltIfMissing(
        ".qr",
        "QR code to join the Pembroke PokéTitans Campfire community"
    );

    setAltIfMissing(
        "footer img",
        "Pembroke PokéTitans logo"
    );

    installGraphicLightboxBehavior();
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeSiteBasics
    );
} else {
    initializeSiteBasics();
}
