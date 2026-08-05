// Load saved preferences
document.addEventListener("DOMContentLoaded", () => {

    const defaultPreferences = {
    meetups: true,
    gopass: true,
    events: true,
    codes: true,
    news: true
};

const savedPreferences = JSON.parse(
    localStorage.getItem("poketitans-alerts")
);

const prefs = savedPreferences || defaultPreferences;

document.getElementById("meetups").checked = prefs.meetups;
document.getElementById("gopass").checked = prefs.gopass;
document.getElementById("events").checked = prefs.events;
document.getElementById("codes").checked = prefs.codes;
document.getElementById("news").checked = prefs.news;
    document.getElementById("save-alerts").onclick = function () {

        const preferences = {
            meetups: document.getElementById("meetups").checked,
            gopass: document.getElementById("gopass").checked,
            events: document.getElementById("events").checked,
            codes: document.getElementById("codes").checked,
            news: document.getElementById("news").checked
        };

        localStorage.setItem(
            "poketitans-alerts",
            JSON.stringify(preferences)
        );

        document.getElementById("save-status").innerHTML =
            "✅ Preferences Saved";
    };

});
