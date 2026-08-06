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

        title: "",

        message: "",

        audience: "news"

    }

};

document.querySelectorAll(".template-btn").forEach(button => {

    button.addEventListener("click", () => {

        const template = templates[button.dataset.template];

        document.getElementById("notification-title").value =
            template.title;

        document.getElementById("notification-message").value =
            template.message;

        document.getElementById("notification-audience").value =
            template.audience;

    });

});

document
.getElementById("previewNotification")
.addEventListener("click", () => {

    alert(

`📢 Preview

Title:

${document.getElementById("notification-title").value}

-----------------------

${document.getElementById("notification-message").value}`

    );

});

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
document.querySelectorAll(".planner-load").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelector(
            `.template-btn[data-template="${button.dataset.template}"]`
        ).click();

        window.scrollTo({
            top: document.querySelector(".notification-center").offsetTop - 30,
            behavior: "smooth"
        });

    });

});
import { loadDrafts } from "./draftQueue.js";

loadDrafts();
