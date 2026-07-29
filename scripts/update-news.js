const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser();

(async () => {

const axios = require("axios");

const response = await axios.get(
    "https://api.rss2json.com/v1/api.json?rss_url=https://pokemongohub.net/feed"
);

const news = response.data.items.slice(0,5).map(item => ({

    title: item.title,

    link: item.link,

    date: item.pubDate,

    description: item.description
        .replace(/<[^>]*>/g,"")
        .substring(0,140) + "...",

    image: item.thumbnail

}));

    const news = feed.items
        .slice(0,5)
        .map(item => ({

            title: item.title,

            link: item.link,

            date: item.pubDate,

            description: item.contentSnippet,

            image:
                item.enclosure?.url ||
                ""

        }));

    fs.writeFileSync(
        "data/news.json",
        JSON.stringify({ news }, null, 2)
    );

})();
