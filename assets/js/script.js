console.log("Script loaded");

document.addEventListener("DOMContentLoaded", async () => {

    try {

        // ==========================
        // MEET UPS
        // ==========================

        const eventResponse = await fetch("./data/events.json");

        if (!eventResponse.ok) {
            throw new Error("Unable to load events.json");
        }

        const eventData = await eventResponse.json();
        const events = eventData.events;

        // Next Meet Up

        const nextEvent = events[0];

        document.getElementById("event-card").innerHTML = `
            <div class="event-card">

                <h3>${nextEvent.title}</h3>

                <p>📅 ${nextEvent.date}</p>

                <p>🕕 ${nextEvent.time}</p>

              ${(() => {

    let mapLink;

    if (nextEvent.location === "Pembroke Historical Society Museum") {

        mapLink =
            "https://www.google.com/maps/search/?api=1&query=Pembroke+Historical+Society+Museum+147+Center+Street+Pembroke+MA";

    } else {

        mapLink =
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(nextEvent.location);

    }

    return `
        <p>📍 ${nextEvent.location}</p>

        <a
            href="${mapLink}"
            target="_blank"
            class="hero-button secondary-button">

            View Meetup Location

        </a>
    `;

})()}

                <p>👥 ${nextEvent.attendance}</p>

                <p>${nextEvent.description}</p>

                <br>

                <a
                    href="${nextEvent.link}"
                    target="_blank"
                    class="hero-button">

                    Join Campfire Meet Up

                </a>

            </div>
        `;

        // Upcoming Meet Ups

        const upcomingContainer = document.getElementById("upcoming-events-list");

        if (upcomingContainer) {

            upcomingContainer.innerHTML = "";

            events.slice(1).forEach(event => {

                upcomingContainer.innerHTML += `

                    <div class="event-card">

                        <h3>${event.title}</h3>

                        <p>📅 ${event.date}</p>

                        <p>🕕 ${event.time}</p>

                        ${(() => {

    let mapLink;

    if (event.location === "Pembroke Historical Society Museum") {

        mapLink =
            "https://www.google.com/maps/search/?api=1&query=Pembroke+Historical+Society+Museum+147+Center+Street+Pembroke+MA";

    } else {

        mapLink =
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(event.location);

    }

    return `
        <p>📍 ${event.location}</p>

        <a
            href="${mapLink}"
            target="_blank"
            class="hero-button secondary-button">

            View Meetup Location

        </a>
    `;

})()}

                        <p>👥 ${event.attendance}</p>

                        <p>${event.description}</p>

                        <br>

                        <a
                            href="${event.link}"
                            target="_blank"
                            class="hero-button">

                            Join Campfire Meet Up

                        </a>

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
            "<p>Unable to load meet ups.</p>";

        const raidContainer = document.getElementById("raid-container");

        if (raidContainer) {

            raidContainer.innerHTML =
                "<p>Unable to load raid information.</p>";

        }

    }

});
