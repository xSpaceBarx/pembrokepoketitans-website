import { loadDrafts } from "./draftQueue.js";
import { saveNotification } from "./notifications-admin.js";
import { updatePlannerStatus } from "./plannerStatus.js";
import { publishNotification } from "./publishNotification.js";

const templates = {

    meetup: {

        title: "📍 Campfire Meetup Reminder",

        message:
`Don't forget tonight's PokéTitans meetup!

📍 Pembroke Historical Society
🕠 Meetup begins at 6:00 PM

We hope to see you there!`,

        audience: "meetup"

    },

    raidhour: {

        title: "⚡ Raid Hour Tonight!",

        message:
`Raid Hour starts tonight!

⏰ 6:00–7:00 PM

Let's raid together!`,

        audience: "raidhour"

    },

    spotlight: {

        title: "✨ Spotlight Hour Tonight!",

        message:
`Spotlight Hour begins tonight!

⏰ 6:00–7:00 PM

Good luck, Trainers!`,

        audience: "spotlight"

    },

    maxmonday: {

        title: "💎 Max Monday Tonight!",

        message:
`Max Monday begins tonight!

Take on Max Battles with the community and earn those Max Particles!`,

        audience: "maxmonday"

    },

    raidrotation: {

        title: "🆕 New Raid Boss Rotation!",

        message:
`A brand new Raid Boss rotation is now live!

Check out what's appearing in Gyms!`,

        audience: "raidrotation"

    },

    raidday: {

        title: "⚔ Raid Day Today!",

        message:
`Raid Day is here!

Good luck, Trainers!`,

        audience: "raidday"

    },

    hatchday: {

        title: "🥚 Hatch Day Today!",

        message:
`It's Hatch Day!

Don't forget your Egg Incubators and enjoy the bonuses while the event is active.`,

        audience: "hatchday"

    },

    communityday: {

        title: "🎉 Community Day Today!",

        message:
`Community Day has begun!

Good luck catching today's featured Pokémon and enjoy all of the event bonuses!`,

        audience: "communityday"

    },

    globalevent: {

        title: "🌎 Global Event Begins!",

        message:
`Today's global Pokémon GO event is now live!

Check the Today View for bonuses, featured Pokémon and event tasks.

Have fun, Trainers!`,

        audience: "globalevent"

    },

    gopass: {

        title: "🎟 Daily Bonuses & GO Pass",

        message:
`Don't forget to collect today's Daily Bonuses and GO Pass rewards before they expire!`,

        audience: "gopass"

    },

    trinket: {

        title: "🍀 Lucky Trinket Reminder",

        message:
`Remember to use your Lucky Trinket before 8:00 PM tonight!`,

        audience: "trinket"

    },

    research: {

        title: "📦 New Special Research",

        message:
`New Special or Timed Research is now available!

Open Pokémon GO and start working through the new tasks.`,

        audience: "research"

    },

    codes: {

        title: "🎁 New Redemption Code",

        message:
`A new Pokémon GO redemption code is available!

Claim it before it expires.`,

        audience: "codes"

    },

    news: {

        title: "🚨 Pokémon GO Breaking News",

        message:
`Important Pokémon GO news will appear here.`,

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

document
.getElementById("notification-title")
.addEventListener("input", updatePreview);

document
.getElementById("notification-message")
.addEventListener("input", updatePreview);

/* ============================
   WEEKLY PLANNER
============================ */

document.querySelectorAll(".planner-item").forEach(card => {

    card.addEventListener("click", () => {

        const template = templates[card.dataset.template];

        if (!template) return;

        document.getElementById("notification-title").value =
            template.title;

        document.getElementById("notification-message").value =
            template.message;

        document.getElementById("notification-audience").value =
            template.audience;

        updatePreview();

        window.scrollTo({

            top:
                document.querySelector(".notification-center").offsetTop - 20,

            behavior: "smooth"

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

await saveNotification(notification,id);

document.getElementById("notification-id").value = "";

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

    if(!id){

        alert("Please save this notification as a draft first.");

        return;

    }

    await publishNotification(id);

    await loadDrafts();

    await updatePlannerStatus();

    alert("✅ Notification published successfully.");

});

/* ============================
   INITIALIZE
============================ */

updatePreview();

await loadDrafts();

await updatePlannerStatus();
document
.getElementById("clearNotification")
.addEventListener("click",()=>{

    document.getElementById("notification-id").value="";

    document.getElementById("notification-title").value="";

    document.getElementById("notification-message").value="";

    document.getElementById("notification-date").value="";

    document.getElementById("notification-time").value="";

    document.getElementById("sendNotification").innerHTML=
        "💾 Save Draft";

    document.getElementById("editingBanner").style.display="none";

    updatePreview();

});
