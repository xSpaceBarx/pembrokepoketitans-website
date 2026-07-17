console.log("Resources page loaded");

document.addEventListener("DOMContentLoaded", async () => {

    try {

        const response = await fetch("./data/resources.json");

        if (!response.ok) {
            throw new Error("Unable to load resources.json");
        }

        const data = await response.json();

        buildQuickGuides(data.quickGuides);
        buildCards("websites-container", data.websites, "Visit Website");
        buildCards("podcasts-container", data.podcasts, "Listen");
        buildCards("socials-container", data.socials, "Visit Profile");

    }

    catch (error) {

        console.error(error);

        document.getElementById("quick-guides-container").innerHTML =
            "<p>Unable to load resources.</p>";

    }

});

// ==========================
// QUICK GUIDES
// ==========================

function buildQuickGuides(guides) {

    const container = document.getElementById("quick-guides-container");

    container.innerHTML = "";

    guides.forEach(guide => {

        const card = document.createElement("div");

        card.className = "resource-image-card";

        let imageHtml = `
            <img
                src="${guide.image}"
                alt="${guide.title}"
                class="resource-image">
        `;

        if (guide.link) {

            imageHtml = `
                <a href="${guide.link}" target="_blank">
                    ${imageHtml}
                </a>
            `;

        }

        card.innerHTML = `
            ${imageHtml}
            <h3>${guide.title}</h3>
        `;

        container.appendChild(card);

    });

}

// ==========================
// CARD SECTIONS
// ==========================

function buildCards(containerId, items, buttonText) {

    const container = document.getElementById(containerId);

    container.innerHTML = "";

    items.forEach(item => {

        const card = document.createElement("div");

        card.className = "event-card";

        card.innerHTML = `

            <h3>
                <a
                    href="${item.url}"
                    target="_blank"
                    class="event-link">

                    ${item.title}

                </a>
            </h3>

            <p>${item.description}</p>

            <br>

            <a
                href="${item.url}"
                target="_blank"
                class="hero-button">

                ${buttonText}

            </a>

        `;

        container.appendChild(card);

    });

}
