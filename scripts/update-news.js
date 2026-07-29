const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser();

(async () => {

const feed = await parser.parseURL(
"RSS_FEED_GOES_HERE"
);

const news = feed.items.slice(0,5).map(item => ({

title: item.title,

link: item.link,

date: item.pubDate,

image:
item.enclosure?.url || "",

description:
item.contentSnippet || ""

}));

fs.writeFileSync(
"data/news.json",
JSON.stringify({news},null,2)
);

})();
