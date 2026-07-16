console.log("Script loaded");

document.addEventListener("DOMContentLoaded", async () => {

    const eventCard = document.getElementById("event-card");

    eventCard.innerHTML = "<p>Trying to load event...</p>";

    try {

        const response = await fetch("./data/events.json");

        console.log("Response:", response);

        const data = await response.json();
        const events = data.events;
const nextEvent = events[0];

        console.log("Data:", data);

        eventCard.innerHTML = `
            <div class="event-card">
                <h3>
    <a href="${nextEvent.link}" target="_blank" class="event-link">
        ${nextEvent.title}
    </a>
</h3>
                <p>📅 ${nextEvent.date}</p>
                <p>🕕 ${nextEvent.time}</p>
                <p>📍 ${nextEvent.location}</p>
                <p>👥 ${nextEvent.attendance}</p>
                <p>${nextEvent.description}</p>
            </div>
        `;

    } catch (err) {

        console.error(err);

        eventCard.innerHTML = `
            <h3 style="color:red;">ERROR</h3>
            <p>${err}</p>
        `;

    }

});
const upcomingContainer = document.getElementById("upcoming-events-list");

upcomingContainer.innerHTML = "";

events.slice(1, 3).forEach(event => {

    upcomingContainer.innerHTML += `
        <div class="event-card">
            <h3>
                <a href="${event.link}" target="_blank" class="event-link">
                    ${event.title}
                </a>
            </h3>

            <p>📅 ${event.date}</p>
            <p>🕕 ${event.time}</p>
            <p>📍 ${event.location}</p>
            <p>${event.description}</p>
        </div>
    `;

});
