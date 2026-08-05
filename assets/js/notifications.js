// Load saved preferences
document.addEventListener("DOMContentLoaded", () => {

    const prefs = JSON.parse(
        localStorage.getItem("poketitans-alerts")
    ) || {};

    document.getElementById("meetups").checked = prefs.meetups ?? true;
    document.getElementById("gopass").checked = prefs.gopass ?? true;
    document.getElementById("events").checked = prefs.events ?? true;
    document.getElementById("codes").checked = prefs.codes ?? true;
    document.getElementById("news").checked = prefs.news ?? true;

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
