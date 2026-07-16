console.log("Script loaded");

document.addEventListener("DOMContentLoaded", async () => {

    try {

        // ==========================
        // EVENTS
        // ==========================

        const eventResponse = await fetch("./data/events.json");

        if (!eventResponse.ok) {
            throw new Error("Unable to load events.json");
        }

        const eventData = await eventResponse.json();
        const events = eventData.events;

        // Next Event
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

        // Upcoming Events
        const upcomingContainer = document.getElementById("upcoming-events-list");

        if (upcomingContainer) {

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

        }

        // ==========================
        // RAIDS
        // ==========================

        const raidResponse = await fetch("./data/raids.json");

        if (!raidResponse.ok) {
            throw new Error("Unable to load raids.json");
        }

        const raidData = await raidResponse.json();

        const raidContainer = document.getElementById("raid-container");

        if (raidContainer) {

            raidContainer.innerHTML = "";

            raidData.raids.forEach(raid => {

                raidContainer.innerHTML += `
                    <div class="raid-card">

                        <h3>${raid.type}</h3>

                        <p class="raid-date">${raid.date}</p>

                        <img
                            src="${raid.image}"
                            alt="${raid.type}"
                            class="raid-image">

                    </div>
                `;

            });

        }

    } catch (err) {

        console.error(err);

        document.getElementById("event-card").innerHTML =
            "<p>Unable to load events.</p>";

        const raidContainer = document.getElementById("raid-container");

        if (raidContainer) {
            raidContainer.innerHTML =
                "<p>Unable to load raid information.</p>";
        }

    }

});
