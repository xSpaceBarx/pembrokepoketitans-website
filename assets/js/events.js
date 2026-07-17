console.log("Event Hub loaded");

document.addEventListener("DOMContentLoaded", async () => {

    try {

        const response = await fetch("./data/eventhub.json");

        if (!response.ok) {

            throw new Error("Unable to load eventhub.json");

        }

        const data = await response.json();

        // ==========================
        // Last Updated
        // ==========================

        document.getElementById("last-updated").innerHTML =
            `Last Updated: ${data.lastUpdated}`;

        // ==========================
        // Event Cards
        // ==========================

        const container = document.getElementById("eventhub-container");

        container.innerHTML = "";

        for (const event of data.events) {

            const imageExists = await new Promise(resolve => {

                const img = new Image();

                img.onload = () => resolve(true);

                img.onerror = () => resolve(false);

                img.src = event.image;

            });

            // Skip this event if image doesn't exist

            if (!imageExists) continue;

            container.innerHTML += `

                <div class="event-card">

                    <h2 class="section-title">

                        ${event.title}

                    </h2>

                    <img
                        src="${event.image}"
                        alt="${event.alt}"
                        class="current-event-image">

                </div>

                <br><br>

            `;

        }

    }

    catch (error) {

        console.error(error);

        document.getElementById("eventhub-container").innerHTML =

            "<p>Unable to load Event Hub.</p>";

    }

});
