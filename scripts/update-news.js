const axios = require("axios");
const fs = require("fs");

(async () => {

    const response = await axios.get(
        "https://api.rss2json.com/v1/api.json?rss_url=https://pokemongohub.net/feed"
    );

    const news = response.data.items.slice(0,5).map(item => ({

        title: item.title,

        link: item.link,

        date: item.pubDate,

        description:
            item.description
                .replace(/<[^>]*>/g,"")
                .substring(0,140) + "...",

        image: item.thumbnail || ""

    }));

    fs.writeFileSync(
        "data/news.json",
        JSON.stringify({ news }, null, 2)
    );

    console.log("Updated " + news.length + " news articles.");

})();
