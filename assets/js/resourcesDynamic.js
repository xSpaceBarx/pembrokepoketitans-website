import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const SECTION_CONFIG = {
    quickguides: {
        containerId: "quick-guides-container",
        sectionId: "quick-guides",
        navText: "Quick Guides"
    },
    websites: {
        containerId: "websites-container",
        sectionId: "websites",
        navText: "Useful Websites"
    },
    podcasts: {
        containerId: "podcasts-container",
        sectionId: "podcasts",
        navText: "Podcasts"
    },
    socials: {
        containerId: "socials-container",
        sectionId: "socials",
        navText: "Community Socials"
    },
    communities: {
        containerId: "communities-container",
        sectionId: "communities",
        navText: "Local Communities"
    }
};

const SECTION_ORDER = [
    "quickguides",
    "websites",
    "podcasts",
    "socials",
    "communities"
];

const managedResources = new Map();
const sectionObservers = new Map();
const renderingSections = new Set();

function safeHttpUrl(value) {
    try {
        const url = new URL(
            String(value || "").trim(),
            window.location.href
        );

        if (
            url.protocol === "http:" ||
            url.protocol === "https:"
        ) {
            return url.href;
        }
    } catch {
        // Invalid URL.
    }

    return "";
}

function communityUrlMatchesPlatform(
    value,
    platform
) {

    const safe =
        safeHttpUrl(
            value
        );

    if (!safe) {
        return false;
    }

    try {

        const host =
            new URL(
                safe
            ).hostname
                .toLowerCase();

        if (
            platform ===
            "Discord"
        ) {
            return (
                host ===
                    "discord.gg" ||
                host ===
                    "discord.com" ||
                host.endsWith(
                    ".discord.com"
                )
            );
        }

        if (
            platform ===
            "Campfire"
        ) {
            return (
                host ===
                    "cmpf.re" ||
                host ===
                    "campfire.onelink.me" ||
                host.includes(
                    "campfire"
                )
            );
        }

    } catch {
        return false;
    }

    return false;
}

function inferCommunityPlatform(
    value
) {

    if (
        communityUrlMatchesPlatform(
            value,
            "Discord"
        )
    ) {
        return "Discord";
    }

    if (
        communityUrlMatchesPlatform(
            value,
            "Campfire"
        )
    ) {
        return "Campfire";
    }

    return "";
}

function sortResources(items) {
    return [...items].sort((a, b) => {

        const aOrder =
            Number.isFinite(Number(a.order))
                ? Number(a.order)
                : 999999;

        const bOrder =
            Number.isFinite(Number(b.order))
                ? Number(b.order)
                : 999999;

        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }

        return String(
            a.internalName ||
            a.title ||
            ""
        ).localeCompare(
            String(
                b.internalName ||
                b.title ||
                ""
            )
        );
    });
}

function getSectionElement(sectionKey) {
    const configuredId =
        SECTION_CONFIG[sectionKey].sectionId;

    return (
        document.getElementById(configuredId) ||
        document
            .getElementById(
                SECTION_CONFIG[sectionKey].containerId
            )
            ?.closest("section") ||
        null
    );
}

function setSectionVisible(
    sectionKey,
    visible
) {
    const section =
        getSectionElement(sectionKey);

    if (!section) return;

    section.style.display =
        visible
            ? ""
            : "none";
}

function ensureCommunityNavLink() {

    const nav =
        document.querySelector(
            ".resource-nav"
        );

    if (!nav) {
        return;
    }

    let link =
        Array.from(
            nav.querySelectorAll(
                "a"
            )
        ).find(
            item =>
                item.getAttribute(
                    "href"
                ) ===
                "#communities"
        );

    if (!link) {

        link =
            document.createElement(
                "a"
            );

        link.className =
            "hero-button secondary-button";

        link.href =
            "#communities";

        link.textContent =
            "Local Communities";

        nav.appendChild(
            link
        );
    }
}

function createCommunitySection() {

    const section =
        document.createElement(
            "section"
        );

    section.id =
        "communities";

    section.className =
        "section resources-managed-section";

    const container =
        document.createElement(
            "div"
        );

    container.className =
        "container";

    const title =
        document.createElement(
            "h2"
        );

    title.className =
        "section-title";

    title.textContent =
        "🤝 Other Pokémon GO Communities";

    const description =
        document.createElement(
            "p"
        );

    description.className =
        "section-description";

    description.textContent =
        "Find other local Pokémon GO groups on Discord and Campfire. Community links are reviewed before they appear here.";

    const grid =
        document.createElement(
            "div"
        );

    grid.id =
        "communities-container";

    grid.className =
        "managed-resource-grid community-links-grid";

    const submitCard =
        document.createElement(
            "div"
        );

    submitCard.className =
        "community-submit-card";

    submitCard.innerHTML = `
        <h3>📨 Submit a Community</h3>
        <p>
            Run a local Pokémon GO Discord or Campfire group? Submit it for review. It will only appear on this page after PokéTitans approval.
        </p>

        <form id="community-submission-form" class="community-submission-form">
            <div>
                <label for="community-submit-name">Community Name</label>
                <input
                    type="text"
                    id="community-submit-name"
                    maxlength="80"
                    required
                    placeholder="South Shore Pokémon GO">
            </div>

            <div>
                <label for="community-submit-area">Area / Town</label>
                <input
                    type="text"
                    id="community-submit-area"
                    maxlength="80"
                    required
                    placeholder="Plymouth, South Shore, Quincy, etc.">
            </div>

            <div>
                <label for="community-submit-platform">Platform</label>
                <select id="community-submit-platform" required>
                    <option value="">Select Platform</option>
                    <option value="Discord">Discord</option>
                    <option value="Campfire">Campfire</option>
                </select>
            </div>

            <div>
                <label for="community-submit-url">Invite / Community Link</label>
                <input
                    type="url"
                    id="community-submit-url"
                    maxlength="500"
                    required
                    placeholder="https://discord.gg/... or https://cmpf.re/...">
            </div>

            <div class="community-form-full">
                <label for="community-submit-description">Short Description</label>
                <textarea
                    id="community-submit-description"
                    maxlength="300"
                    rows="4"
                    placeholder="Tell Trainers what area your group covers or what your community focuses on."></textarea>
            </div>

            <div class="community-honeypot" aria-hidden="true">
                <label for="community-submit-website">Website</label>
                <input
                    type="text"
                    id="community-submit-website"
                    tabindex="-1"
                    autocomplete="off">
            </div>

            <div class="community-form-full">
                <button
                    type="submit"
                    class="hero-button community-submit-button">
                    Submit Community for Review
                </button>

                <p
                    id="community-submit-status"
                    class="community-submit-status"
                    role="status"
                    aria-live="polite">
                </p>
            </div>
        </form>
    `;

    container.append(
        title,
        description,
        grid,
        submitCard
    );

    section.appendChild(
        container
    );

    return section;
}

function installCommunitySection() {

    ensureCommunityNavLink();

    if (
        document.getElementById(
            "communities"
        )
    ) {
        return;
    }

    const section =
        createCommunitySection();

    const socialsSection =
        getSectionElement(
            "socials"
        );

    if (
        socialsSection?.parentNode
    ) {
        socialsSection.parentNode.insertBefore(
            section,
            socialsSection.nextSibling
        );
    } else {
        const footer =
            document.querySelector(
                "footer"
            );

        if (
            footer?.parentNode
        ) {
            footer.parentNode.insertBefore(
                section,
                footer
            );
        } else {
            document.body.appendChild(
                section
            );
        }
    }

    getElementByIdSafe(
        "community-submission-form"
    )?.addEventListener(
        "submit",
        submitCommunityLink
    );
}

function getElementByIdSafe(
    id
) {
    return document.getElementById(
        id
    );
}

async function submitCommunityLink(
    event
) {

    event.preventDefault();

    const status =
        getElementByIdSafe(
            "community-submit-status"
        );

    const button =
        event.currentTarget
            .querySelector(
                ".community-submit-button"
            );

    const honeypot =
        getElementByIdSafe(
            "community-submit-website"
        )?.value
            .trim() ||
        "";

    if (honeypot) {
        if (status) {
            status.textContent =
                "Submission received.";
        }
        return;
    }

    const communityName =
        getElementByIdSafe(
            "community-submit-name"
        ).value
            .trim();

    const area =
        getElementByIdSafe(
            "community-submit-area"
        ).value
            .trim();

    const platform =
        getElementByIdSafe(
            "community-submit-platform"
        ).value;

    const url =
        safeHttpUrl(
            getElementByIdSafe(
                "community-submit-url"
            ).value
        );

    const description =
        getElementByIdSafe(
            "community-submit-description"
        ).value
            .trim();

    if (
        communityName.length <
            3 ||
        area.length <
            2
    ) {
        status.textContent =
            "Please enter a community name and area.";
        return;
    }

    if (
        ![
            "Discord",
            "Campfire"
        ].includes(
            platform
        )
    ) {
        status.textContent =
            "Please choose Discord or Campfire.";
        return;
    }

    if (
        !url ||
        !communityUrlMatchesPlatform(
            url,
            platform
        )
    ) {
        status.textContent =
            platform ===
                "Discord"
                ? "Please enter a valid Discord invite/community link."
                : "Please enter a valid Campfire community link.";
        return;
    }

    const lastSubmittedAt =
        Number(
            localStorage.getItem(
                "poketitans-community-submitted-at"
            ) ||
            0
        );

    if (
        Date.now() -
            lastSubmittedAt <
        30 * 1000
    ) {
        status.textContent =
            "Please wait a moment before submitting another community.";
        return;
    }

    button.disabled =
        true;

    button.textContent =
        "Submitting...";

    status.textContent =
        "";

    try {

        await addDoc(
            collection(
                db,
                "communitySubmissions"
            ),
            {
                communityName,
                area,
                platform,
                description,
                url,
                status:
                    "pending",
                createdAt:
                    serverTimestamp()
            }
        );

        localStorage.setItem(
            "poketitans-community-submitted-at",
            String(
                Date.now()
            )
        );

        event.currentTarget.reset();

        status.textContent =
            "✅ Thanks! Your community was submitted for review and will appear here only after approval.";

    } catch (error) {

        console.error(
            "Unable to submit community link:",
            error
        );

        status.textContent =
            "Unable to submit the community right now. Please try again later.";

    } finally {

        button.disabled =
            false;

        button.textContent =
            "Submit Community for Review";
    }
}

function ensureToolsNavLink() {
    const nav =
        document.querySelector(".resource-nav");

    if (!nav) return;

    let link =
        Array.from(
            nav.querySelectorAll("a")
        )
            .find(item =>
                String(item.textContent || "")
                    .toLowerCase()
                    .includes("pokétitans tools")
            );

    if (!link) {
        link =
            document.createElement("a");

        link.className =
            "hero-button secondary-button";

        link.textContent =
            "PokéTitans Tools";

        nav.insertBefore(
            link,
            nav.firstChild
        );
    }

    link.href = "#poketitans-tools";
}

function createToolCard(
    icon,
    titleText,
    descriptionText,
    href
) {
    const card =
        document.createElement("a");

    card.className =
        "poketitans-tool-card";

    card.href = href;

    const iconElement =
        document.createElement("div");

    iconElement.className =
        "poketitans-tool-icon";

    iconElement.textContent = icon;

    const title =
        document.createElement("h3");

    title.textContent = titleText;

    const description =
        document.createElement("p");

    description.textContent =
        descriptionText;

    const action =
        document.createElement("span");

    action.className =
        "poketitans-tool-action";

    action.textContent = "Open →";

    card.append(
        iconElement,
        title,
        description,
        action
    );

    return card;
}

function createToolsSection() {
    const section =
        document.createElement("section");

    section.id =
        "poketitans-tools";

    section.className =
        "section resources-managed-section";

    const container =
        document.createElement("div");

    container.className =
        "container";

    const title =
        document.createElement("h2");

    title.className =
        "section-title";

    title.textContent =
        "🛠 PokéTitans Tools";

    const description =
        document.createElement("p");

    description.className =
        "section-description";

    description.textContent =
        "Useful PokéTitans tools for staying informed, finding Trainers and planning your next event.";

    const grid =
        document.createElement("div");

    grid.className =
        "poketitans-tools-grid";

    grid.append(
        createToolCard(
            "🔔",
            "Event Alerts",
            "Choose exactly which PokéTitans reminders and Pokémon GO alerts you want to receive.",
            "notifications.html"
        ),

        createToolCard(
            "👥",
            "Trainer Directory",
            "Find Trainers and exchange Pokémon GO Friend Codes.",
            "trainers.html"
        ),

        createToolCard(
            "📅",
            "Event Hub",
            "See current and upcoming Pokémon GO events and shareable event graphics.",
            "events.html"
        ),

        createToolCard(
            "📍",
            "Local Meetups",
            "See the next PokéTitans meetup and upcoming community plans.",
            "index.html#events"
        ),

        createToolCard(
            "🗺️",
            "Pembroke Gym Map",
            "Open the PokéTitans homepage for the local meetup area and gym layout.",
            "index.html"
        )
    );

    container.append(
        title,
        description,
        grid
    );

    section.appendChild(container);

    return section;
}

function installToolsSection() {
    ensureToolsNavLink();

    if (
        document.getElementById(
            "poketitans-tools"
        )
    ) {
        return;
    }

    const newsGrid =
        document.getElementById(
            "news-grid"
        );

    const newsSection =
        newsGrid?.closest("section");

    const toolsSection =
        createToolsSection();

    if (
        newsSection?.parentNode
    ) {
        newsSection.parentNode.insertBefore(
            toolsSection,
            newsSection.nextSibling
        );

        return;
    }

    const quickGuidesSection =
        getSectionElement(
            "quickguides"
        );

    if (
        quickGuidesSection?.parentNode
    ) {
        quickGuidesSection.parentNode.insertBefore(
            toolsSection,
            quickGuidesSection
        );

        return;
    }

    document.body.appendChild(
        toolsSection
    );
}

function ensureLightbox() {
    let lightbox =
        document.getElementById(
            "resource-guide-lightbox"
        );

    if (lightbox) {
        return lightbox;
    }

    lightbox =
        document.createElement("div");

    lightbox.id =
        "resource-guide-lightbox";

    lightbox.className =
        "resource-guide-lightbox";

    lightbox.setAttribute(
        "aria-hidden",
        "true"
    );

    const close =
        document.createElement("button");

    close.type = "button";

    close.className =
        "resource-guide-lightbox-close";

    close.setAttribute(
        "aria-label",
        "Close Quick Guide"
    );

    close.textContent = "×";

    const image =
        document.createElement("img");

    image.className =
        "resource-guide-lightbox-image";

    image.alt = "";

    const closeLightbox = () => {

        lightbox.classList.remove(
            "is-open"
        );

        lightbox.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "resource-lightbox-open"
        );

        image.removeAttribute("src");

        image.alt = "";
    };

    close.addEventListener(
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
                event.key === "Escape" &&
                lightbox.classList.contains(
                    "is-open"
                )
            ) {
                closeLightbox();
            }
        }
    );

    lightbox.append(
        close,
        image
    );

    document.body.appendChild(
        lightbox
    );

    lightbox.openGuide =
        (source, altText) => {

            image.src = source;

            image.alt =
                altText ||
                "Pokémon GO Quick Guide";

            lightbox.classList.add(
                "is-open"
            );

            lightbox.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "resource-lightbox-open"
            );

            close.focus();
        };

    return lightbox;
}

function createGuideCard(resource) {
    const source =
        safeHttpUrl(
            resource.imageUrl ||
            resource.imagePath ||
            ""
        );

    if (!source) {
        return null;
    }

    const button =
        document.createElement("button");

    button.type = "button";

    button.className =
        "managed-guide-card";

    button.setAttribute(
        "aria-label",
        `Enlarge ${
            resource.altText ||
            resource.internalName ||
            "Quick Guide"
        }`
    );

    const image =
        document.createElement("img");

    image.className =
        "managed-guide-image";

    image.src = source;

    image.alt =
        resource.altText ||
        resource.internalName ||
        "Pokémon GO Quick Guide";

    image.loading = "lazy";

    image.addEventListener(
        "error",
        () => {

            button.style.display =
                "none";
        }
    );

    button.addEventListener(
        "click",
        () => {

            ensureLightbox()
                .openGuide(
                    source,
                    image.alt
                );
        }
    );

    button.appendChild(image);

    return button;
}

function createLinkCard(
    resource,
    sectionKey
) {
    const url =
        safeHttpUrl(
            resource.url
        );

    if (!url) {
        return null;
    }

    const card =
        document.createElement("div");

    card.className =
        "event-card managed-resource-card";

    const title =
        document.createElement("h3");

    title.textContent =
        resource.title ||
        "Resource";

    let communityMeta =
        null;

    if (
        sectionKey ===
            "communities"
    ) {

        communityMeta =
            document.createElement(
                "p"
            );

        communityMeta.className =
            "community-resource-meta";

        const platform =
            resource.platform ||
            inferCommunityPlatform(
                url
            ) ||
            "Community";

        communityMeta.textContent =
            [
                platform,
                resource.area ||
                    ""
            ]
                .filter(
                    Boolean
                )
                .join(
                    " • "
                );
    }

    const description =
        document.createElement("p");

    description.textContent =
        resource.description ||
        "";

    const button =
        document.createElement("a");

    button.className =
        "hero-button managed-resource-button";

    button.href = url;

    button.target = "_blank";

    button.rel =
        "noopener noreferrer";

    const buttonLabels = {
        websites:
            "Visit Website",
        podcasts:
            "Listen",
        socials:
            "Follow",
        communities:
            (
                resource.platform ||
                inferCommunityPlatform(
                    url
                )
            ) ===
                "Discord"
                ? "Join Discord"
                : (
                    resource.platform ||
                    inferCommunityPlatform(
                        url
                  )
                  ) ===
                    "Campfire"
                    ? "Open Campfire"
                    : "Open Community"
    };

    button.textContent =
        buttonLabels[sectionKey] ||
        "Open";

    if (communityMeta) {
        card.append(
            title,
            communityMeta,
            description,
            button
        );
    } else {
        card.append(
            title,
            description,
            button
        );
    }

    return card;
}

function renderManagedSection(
    sectionKey
) {
    const container =
        document.getElementById(
            SECTION_CONFIG[sectionKey]
                .containerId
        );

    if (!container) {
        return;
    }

    const allItems =
        managedResources.get(
            sectionKey
        ) || [];

    /*
     * Migration-safe behavior:
     * if this section has NO Firestore records at all,
     * leave the existing legacy/static renderer alone.
     */
    if (!allItems.length) {

        if (
            sectionKey ===
            "communities"
        ) {
            container.replaceChildren();

            const empty =
                document.createElement(
                    "p"
                );

            empty.className =
                "community-empty-message";

            empty.textContent =
                "No additional community links are listed yet. You can submit one below for review.";

            container.appendChild(
                empty
            );

            setSectionVisible(
                sectionKey,
                true
            );
        }

        return;
    }

    const activeItems =
        allItems.filter(
            item =>
                item.active === true
        );

    renderingSections.add(
        sectionKey
    );

    container.replaceChildren();

    activeItems.forEach(
        resource => {

            const card =
                sectionKey ===
                "quickguides"

                    ? createGuideCard(
                        resource
                    )

                    : createLinkCard(
                        resource,
                        sectionKey
                    );

            if (card) {
                container.appendChild(
                    card
                );
            }
        }
    );

    if (
        sectionKey ===
            "communities" &&
        container.children.length ===
            0
    ) {
        const empty =
            document.createElement(
                "p"
            );

        empty.className =
            "community-empty-message";

        empty.textContent =
            "No additional community links are visible right now. You can submit one below for review.";

        container.appendChild(
            empty
        );
    }

    setSectionVisible(
        sectionKey,
        sectionKey ===
            "communities"
            ? true
            : container.children.length >
                0
    );

    queueMicrotask(() => {
        renderingSections.delete(
            sectionKey
        );
    });
}

function watchManagedSection(
    sectionKey
) {
    if (
        sectionObservers.has(
            sectionKey
        )
    ) {
        return;
    }

    const items =
        managedResources.get(
            sectionKey
        ) || [];

    if (!items.length) {
        return;
    }

    const container =
        document.getElementById(
            SECTION_CONFIG[sectionKey]
                .containerId
        );

    if (!container) {
        return;
    }

    const observer =
        new MutationObserver(() => {

            if (
                renderingSections.has(
                    sectionKey
                )
            ) {
                return;
            }

            /*
             * The previous Resources renderer can still finish an
             * asynchronous fetch after Firestore. If it writes legacy
             * cards back into a section that has been migrated, restore
             * the Firestore-managed version automatically.
             */
            renderManagedSection(
                sectionKey
            );
        });

    observer.observe(
        container,
        {
            childList: true
        }
    );

    sectionObservers.set(
        sectionKey,
        observer
    );
}

async function loadManagedResources() {
    const snapshot =
        await getDocs(
            collection(
                db,
                "resources"
            )
        );

    const all =
        snapshot.docs.map(
            item => ({
                id:
                    item.id,
                ...item.data()
            })
        );

    SECTION_ORDER.forEach(
        sectionKey => {

            managedResources.set(
                sectionKey,
                sortResources(
                    all.filter(
                        item =>
                            item.section ===
                            sectionKey
                    )
                )
            );
        }
    );
}

async function initializeManagedResources() {
    installCommunitySection();
    installToolsSection();

    try {

        await loadManagedResources();

        SECTION_ORDER.forEach(
            sectionKey => {

                renderManagedSection(
                    sectionKey
                );

                watchManagedSection(
                    sectionKey
                );
            }
        );

    } catch (error) {

        console.error(
            "Unable to load managed Resources content:",
            error
        );

        /*
         * The existing Resources page remains intact if Firestore
         * cannot be reached. The GOHub news feed is never touched.
         */
    }
}

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeManagedResources
    );

} else {

    initializeManagedResources();
}
