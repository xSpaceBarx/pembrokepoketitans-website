const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser();

(async () => {

    const feed = await parser.parseURL(
        "https://pokemongohub.net/feed"
    );

    const news = feed.items.slice(0,5).map(item => ({

        title: item.title,

        link: item.link,

        date: item.pubDate,

        description: item.contentSnippet || "",

        image: ""

    }));

    fs.writeFileSync(
        "data/news.json",
        JSON.stringify({news}, null, 2)
    );

})();
