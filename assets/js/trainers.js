mport { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

let allTrainers = [];

function getElement(id) {
    return document.getElementById(id);
}

function normalizeFriendCode(value) {
    return String(value || "")
        .replace(/\D/g, "")
        .slice(0, 12);
}

function formatFriendCode(value) {

    const digits =
        normalizeFriendCode(value);

    if (digits.length !== 12) {
        return String(value || "");
    }

    return (
        digits.slice(0, 4) +
        " " +
        digits.slice(4, 8) +
        " " +
        digits.slice(8, 12)
    );
}

function installTrainerDirectoryStyles() {

    if (
        document.getElementById(
            "trainer-directory-mobile-styles"
        )
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "trainer-directory-mobile-styles";

    style.textContent = `
        /* ==========================================
           PokéTitans Trainer Directory v3
        ========================================== */

        .trainer-directory-controls {
            display: grid;
            grid-template-columns:
                minmax(0, 1fr)
                minmax(180px, .45fr);
            gap: 12px;
            margin: 16px 0 24px;
            align-items: end;
        }

        .trainer-directory-control label {
            display: block;
            margin-bottom: 6px;
            color: #153A5B;
            font-weight: 700;
            font-size: .9rem;
        }

        .trainer-directory-control input,
        .trainer-directory-control select {
            width: 100%;
            box-sizing: border-box;
            min-height: 46px;
            padding: 11px 12px;
            border: 1px solid #cfd4da;
            border-radius: 9px;
            background: #ffffff;
            color: #222;
            font: inherit;
        }

        .trainer-directory-control input:focus,
        .trainer-directory-control select:focus {
            outline: 2px solid #F57C00;
            outline-offset: 2px;
        }

        .trainer-add-toggle {
            display: none;
            width: 100%;
            min-height: 46px;
            border: 0;
            border-radius: 9px;
            padding: 11px 14px;
            background: #F57C00;
            color: #ffffff;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
        }

        .trainer-directory-card {
            position: relative;
        }

        .trainer-code-row {
            margin-top: 8px;
        }

        .trainer-code-row .friend-code {
            margin-bottom: 12px;
        }

        .copy-button-short {
            display: none;
        }

        @media (max-width: 700px) {

            .trainer-submit-section-mobile {
                display: none !important;
            }

            .trainer-submit-section-mobile.is-mobile-open {
                display: block !important;
            }

            .trainer-directory-section-mobile {
                padding-top: 34px !important;
                padding-bottom: 34px !important;
            }

            .trainer-directory-section-mobile .section-title {
                margin-bottom: 8px !important;
                font-size: 1.6rem !important;
            }

            #trainer-count {
                margin: 0 0 12px !important;
                font-size: .9rem;
                font-weight: 700;
                color: #153A5B;
            }

            .trainer-directory-controls {
                grid-template-columns:
                    minmax(0, 1fr)
                    minmax(120px, .52fr);
                gap: 9px;
                margin: 10px 0 14px;
            }

            .trainer-directory-control label {
                margin-bottom: 4px;
                font-size: .78rem;
            }

            .trainer-directory-control input,
            .trainer-directory-control select {
                min-height: 43px;
                padding: 9px 10px;
                font-size: .88rem;
            }

            .trainer-add-toggle {
                display: block;
                grid-column: 1 / -1;
                margin-top: 1px;
            }

            #trainer-list {
                margin-top: 10px !important;
            }

            #trainer-list .trainer-directory-card {
                padding: 14px 15px !important;
                margin-bottom: 10px !important;
                border-radius: 11px !important;
            }

            .trainer-directory-card h3 {
                margin: 0 0 4px !important;
                font-size: 1.05rem !important;
                line-height: 1.2 !important;
            }

            .trainer-directory-card .trainer-location {
                margin: 0 0 10px !important;
                color: #555;
                font-size: .82rem;
                line-height: 1.35;
            }

            .trainer-code-row {
                display: grid;
                grid-template-columns:
                    minmax(0, 1fr)
                    auto;
                gap: 10px;
                align-items: center;
                margin-top: 0;
            }

            .trainer-code-row .friend-code {
                margin: 0 !important;
                font-size: 1.02rem !important;
                line-height: 1.2;
                letter-spacing: .02em;
                white-space: nowrap;
            }

            .trainer-code-row .copy-button {
                width: auto !important;
                min-width: 72px;
                min-height: 40px;
                margin: 0 !important;
                padding: 8px 11px !important;
                font-size: .8rem !important;
                border: 0;
            }

            .copy-button-full {
                display: none;
            }

            .copy-button-short {
                display: inline;
            }

            .trainer-directory-empty {
                padding: 18px 14px;
                margin: 10px 0 0;
                border-radius: 10px;
                background: #ffffff;
                color: #555;
                text-align: center;
            }

            .trainer-submit-section-mobile.is-mobile-open {
                padding-top: 34px !important;
                padding-bottom: 34px !important;
            }

            .trainer-submit-section-mobile.is-mobile-open .section-title {
                margin-bottom: 10px !important;
                font-size: 1.55rem !important;
            }

            .trainer-submit-section-mobile.is-mobile-open .section-description {
                margin-bottom: 16px !important;
                font-size: .88rem;
                line-height: 1.5;
            }

            .trainer-submit-section-mobile.is-mobile-open #trainer-form {
                margin-top: 12px;
            }
        }

        @media (max-width: 390px) {

            .trainer-directory-controls {
                grid-template-columns: 1fr;
            }

            .trainer-add-toggle {
                grid-column: auto;
            }

            .trainer-code-row .friend-code {
                font-size: .94rem !important;
            }

            .trainer-code-row .copy-button {
                min-width: 66px;
                padding-left: 9px !important;
                padding-right: 9px !important;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}

async function copyFriendCode(
    button,
    code
) {

    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator.clipboard.writeText(
                code
            );

        } else {

            const textArea =
                document.createElement(
                    "textarea"
                );

            textArea.value =
                code;

            textArea.style.position =
                "fixed";

            textArea.style.top =
                "-9999px";

            textArea.style.left =
                "-9999px";

            document.body.appendChild(
                textArea
            );

            textArea.focus();
            textArea.select();

            const successful =
                document.execCommand(
                    "copy"
                );

            textArea.remove();

            if (!successful) {
                throw new Error(
                    "Fallback copy failed."
                );
            }
        }

        const fullLabel =
            button.querySelector(
                ".copy-button-full"
            );

        const shortLabel =
            button.querySelector(
                ".copy-button-short"
            );

        if (
            fullLabel &&
            shortLabel
        ) {
            fullLabel.textContent =
                "✅ Copied!";
            shortLabel.textContent =
                "✅ Copied";

            setTimeout(
                () => {
                    fullLabel.textContent =
                        "Copy Friend Code";
                    shortLabel.textContent =
                        "Copy";
                },
                1500
            );
        } else {

            const originalText =
                button.textContent;

            button.textContent =
                "✅ Copied!";

            setTimeout(
                () => {
                    button.textContent =
                        originalText;
                },
                1500
            );
        }

    } catch (error) {

        console.error(
            "Copy failed:",
            error
        );

        alert(
            "Unable to copy friend code. Please copy it manually."
        );
    }
}

function createTrainerCard(
    trainer
) {

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "event-card trainer-directory-card";

    const name =
        document.createElement(
            "h3"
        );

    name.textContent =
        trainer.trainerName || "";

    const location =
        document.createElement(
            "p"
        );

    location.className =
        "trainer-location";

    location.textContent =
        `📍 ${trainer.location || ""}`;

    const codeRow =
        document.createElement(
            "div"
        );

    codeRow.className =
        "trainer-code-row";

    const friendCode =
        document.createElement(
            "p"
        );

    friendCode.className =
        "friend-code";

    friendCode.textContent =
        formatFriendCode(
            trainer.friendCode
        );

    const digits =
        normalizeFriendCode(
            trainer.friendCode
        );

    const copyButton =
        document.createElement(
            "button"
        );

    copyButton.type =
        "button";

    copyButton.className =
        "hero-button copy-button";

    copyButton.disabled =
        digits.length !== 12;

    const fullLabel =
        document.createElement(
            "span"
        );

    fullLabel.className =
        "copy-button-full";

    fullLabel.textContent =
        "Copy Friend Code";

    const shortLabel =
        document.createElement(
            "span"
        );

    shortLabel.className =
        "copy-button-short";

    shortLabel.textContent =
        "Copy";

    copyButton.append(
        fullLabel,
        shortLabel
    );

    copyButton.addEventListener(
        "click",
        async () => {

            await copyFriendCode(
                copyButton,
                digits
            );
        }
    );

    codeRow.append(
        friendCode,
        copyButton
    );

    card.append(
        name,
        location,
        codeRow
    );

    return card;
}

function getDirectorySearchValue() {

    return String(
        getElement(
            "trainer-directory-search"
        )?.value ||
        ""
    )
        .trim()
        .toLowerCase();
}

function getDirectoryLocationValue() {

    return String(
        getElement(
            "trainer-directory-location"
        )?.value ||
        ""
    )
        .trim()
        .toLowerCase();
}

function updateLocationOptions() {

    const select =
        getElement(
            "trainer-directory-location"
        );

    if (!select) {
        return;
    }

    const currentValue =
        select.value;

    const locations =
        Array.from(
            new Set(
                allTrainers
                    .map(
                        trainer =>
                            String(
                                trainer.location ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        )
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        undefined,
                        {
                            sensitivity:
                                "base"
                        }
                    )
            );

    select.innerHTML = "";

    const allOption =
        document.createElement(
            "option"
        );

    allOption.value =
        "";

    allOption.textContent =
        "All Locations";

    select.appendChild(
        allOption
    );

    locations.forEach(
        location => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                location;

            option.textContent =
                location;

            select.appendChild(
                option
            );
        }
    );

    if (
        locations.includes(
            currentValue
        )
    ) {
        select.value =
            currentValue;
    }
}

function renderTrainers() {

    const trainerList =
        getElement(
            "trainer-list"
        );

    const trainerCount =
        getElement(
            "trainer-count"
        );

    if (!trainerList) {
        return;
    }

    const searchValue =
        getDirectorySearchValue();

    const locationValue =
        getDirectoryLocationValue();

    const filtered =
        allTrainers.filter(
            trainer => {

                const trainerLocation =
                    String(
                        trainer.location ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                if (
                    locationValue &&
                    trainerLocation !==
                        locationValue
                ) {
                    return false;
                }

                if (!searchValue) {
                    return true;
                }

                const searchable =
                    [
                        trainer.trainerName,
                        trainer.location,
                        trainer.friendCode,
                        normalizeFriendCode(
                            trainer.friendCode
                        )
                    ]
                        .join(" ")
                        .toLowerCase();

                return searchable.includes(
                    searchValue
                );
            }
        );

    if (trainerCount) {

        const selectedLocation =
            getElement(
                "trainer-directory-location"
            )?.value ||
            "";

        if (
            !searchValue &&
            selectedLocation
        ) {

            trainerCount.textContent =
                `👥 ${filtered.length} Trainer${filtered.length === 1 ? "" : "s"} in ${selectedLocation}`;

        } else if (
            searchValue ||
            selectedLocation
        ) {

            trainerCount.textContent =
                `👥 ${filtered.length} of ${allTrainers.length} Trainers`;

        } else {

            trainerCount.textContent =
                `👥 ${allTrainers.length} Registered Trainer${allTrainers.length === 1 ? "" : "s"}`;
        }
    }

    trainerList.innerHTML =
        "";

    if (!filtered.length) {

        const empty =
            document.createElement(
                "p"
            );

        empty.className =
            "trainer-directory-empty";

        empty.textContent =
            (
                searchValue ||
                locationValue
            )
                ? "No Trainers match your current search or location filter."
                : "No trainers have been added yet.";

        trainerList.appendChild(
            empty
        );

        return;
    }

    filtered.forEach(
        trainer => {

            trainerList.appendChild(
                createTrainerCard(
                    trainer
                )
            );
        }
    );
}

function closeMobileSubmission({
    scrollToDirectory = false
} = {}) {

    const form =
        getElement(
            "trainer-form"
        );

    const submissionSection =
        form?.closest(
            "section"
        );

    const toggle =
        getElement(
            "trainer-add-toggle"
        );

    if (
        !submissionSection ||
        !toggle
    ) {
        return;
    }

    submissionSection
        .classList
        .remove(
            "is-mobile-open"
        );

    toggle.setAttribute(
        "aria-expanded",
        "false"
    );

    toggle.textContent =
        "＋ Add Your Trainer Code";

    if (
        scrollToDirectory &&
        window.innerWidth <=
            700
    ) {

        const directorySection =
            getElement(
                "trainer-list"
            )?.closest(
                "section"
            );

        directorySection
            ?.scrollIntoView({
                behavior:
                    "smooth",
                block:
                    "start"
            });
    }
}

function initializeDirectoryControls() {

    installTrainerDirectoryStyles();

    const trainerList =
        getElement(
            "trainer-list"
        );

    const trainerCount =
        getElement(
            "trainer-count"
        );

    if (
        !trainerList ||
        !trainerCount
    ) {
        return;
    }

    const directorySection =
        trainerList.closest(
            "section"
        );

    if (directorySection) {
        directorySection.classList.add(
            "trainer-directory-section-mobile"
        );
    }

    const form =
        getElement(
            "trainer-form"
        );

    const submissionSection =
        form?.closest(
            "section"
        );

    if (submissionSection) {
        submissionSection.classList.add(
            "trainer-submit-section-mobile"
        );
    }

    if (
        getElement(
            "trainer-directory-controls"
        )
    ) {
        return;
    }

    const controls =
        document.createElement(
            "div"
        );

    controls.id =
        "trainer-directory-controls";

    controls.className =
        "trainer-directory-controls";

    const searchWrap =
        document.createElement(
            "div"
        );

    searchWrap.className =
        "trainer-directory-control";

    const searchLabel =
        document.createElement(
            "label"
        );

    searchLabel.htmlFor =
        "trainer-directory-search";

    searchLabel.textContent =
        "Search Trainer or Location";

    const search =
        document.createElement(
            "input"
        );

    search.type =
        "search";

    search.id =
        "trainer-directory-search";

    search.placeholder =
        "Name, town or Friend Code";

    search.autocomplete =
        "off";

    searchWrap.append(
        searchLabel,
        search
    );

    const locationWrap =
        document.createElement(
            "div"
        );

    locationWrap.className =
        "trainer-directory-control";

    const locationLabel =
        document.createElement(
            "label"
        );

    locationLabel.htmlFor =
        "trainer-directory-location";

    locationLabel.textContent =
        "Location";

    const location =
        document.createElement(
            "select"
        );

    location.id =
        "trainer-directory-location";

    const allLocations =
        document.createElement(
            "option"
        );

    allLocations.value =
        "";

    allLocations.textContent =
        "All Locations";

    location.appendChild(
        allLocations
    );

    locationWrap.append(
        locationLabel,
        location
    );

    const addToggle =
        document.createElement(
            "button"
        );

    addToggle.type =
        "button";

    addToggle.id =
        "trainer-add-toggle";

    addToggle.className =
        "trainer-add-toggle";

    addToggle.textContent =
        "＋ Add Your Trainer Code";

    addToggle.setAttribute(
        "aria-expanded",
        "false"
    );

    if (form) {

        addToggle.setAttribute(
            "aria-controls",
            "trainer-form"
        );

        addToggle.addEventListener(
            "click",
            () => {

                const isOpen =
                    submissionSection
                        ?.classList
                        .toggle(
                            "is-mobile-open"
                        ) ||
                    false;

                addToggle.setAttribute(
                    "aria-expanded",
                    isOpen
                        ? "true"
                        : "false"
                );

                addToggle.textContent =
                    isOpen
                        ? "− Hide Trainer Form"
                        : "＋ Add Your Trainer Code";

                if (
                    isOpen &&
                    window.innerWidth <=
                        700
                ) {

                    submissionSection
                        ?.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "start"
                        });

                    setTimeout(
                        () => {
                            getElement(
                                "trainerName"
                            )?.focus({
                                preventScroll:
                                    true
                            });
                        },
                        350
                    );
                }
            }
        );
    }

    controls.append(
        searchWrap,
        locationWrap,
        addToggle
    );

    trainerCount.insertAdjacentElement(
        "afterend",
        controls
    );

    search.addEventListener(
        "input",
        renderTrainers
    );

    location.addEventListener(
        "change",
        renderTrainers
    );

    window.addEventListener(
        "poketitans:trainer-submitted",
        () => {

            closeMobileSubmission({
                scrollToDirectory:
                    true
            });
        }
    );
}

export async function loadTrainers() {

    initializeDirectoryControls();

    const trainerList =
        getElement(
            "trainer-list"
        );

    if (!trainerList) {
        return;
    }

    trainerList.innerHTML =
        "";

    const loading =
        document.createElement(
            "p"
        );

    loading.textContent =
        "Loading Trainers...";

    trainerList.appendChild(
        loading
    );

    try {

        const trainerQuery =
            query(
                collection(
                    db,
                    "trainers"
                ),
                orderBy(
                    "trainerName"
                )
            );

        const snapshot =
            await getDocs(
                trainerQuery
            );

        allTrainers =
            snapshot.docs.map(
                documentSnapshot =>
                    ({
                        id:
                            documentSnapshot.id,
                        ...documentSnapshot.data()
                    })
            );

        updateLocationOptions();
        renderTrainers();

    } catch (error) {

        console.error(
            "Unable to load trainers:",
            error
        );

        trainerList.innerHTML =
            "";

        const message =
            document.createElement(
                "p"
            );

        message.className =
            "trainer-directory-empty";

        message.textContent =
            "Unable to load trainers.";

        trainerList.appendChild(
            message
        );
    }
}

loadTrainers();
