console.log("Script loaded");

document.addEventListener("DOMContentLoaded", async () => {

    try {

// ==========================
// MEET UPS
// ==========================

const meetupQuery = query(
    collection(db, "meetups"),
    orderBy("startDateTime", "asc")
);

const meetupSnapshot = await getDocs(meetupQuery);

const now = new Date();

const events = [];

meetupSnapshot.forEach(docSnapshot => {

    const event = docSnapshot.data();

    // Hide meetup after its end time
    if (
        event.endDateTime &&
        event.endDateTime.toDate() < now
    ) {
        return;
    }

    events.push({
        id: docSnapshot.id,
        ...event
    });

});


function formatMeetupDate(timestamp) {

    return timestamp
        .toDate()
        .toLocaleDateString(
            "en-US",
            {
                weekday: "long",
                month: "long",
                day: "numeric"
            }
        );

}


function formatMeetupTime(event) {

    const start =
        event.startDateTime
            .toDate()
            .toLocaleTimeString(
                "en-US",
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );

    if (
        !event.endTime ||
        !event.endDateTime
    ) {
        return start;
    }

    const end =
        event.endDateTime
            .toDate()
            .toLocaleTimeString(
                "en-US",
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );

    return `${start}–${end}`;

}


function getMeetupMapLink(location) {

    if (
        location ===
        "Pembroke Historical Society Museum"
    ) {

        return "https://www.google.com/maps/search/?api=1&query=Pembroke+Historical+Society+Museum+147+Center+Street+Pembroke+MA";

    }

    return (
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(location)
    );

}


// ==========================
// NEXT MEET UP
// ==========================

const eventCard =
    document.getElementById("event-card");


if (events.length === 0) {

    eventCard.innerHTML = `
        <div class="event-card">
            <p>
                No upcoming meetups scheduled.
            </p>
        </div>
    `;

} else {

    const nextEvent = events[0];

    const nextMapLink =
        getMeetupMapLink(
            nextEvent.location
        );

    const nextDate =
        formatMeetupDate(
            nextEvent.startDateTime
        );

    const nextTime =
        formatMeetupTime(
            nextEvent
        );


    eventCard.innerHTML = `

        <div class="event-card">

            <h3>
                ${nextEvent.title}
            </h3>

            <p>
                📅 ${nextDate}
            </p>

            <p>
                🕕 ${nextTime}
            </p>

            <p>
                📍
                <a
                    href="${nextMapLink}"
                    target="_blank"
                    class="event-link">

                    ${nextEvent.location}

                </a>
            </p>

            ${
                nextEvent.attendance
                    ? `<p>👥 ${nextEvent.attendance}</p>`
                    : ""
            }

            ${
                nextEvent.description
                    ? `<p>${nextEvent.description}</p>`
                    : ""
            }

            <img
                src="assets/images/today.png"
                class="today-counters"
                alt="Today's Featured Graphic"
                onerror="this.style.display='none';">

            ${
                nextEvent.link
                    ? `
                    <br>

                    <a
                        href="${nextEvent.link}"
                        target="_blank"
                        class="hero-button">

                        Join Campfire Meet Up

                    </a>
                    `
                    : ""
            }

        </div>

    `;

}


// ==========================
// UPCOMING MEET UPS
// ==========================

const upcomingContainer =
    document.getElementById(
        "upcoming-events-list"
    );


if (upcomingContainer) {

    upcomingContainer.innerHTML = "";

    const upcomingEvents =
        events.slice(1);


    if (upcomingEvents.length === 0) {

        upcomingContainer.innerHTML = `
            <p style="text-align:center;">
                No additional meetups scheduled.
            </p>
        `;

    } else {

        upcomingEvents.forEach(event => {

            const mapLink =
                getMeetupMapLink(
                    event.location
                );

            const eventDate =
                formatMeetupDate(
                    event.startDateTime
                );

            const eventTime =
                formatMeetupTime(
                    event
                );


            upcomingContainer.innerHTML += `

                <div class="event-card">

                    <h3>
                        ${event.title}
                    </h3>

                    <p>
                        📅 ${eventDate}
                    </p>

                    <p>
                        🕕 ${eventTime}
                    </p>

                    <p>
                        📍
                        <a
                            href="${mapLink}"
                            target="_blank"
                            class="event-link">

                            ${event.location}

                        </a>
                    </p>

                    ${
                        event.attendance
                            ? `<p>👥 ${event.attendance}</p>`
                            : ""
                    }

                    ${
                        event.description
                            ? `<p>${event.description}</p>`
                            : ""
                    }

                    ${
                        event.link
                            ? `
                            <br>

                            <a
                                href="${event.link}"
                                target="_blank"
                                class="hero-button">

                                Join Campfire Meet Up

                            </a>
                            `
                            : ""
                    }

                </div>

            `;

        });

    }

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
fetch("./data/announcement.json")
.then(response => response.json())
.then(data => {

    if(!data.enabled) return;

    document.getElementById("announcement-section").style.display="block";

    document.getElementById("announcement-title").textContent =
        "📢 " + data.title;

    document.getElementById("announcement-message").textContent =
        data.message;

    document.getElementById("announcement-date").textContent =
        "Posted " + data.date;

});
