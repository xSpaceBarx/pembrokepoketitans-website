const axios = require("axios");
const fs = require("fs");

(async () => {

    const response = await axios.get(
        "https://pokemongohub.net/wp-json/wp/v2/posts?per_page=6&_embed"
    );

    const news = response.data.map(post => {

        let image = "";

        if (
            post._embedded &&
            post._embedded["wp:featuredmedia"] &&
            post._embedded["wp:featuredmedia"][0]
        ) {
            image = post._embedded["wp:featuredmedia"][0].source_url;
        }

        return {

            title: post.title.rendered,

            link: post.link,

            date: new Date(post.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
            }),

            description: post.excerpt.rendered
                .replace(/<[^>]*>/g, "")
                .replace(/\s+/g, " ")
                .trim(),

            image

        };

    });

    fs.writeFileSync(
        "data/news.json",
        JSON.stringify({ news }, null, 2)
    );

    console.log("Updated", news.length, "articles.");

})();
