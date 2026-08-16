/*
 * Pembroke PokéTitans — Public Analytics
 * GA4 Measurement ID: G-JMEHH1JFKT
 *
 * Tracks meaningful site interactions without sending
 * Trainer names, Friend Codes, form values, or other personal data.
 */

(() => {
    "use strict";

    const MEASUREMENT_ID =
        "G-JMEHH1JFKT";

    const GOOGLE_TAG_SRC =
        "https://www.googletagmanager.com/gtag/js?id=" +
        encodeURIComponent(
            MEASUREMENT_ID
        );

    function ensureGoogleAnalytics() {
        window.dataLayer =
            window.dataLayer || [];

        if (
            typeof window.gtag !==
            "function"
        ) {
            window.gtag =
                function () {
                    window.dataLayer.push(
                        arguments
                    );
                };
        }

        const existingTag =
            Array.from(
                document.scripts
            ).some(script => {
                const src =
                    script.src || "";

                return (
                    src.includes(
                        "googletagmanager.com/gtag/js"
                    ) &&
                    src.includes(
                        MEASUREMENT_ID
                    )
                );
            });

        if (existingTag) {
            return;
        }

        const script =
            document.createElement(
                "script"
            );

        script.async = true;
        script.src =
            GOOGLE_TAG_SRC;

        document.head.appendChild(
            script
        );

        window.gtag(
            "js",
            new Date()
        );

        window.gtag(
            "config",
            MEASUREMENT_ID
        );
    }

    function cleanText(
        value,
        maxLength = 100
    ) {
        return String(
            value || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .slice(
                0,
                maxLength
            );
    }

    function currentPageName() {
        const file =
            (
                window.location.pathname
                    .split("/")
                    .pop() ||
                "index.html"
            )
                .toLowerCase();

        if (
            file === "" ||
            file === "index.html"
        ) {
            return "home";
        }

        return file.replace(
            /\.html$/i,
            ""
        );
    }

    function destinationHost(
        element
    ) {
        const href =
            element?.getAttribute?.(
                "href"
            );

        if (!href) {
            return "";
        }

        try {
            return new URL(
                href,
                window.location.href
            ).hostname;
        } catch {
            return "";
        }
    }

    function elementLabel(
        element
    ) {
        return cleanText(
            element?.getAttribute?.(
                "aria-label"
            ) ||
            element?.textContent ||
            ""
        );
    }

    function inferPlacement(
        element
    ) {
        if (
            element.closest(
                ".home-hero-actions"
            )
        ) {
            return "home_hero";
        }

        if (
            element.closest(
                ".home-tools-grid"
            )
        ) {
            return "homepage_tools";
        }

        if (
            element.closest(
                "header"
            )
        ) {
            return "header";
        }

        if (
            element.closest(
                "#event-card"
            )
        ) {
            return "next_meetup";
        }

        if (
            element.closest(
                "#upcoming-events-list"
            )
        ) {
            return "upcoming_meetup";
        }

        if (
            element.closest(
                ".join-section"
            )
        ) {
            return "homepage_join";
        }

        if (
            element.closest(
                "#communities"
            )
        ) {
            return "resources_communities";
        }

        if (
            element.closest(
                ".resource-nav"
            )
        ) {
            return "resources_navigation";
        }

        if (
            element.closest(
                ".device-setup-grid"
            )
        ) {
            return "alerts_setup";
        }

        if (
            element.closest(
                ".companion-card"
            )
        ) {
            return "alerts_preferences";
        }

        if (
            element.closest(
                "footer"
            )
        ) {
            return "footer";
        }

        return currentPageName();
    }

    function nearbyTitle(
        element
    ) {
        const card =
            element.closest(
                ".managed-resource-card, .event-card, .home-tool-card"
            );

        if (!card) {
            return "";
        }

        return cleanText(
            card.querySelector(
                "h2, h3"
            )?.textContent ||
            ""
        );
    }

    function resourceSection(
        element
    ) {
        const section =
            element.closest(
                "section"
            );

        const id =
            cleanText(
                section?.id ||
                "",
                60
            );

        if (
            id.includes(
                "communit"
            )
        ) {
            return "communities";
        }

        if (
            id.includes(
                "podcast"
            )
        ) {
            return "podcasts";
        }

        if (
            id.includes(
                "social"
            )
        ) {
            return "socials";
        }

        if (
            id.includes(
                "website"
            )
        ) {
            return "websites";
        }

        if (
            id.includes(
                "guide"
            )
        ) {
            return "quickguides";
        }

        const label =
            elementLabel(
                element
            ).toLowerCase();

        if (
            label.includes(
                "discord"
            ) ||
            label.includes(
                "campfire"
            ) &&
            element.closest(
                ".managed-resource-card"
            )
        ) {
            return "communities";
        }

        if (
            label.includes(
                "listen"
            )
        ) {
            return "podcasts";
        }

        if (
            label.includes(
                "follow"
            )
        ) {
            return "socials";
        }

        if (
            label.includes(
                "visit website"
            )
        ) {
            return "websites";
        }

        return "";
    }

    function sendEvent(
        eventName,
        parameters = {}
    ) {
        if (
            !eventName ||
            typeof window.gtag !==
                "function"
        ) {
            return;
        }

        const cleanParameters = {
            page_name:
                currentPageName()
        };

        Object.entries(
            parameters
        ).forEach(
            ([
                key,
                value
            ]) => {
                if (
                    value ===
                        undefined ||
                    value ===
                        null ||
                    value ===
                        ""
                ) {
                    return;
                }

                cleanParameters[key] =
                    typeof value ===
                    "string"
                        ? cleanText(
                            value
                        )
                        : value;
            }
        );

        window.gtag(
            "event",
            eventName,
            cleanParameters
        );
    }

    /*
     * Expose a tiny public helper so feature-specific files
     * can later send SUCCESS events without duplicating GA code.
     */
    window.PokeTitansAnalytics = {
        track:
            sendEvent
    };

    function trackHomeTool(
        element
    ) {
        const card =
            element.closest(
                ".home-tool-card"
            );

        if (!card) {
            return;
        }

        sendEvent(
            "tool_click",
            {
                target_name:
                    nearbyTitle(
                        card
                    ),
                placement:
                    "homepage_tools"
            }
        );
    }

    function trackCampfire(
        element
    ) {
        const href =
            element.getAttribute(
                "href"
            ) || "";

        let host = "";

        try {
            host =
                new URL(
                    href,
                    window.location.href
                ).hostname
                    .toLowerCase();
        } catch {
            return;
        }

        const isCampfire =
            host.includes(
                "campfire"
            ) ||
            host ===
                "cmpf.re";

        if (!isCampfire) {
            return;
        }

        sendEvent(
            "campfire_click",
            {
                placement:
                    inferPlacement(
                        element
                    ),
                target_name:
                    nearbyTitle(
                        element
                    ) ||
                    elementLabel(
                        element
                    ),
                destination_host:
                    host
            }
        );
    }

    function trackDirections(
        element
    ) {
        const href =
            element.getAttribute(
                "href"
            ) || "";

        const label =
            elementLabel(
                element
            )
                .toLowerCase();

        if (
            !href.includes(
                "google.com/maps"
            ) ||
            (
                !label.includes(
                    "direction"
                ) &&
                !element.closest(
                    "#event-card, #upcoming-events-list"
                )
            )
        ) {
            return;
        }

        sendEvent(
            "directions_click",
            {
                placement:
                    inferPlacement(
                        element
                    ),
                target_name:
                    nearbyTitle(
                        element
                    ) ||
                    "meetup_location"
            }
        );
    }

    function trackResource(
        element
    ) {
        if (
            !element.matches(
                ".managed-resource-button"
            )
        ) {
            return;
        }

        const section =
            resourceSection(
                element
            );

        const eventName =
            section ===
                "communities"
                ? "community_link_click"
                : "resource_click";

        sendEvent(
            eventName,
            {
                target_name:
                    nearbyTitle(
                        element
                    ),
                resource_section:
                    section ||
                    "other",
                placement:
                    inferPlacement(
                        element
                    ),
                destination_host:
                    destinationHost(
                        element
                    )
            }
        );
    }

    function trackTrainerActions(
        element
    ) {
        if (
            element.matches(
                ".copy-button"
            )
        ) {
            sendEvent(
                "trainer_code_copy",
                {
                    placement:
                        "trainer_directory"
                }
            );

            return;
        }

        const label =
            elementLabel(
                element
            )
                .toLowerCase();

        if (
            element.matches(
                'button[type="submit"]'
            ) &&
            label.includes(
                "submit trainer"
            )
        ) {
            sendEvent(
                "trainer_submit_click",
                {
                    placement:
                        "trainer_directory"
                }
            );
        }
    }

    function trackAlertActions(
        element
    ) {
        const id =
            element.id || "";

        if (
            id ===
            "enable-android"
        ) {
            sendEvent(
                "alert_setup_start",
                {
                    device_type:
                        "android",
                    placement:
                        "alerts_setup"
                }
            );

            return;
        }

        if (
            id ===
            "enable-desktop"
        ) {
            sendEvent(
                "alert_setup_start",
                {
                    device_type:
                        "desktop",
                    placement:
                        "alerts_setup"
                }
            );

            return;
        }

        if (
            id ===
            "install-poketitans"
        ) {
            sendEvent(
                "android_install_click",
                {
                    device_type:
                        "android",
                    placement:
                        "alerts_setup"
                }
            );

            return;
        }

        if (
            id ===
            "save-alerts"
        ) {
            const toggles =
                Array.from(
                    document.querySelectorAll(
                        ".toggle-row input[type='checkbox']"
                    )
                );

            const enabledCount =
                toggles.filter(
                    input =>
                        input.checked
                ).length;

            sendEvent(
                "alert_preferences_save",
                {
                    enabled_count:
                        enabledCount,
                    disabled_count:
                        Math.max(
                            0,
                            toggles.length -
                            enabledCount
                        ),
                    placement:
                        "alerts_preferences"
                }
            );

            return;
        }

        if (
            element.matches(
                ".site-image-lightbox-link"
            )
        ) {
            sendEvent(
                "iphone_setup_guide_open",
                {
                    device_type:
                        "iphone_ipad",
                    placement:
                        "alerts_setup"
                }
            );
        }
    }

    function trackMeetupActions(
        element
    ) {
        if (
            !element.matches(
                "button"
            )
        ) {
            return;
        }

        const label =
            elementLabel(
                element
            )
                .toLowerCase();

        if (
            label.includes(
                "share meetup"
            )
        ) {
            sendEvent(
                "meetup_share_click",
                {
                    placement:
                        inferPlacement(
                            element
                        ),
                    target_name:
                        nearbyTitle(
                            element
                        )
                }
            );

            return;
        }

        if (
            label.includes(
                "add to calendar"
            )
        ) {
            sendEvent(
                "meetup_calendar_click",
                {
                    placement:
                        inferPlacement(
                            element
                        ),
                    target_name:
                        nearbyTitle(
                            element
                        )
                }
            );
        }
    }

    function trackGraphicOpen(
        element
    ) {
        const image =
            element.matches(
                "img"
            )
                ? element
                : element.querySelector?.(
                    "img"
                );

        if (
            !image ||
            !image.matches(
                ".current-event-image, .raid-image, .today-counters"
            )
        ) {
            return;
        }

        sendEvent(
            "graphic_open",
            {
                target_name:
                    cleanText(
                        image.alt ||
                        "Pokemon GO graphic"
                    ),
                placement:
                    currentPageName()
            }
        );
    }

    function trackEventPageLink(
        element
    ) {
        if (
            currentPageName() !==
            "events" ||
            element.tagName !==
            "A"
        ) {
            return;
        }

        const host =
            destinationHost(
                element
            );

        if (
            !host ||
            host ===
                window.location.hostname
        ) {
            return;
        }

        if (
            host.includes(
                "campfire"
            ) ||
            host ===
                "cmpf.re"
        ) {
            return;
        }

        sendEvent(
            "event_link_click",
            {
                target_name:
                    nearbyTitle(
                        element
                    ) ||
                    elementLabel(
                        element
                    ),
                destination_host:
                    host,
                placement:
                    "event_hub"
            }
        );
    }

    function installClickTracking() {
        document.addEventListener(
            "click",
            event => {
                const element =
                    event.target.closest?.(
                        "a, button"
                    );

                if (!element) {
                    return;
                }

                trackHomeTool(
                    element
                );

                if (
                    element.tagName ===
                    "A"
                ) {
                    trackCampfire(
                        element
                    );

                    trackDirections(
                        element
                    );

                    trackResource(
                        element
                    );

                    trackEventPageLink(
                        element
                    );
                }

                trackTrainerActions(
                    element
                );

                trackAlertActions(
                    element
                );

                trackMeetupActions(
                    element
                );

                trackGraphicOpen(
                    element
                );
            }
        );
    }

    function installCommunitySubmissionTracking() {
        document.addEventListener(
            "submit",
            event => {
                if (
                    event.target?.id !==
                    "community-submission-form"
                ) {
                    return;
                }

                sendEvent(
                    "community_submit_click",
                    {
                        placement:
                            "resources_communities"
                    }
                );
            }
        );
    }

    function installAppTracking() {
        window.addEventListener(
            "appinstalled",
            () => {
                sendEvent(
                    "app_install",
                    {
                        device_type:
                            "android",
                        placement:
                            "alerts_setup"
                    }
                );
            }
        );
    }

    ensureGoogleAnalytics();
    installClickTracking();
    installCommunitySubmissionTracking();
    installAppTracking();
})();
