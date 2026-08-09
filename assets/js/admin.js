import { loadDrafts } from "./draftQueue.js?v=2";
import { saveNotification } from "./notifications-admin.js";
import { updatePlannerStatus } from "./plannerStatus.js";
import { publishNotification } from "./publishNotification.js?v=3";
import { initMeetupManager } from "./meetupManager.js?v=2";
import { initGraphicsManager } from "./graphicsManager.js?v=5";
import { initTrainerManager } from "./trainerManager.js?v=1";
import { initAnnouncementManager } from "./announcementManager.js?v=1";
import { initSiteStatusDashboard } from "./siteStatusDashboard.js?v=1";

const templates = {

    meetup: {
        title: "📍 Campfire Meetup Reminder",
        message: `Don't forget tonight's PokéTitans meetup!\n\n📍 Pembroke Historical Society\n🕠 Meetup begins at 6:00 PM\n\nWe hope to see you there!`,
        audience: "meetup"
    },

    raidhour: {
        title: "⚡ Raid Hour Tonight!",
        message: `Raid Hour starts tonight!\n\n⏰ 6:00–7:00 PM\n\nLet's raid together!`,
        audience: "raidhour"
    },

    spotlight: {
        title: "✨ Spotlight Hour Tonight!",
        message: `Spotlight Hour begins tonight!\n\n⏰ 6:00–7:00 PM\n\nGood luck, Trainers!`,
        audience: "spotlight"
    },

    maxmonday: {
        title: "💎 Max Monday Tonight!",
        message: `Max Monday begins tonight!\n\nTake on Max Battles with the community and earn those Max Particles!`,
        audience: "maxmonday"
    },

    raidrotation: {
        title: "🆕 New Raid Boss Rotation!",
        message: `A brand new Raid Boss rotation is now live!\n\nCheck out what's appearing in Gyms!`,
        audience: "raidrotation"
    },

    raidday: {
        title: "⚔ Raid Day Today!",
        message: `Raid Day is here!\n\nGood luck, Trainers!`,
        audience: "raidday"
    },

    hatchday: {
        title: "🥚 Hatch Day Today!",
        message: `It's Hatch Day!\n\nDon't forget your Egg Incubators and enjoy the bonuses while the event is active.`,
        audience: "hatchday"
    },

    communityday: {
        title: "🎉 Community Day Today!",
        message: `Community Day has begun!\n\nGood luck catching today's featured Pokémon and enjoy all of the event bonuses!`,
        audience: "communityday"
    },

    globalevent: {
        title: "🌎 Global Event Begins!",
        message: `Today's global Pokémon GO event is now live!\n\nCheck the Today View for bonuses, featured Pokémon and event tasks.\n\nHave fun, Trainers!`,
        audience: "globalevent"
    },

    gopass: {
        title: "🎟 Daily Bonuses & GO Pass",
        message: `Don't forget to collect today's Daily Bonuses and GO Pass rewards before they expire!`,
        audience: "gopass"
    },

    trinket: {
        title: "🍀 Lucky Trinket Reminder",
        message: `Remember to use your Lucky Trinket before 8:00 PM tonight!`,
        audience: "trinket"
    },

    research: {
        title: "📦 New Special Research",
        message: `New Special or Timed Research is now available!\n\nOpen Pokémon GO and start working through the new tasks.`,
        audience: "research"
    },

    codes: {
        title: "🎁 New Redemption Code",
        message: `A new Pokémon GO redemption code is available!\n\nClaim it before it expires.`,
        audience: "codes"
    },

    news: {
        title: "🚨 Pokémon GO Breaking News",
        message: `Important Pokémon GO news will appear here.`,
        audience: "news"
    }

};

/* ============================
   LIVE PREVIEW
============================ */

function updatePreview() {

    document.getElementById("preview-title").textContent =
        document.getElementById("notification-title").value ||
        "Notification Title";

    document.getElementById("preview-message").textContent =
        document.getElementById("notification-message").value ||
        "Your notification message will appear here.";

}

function startNewNotification(
    {
        title = "",
        message = "",
        audience = "news"
    } = {}
) {

    document.getElementById(
        "notification-id"
    ).value = "";

    document.getElementById(
        "editingBanner"
    ).style.display =
        "none";

    document.getElementById(
        "sendNotification"
    ).innerHTML =
        "💾 Save Draft";

    document.getElementById(
        "notification-title"
    ).value =
        title;

    document.getElementById(
        "notification-message"
    ).value =
        message;

    const audienceSelect =
        document.getElementById(
            "notification-audience"
        );

    const audienceExists =
        Array.from(
            audienceSelect.options
        ).some(
            option =>
                option.value === audience
        );

    audienceSelect.value =
        audienceExists
            ? audience
            : "news";

    document.getElementById(
        "notification-delivery"
    ).value =
        "now";

    document.getElementById(
        "notification-date"
    ).value = "";

    document.getElementById(
        "notification-time"
    ).value = "";

    updatePreview();

    document.getElementById(
        "notification-center"
    )?.scrollIntoView({
        behavior:
            "smooth",
        block:
            "start"
    });
}

window.addEventListener(
    "poketitans:notification-draft",
    event => {

        const detail =
            event.detail || {};

        startNewNotification({
            title:
                detail.title || "",
            message:
                detail.message || "",
            audience:
                detail.audience || "news"
        });
    }
);

document
    .getElementById("notification-title")
    .addEventListener("input", updatePreview);

document
    .getElementById("notification-message")
    .addEventListener("input", updatePreview);

/* ============================
   NOTIFICATION PLANNER
============================ */

document
    .querySelectorAll(".planner-item[data-template]")
    .forEach(card => {

        card.addEventListener("click", () => {

            const template =
                templates[card.dataset.template];

            if (!template) return;

            startNewNotification({
                title:
                    template.title,
                message:
                    template.message,
                audience:
                    template.audience
            });

        });

    });

/* ============================
   SAVE DRAFT
============================ */

document
    .getElementById("sendNotification")
    .addEventListener("click", async () => {

        const notification = {

            title:
                document.getElementById("notification-title").value,

            message:
                document.getElementById("notification-message").value,

            audience:
                document.getElementById("notification-audience").value,

            delivery:
                document.getElementById("notification-delivery").value,

            date:
                document.getElementById("notification-date").value,

            time:
                document.getElementById("notification-time").value

        };

        const id =
            document.getElementById("notification-id").value;

        const savedId =
            await saveNotification(notification, id);

        if (savedId) {
            document.getElementById("notification-id").value =
                savedId;
        }

        await loadDrafts();
        await updatePlannerStatus();

    });

/* ============================
   PUBLISH
============================ */

document
    .getElementById("publishNotification")
    .addEventListener("click", async () => {

        const id =
            document.getElementById("notification-id").value;

        if (!id) {

            alert(
                "Please save this notification as a draft first."
            );

            return;

        }

        const result =
            await publishNotification(id);

        if (!result) {
            return;
        }

        await loadDrafts();
        await updatePlannerStatus();

        if (result === "scheduled") {

            alert(
                "✅ Notification scheduled successfully."
            );

        } else {

            alert(
                "✅ Notification sent and published successfully."
            );

        }

    });

/* ============================
   CLEAR NOTIFICATION EDITOR
============================ */

document
    .getElementById("clearNotification")
    .addEventListener("click", () => {

        document.getElementById("notification-id").value = "";
        document.getElementById("notification-title").value = "";
        document.getElementById("notification-message").value = "";
        document.getElementById("notification-date").value = "";
        document.getElementById("notification-time").value = "";

        document.getElementById("sendNotification").innerHTML =
            "💾 Save Draft";

        document.getElementById("editingBanner").style.display =
            "none";

        updatePreview();

    });

/* ============================
   INITIALIZE
============================ */

updatePreview();

await loadDrafts();
await updatePlannerStatus();
await initAnnouncementManager();
await initMeetupManager();
await initGraphicsManager();
await initTrainerManager();
await initSiteStatusDashboard();
