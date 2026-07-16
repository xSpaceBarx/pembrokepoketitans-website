console.log("Script loaded");

document.addEventListener("DOMContentLoaded", async () => {

    try {

        const response = await fetch("./data/events.json");
        const data = await response.json();

        const events = data.events;

        // ---------- NEXT EVENT ----------

        const nextEvent = events[0];

        document.getElementById("event-card").innerHTML = `
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

        // ---------- UPCOMING EVENTS ----------

        const upcomingContainer = document.getElementById("upcoming-events-list");
console.log("Upcoming container:", upcomingContainer);
console.log("Events array:", events);
        upcomingContainer.innerHTML = "";

        events.slice(1).forEach(event => {

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
                    <p>👥 ${event.attendance}</p>
                    <p>${event.description}</p>

                </div>
            `;
        });

    } catch (err) {

        console.error(err);

        document.getElementById("event-card").innerHTML =
            "<p>Unable to load events.</p>";

    }

});
// ---------- RAIDS ----------

const raidResponse = await fetch("./data/raids.json");
const raidData = await raidResponse.json();

const raidContainer = document.getElementById("raid-container");

raidContainer.innerHTML = "";

raidData.raids.forEach(raid => {

    raidContainer.innerHTML += `
        <div class="raid-card">

            <h3>${raid.type}</h3>

            <p class="raid-date">${raid.date}</p>

            <img src="${raid.image}"
                 alt="${raid.type}"
                 class="raid-image">

        </div>
    `;

});
