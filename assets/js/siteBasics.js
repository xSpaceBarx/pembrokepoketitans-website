/* ==========================================
   PokéTitans Public Site Basics
   - Automatic footer year
   - Accessibility fallbacks for static images
========================================== */

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
