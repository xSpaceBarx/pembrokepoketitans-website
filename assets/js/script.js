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

        // ==========================
        // NEXT MEET UP
        // ==========================

        const nextEvent = events[0];

        let nextMapLink;

        if (nextEvent.location === "Pembroke Historical Society Museum") {

            nextMapLink =
                "https://www.google.com/maps/search/?api=1&query=Pembroke+Historical+Society+Museum+147+Center+Street+Pembroke+MA";

        } else {

            nextMapLink =
                "https://www.google.com/maps/search/?api=1&query=" +
                encodeURIComponent(nextEvent.location);

        }

        document.getElementById("event-card").innerHTML = `

            <div class="event-card">

                <h3>${nextEvent.title}</h3>

                <p>📅 ${nextEvent.date}</p>

                <p>🕕 ${nextEvent.time}</p>

                <p>
                    📍
                    <a
                        href="${nextMapLink}"
                        target="_blank"
                        class="event-link">

                        ${nextEvent.location}

                    </a>
                </p>
<p>👥 ${nextEvent.attendance}</p>

<p>${nextEvent.description}</p>

<div id="today-feature">

    <img
        src="assets/images/today.png"
        class="today-counters"
        alt="Today's Featured Graphic"
        onerror="this.parentElement.style.display='none';">

</div>

<br>

<a
    href="${nextEvent.link}"
    target="_blank"
    class="hero-button">

    Join Campfire Meet Up

</a>

            </div>

        `;

        // ==========================
        // UPCOMING MEET UPS
        // ==========================

        const upcomingContainer =
            document.getElementById("upcoming-events-list");

        if (upcomingContainer) {

            upcomingContainer.innerHTML = "";

            events.slice(1).forEach(event => {

                let mapLink;

                if (event.location === "Pembroke Historical Society Museum") {

                    mapLink =
                        "https://www.google.com/maps/search/?api=1&query=Pembroke+Historical+Society+Museum+147+Center+Street+Pembroke+MA";

                } else {

                    mapLink =
                        "https://www.google.com/maps/search/?api=1&query=" +
                        encodeURIComponent(event.location);

                }

                upcomingContainer.innerHTML += `

                    <div class="event-card">

                        <h3>${event.title}</h3>

                        <p>📅 ${event.date}</p>

                        <p>🕕 ${event.time}</p>

                        <p>
                            📍
                            <a
                                href="${mapLink}"
                                target="_blank"
                                class="event-link">

                                ${event.location}

                            </a>
                        </p>

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

        const raidContainer =
            document.getElementById("raid-container");

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

        const raidContainer =
            document.getElementById("raid-container");

        if (raidContainer) {

            raidContainer.innerHTML =
                "<p>Unable to load raid information.</p>";

        }

    }

});
