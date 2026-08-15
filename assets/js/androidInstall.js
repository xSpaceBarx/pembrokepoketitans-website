/*
 * PokéTitans Android Home Screen installation helper.
 *
 * This does not change OneSignal or notification preferences.
 * The browser decides whether a one-tap PWA install prompt is available.
 */

(() => {
    "use strict";

    const installArea =
        document.getElementById("android-install-area");

    const installButton =
        document.getElementById("install-poketitans");

    const installStatus =
        document.getElementById("install-poketitans-status");

    if (
        !installArea ||
        !installButton ||
        !installStatus
    ) {
        return;
    }

    const uaPlatform =
        navigator.userAgentData?.platform || "";

    const isAndroid =
        /android/i.test(uaPlatform) ||
        /android/i.test(navigator.userAgent || "");

    if (!isAndroid) {
        return;
    }

    installArea.hidden = false;

    const isStandalone =
        window.matchMedia(
            "(display-mode: standalone)"
        ).matches;

    let deferredInstallPrompt = null;

    if (isStandalone) {
        installButton.disabled = true;
        installButton.textContent =
            "✅ PokéTitans Installed";

        installStatus.textContent =
            "PokéTitans is already open from your Home Screen.";

        return;
    }

    installStatus.textContent =
        "Tap Install PokéTitans to add quick app-style access to your Home Screen.";

    window.addEventListener(
        "beforeinstallprompt",
        event => {
            event.preventDefault();

            deferredInstallPrompt =
                event;

            installButton.disabled =
                false;

            installButton.textContent =
                "📲 Install PokéTitans";

            installStatus.textContent =
                "Ready to install — tap the button above.";
        }
    );

    installButton.addEventListener(
        "click",
        async () => {
            if (!deferredInstallPrompt) {
                installStatus.innerHTML =
                    "Your browser is not offering the one-tap install yet. " +
                    "Open the browser menu <strong>⋮</strong>, choose " +
                    "<strong>Add to Home screen</strong> or " +
                    "<strong>Install app</strong>, then follow the prompt.";
                return;
            }

            try {
                await deferredInstallPrompt.prompt();

                const choice =
                    await deferredInstallPrompt.userChoice;

                if (
                    choice.outcome ===
                    "accepted"
                ) {
                    installStatus.textContent =
                        "✅ PokéTitans is being added to your Home Screen.";
                } else {
                    installStatus.textContent =
                        "Install canceled. You can tap Install PokéTitans again later.";
                }
            } catch (error) {
                console.warn(
                    "PokéTitans install prompt was unavailable:",
                    error
                );

                installStatus.innerHTML =
                    "The one-tap install could not open. " +
                    "Use the browser menu <strong>⋮</strong> → " +
                    "<strong>Add to Home screen</strong> or " +
                    "<strong>Install app</strong>.";
            } finally {
                deferredInstallPrompt =
                    null;
            }
        }
    );

    window.addEventListener(
        "appinstalled",
        () => {
            deferredInstallPrompt =
                null;

            installButton.disabled =
                true;

            installButton.textContent =
                "✅ PokéTitans Installed";

            installStatus.textContent =
                "PokéTitans was added to your Home Screen.";
        }
    );
})();
