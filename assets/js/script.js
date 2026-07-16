console.log("Script loaded");

document.addEventListener("DOMContentLoaded", async () => {

    const eventCard = document.getElementById("event-card");

    eventCard.innerHTML = "<p>Trying to load event...</p>";

    try {

        const response = await fetch("./data/events.json");

        console.log("Response:", response);

        const data = await response.json();

        console.log("Data:", data);

        eventCard.innerHTML = `
            <div class="event-card">
                <h3>
    <a href="${data.nextEvent.link}" target="_blank" class="event-link">
        ${data.nextEvent.title}
    </a>
</h3>
                <p>📅 ${data.nextEvent.date}</p>
                <p>🕕 ${data.nextEvent.time}</p>
                <p>📍 ${data.nextEvent.location}</p>
                <p>👥 ${data.nextEvent.attendance}</p>
                <p>${data.nextEvent.description}</p>
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
