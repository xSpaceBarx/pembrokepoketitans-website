console.log("Script loaded");document.addEventListener("DOMContentLoaded", () => {

    fetch("data/events.json")
        .then(response => response.json())
        .then(data => {

            const event = data.nextEvent;

            document.getElementById("event-card").innerHTML = `
                <div class="event-card">
                    <h3>${event.title}</h3>

                    <p><strong>📅</strong> ${event.date}</p>

                    <p><strong>🕕</strong> ${event.time}</p>

                    <p><strong>📍</strong> ${event.location}</p>

                    <p><strong>👥</strong> ${event.attendance}</p>

                    <p>${event.description}</p>
                </div>
            `;
        })
        .catch(error => {
            document.getElementById("event-card").innerHTML =
                "<p>Unable to load event information.</p>";

            console.error(error);
        });

});
