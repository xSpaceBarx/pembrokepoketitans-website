import { loadDrafts } from "./draftQueue.js";
import { saveNotification } from "./notifications-admin.js";

const templates = {

    meetup: {

        title: "📍 Campfire Meetup Reminder",

        message:
`Don't forget tonight's PokéTitans meetup!

📍 Pembroke Historical Society
🕠 Meetup begins at 5:45 PM

We hope to see you there!`,

        audience: "meetups"

    },

    raidhour: {

        title: "⚡ Raid Hour Tonight!",

        message:
`Raid Hour starts tonight!

Meet us at the Pembroke Historical Society at 5:45 PM.

Let's raid together!`,

        audience: "meetups"

    },

    gopass: {

        title: "🎟 GO Pass Reminder",

        message:
`Don't forget to collect today's GO Pass rewards before they expire!`,

        audience: "gopass"

    },

    trinket: {

        title: "🍀 Lucky Trinket Reminder",

        message:
`Remember to collect your Lucky Trinket before midnight tonight!`,

        audience: "gopass"

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

/* =======================================
   LIVE PREVIEW
======================================= */

function updatePreview(){

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

/* =======================================
   TEMPLATE BUTTONS
======================================= */

document.querySelectorAll(".template-btn").forEach(button => {

    button.addEventListener("click", () => {

        const template = templates[button.dataset.template];

        document.getElementById("notification-title").value =
            template.title;

        document.getElementById("notification-message").value =
            template.message;

        document.getElementById("notification-audience").value =
            template.audience;

        updatePreview();

    });

});

/* =======================================
   WEEKLY PLANNER
======================================= */

document.querySelectorAll(".planner-load").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelector(
            `.template-btn[data-template="${button.dataset.template}"]`
        ).click();

        window.scrollTo({

            top:
                document.querySelector(".notification-center").offsetTop - 20,

            behavior:"smooth"

        });

    });

});

/* =======================================
   SAVE DRAFT
======================================= */

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

    loadDrafts();

});

/* =======================================
   PUBLISH (Coming Soon)
======================================= */

document
.getElementById("publishNotification")
.addEventListener("click",()=>{

    alert(
`🚀 Publishing

Direct publishing is coming soon.

For now, save your notification as a draft.`
    );

});

/* =======================================
   INITIALIZE
======================================= */

updatePreview();

loadDrafts();
