const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

(async () => {

const url =
"https://pokemongohub.net/post/category/news/";

const {data} = await axios.get(url);

const $ = cheerio.load(data);

const news=[];

$("article").slice(0,5).each((i,el)=>{

news.push({

title:$(el).find("h2").text().trim(),

url:$(el).find("a").attr("href"),

image:$(el).find("img").attr("src"),

date:$(el).find("time").text().trim()

});

});

fs.writeFileSync(
"data/news.json",
JSON.stringify({news},null,2)
);

})();
