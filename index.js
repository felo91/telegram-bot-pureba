const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");
const cron = require("node-cron");
const binance = require("node-binance-api")();

const TOKEN = "1093840907:AAHd8jvFLeR0kgOVmHXoCDbw2xqgAYRGMWU";
const channelId = -1001442441694;

const bot = new Telegraf(TOKEN, {
  username: "FinanzasHoy",
  channelMode: true,
});

const url = "https://www.dolar.blue/";
const urlBtc = "https://api-pub.bitfinex.com/v2/tickers?symbols=tBTCUSD";
let oficial = [];
let blue = [];

let cryptoRes = "";

bot.on("text", (ctx) => {
  if (ctx.update.channel_post.text == "/usd") {
    // Obtiene el valor de los dolares sincronicamente
    getDollars();
  } else if (ctx.update.channel_post.text == "/status") {
    // Obtiene el valor de las crypto sincronicamente
    getCryptos();
  }
});

// A las 9:50, 11:50 y 14:50 horas se ejecuta
const cronTaskDolar = cron.schedule(
  "50 9,11,14 * * *",
  () => {
    getDollars();
  },
  {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires",
  }
);

// Cada hora tiempo se ejecuta este metodo
const cronTaskCryptos = cron.schedule("5 * * * *", () => {
  console.log("Ejecutando cronTaskCryptos");
  getCryptos();
});

function getDollars() {
  axios
    .get(url)
    .then((urlResponse) => {
      const $ = cheerio.load(urlResponse.data);
      // Se guardan los datos sacados de la web en el array "oficial"
      $("p.price").each((i, element) => {
        oficial.push($(element).html());
      });
      // Se guardan los datos sacados de la web en el array "blue"
      $("p.price-blue").each((i, element) => {
        blue.push($(element).html());
      });
    })
    .then(() => {
      // Una vez obtenidos los datos se envia el mensaje
      bot.telegram.sendMessage(
        channelId,
        `OFICIAL compra: ${oficial[0]}$ venta: ${oficial[1]}$ promedio: ${oficial[2]}$ 
BLUE compra: ${blue[0]}$ venta: ${blue[1]}$ promedio: ${blue[2]}$`
      );
      oficial = [];
      blue = [];
    })
    .catch(() => {
      ctx.reply(`Hubo un error al intentar obtener los valores`);
    });
}

function getCryptos() {
  binance.prevDay(false, (error, prevDay) => {
    // Ordena segun volumen y filtro los 15 mayores
    prevDay.sort(
      (a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume)
    );
    prevDay = prevDay.filter((pair) => pair.symbol.indexOf("USDT") > 1);
    setCryptosMessage(prevDay);
    console.log(cryptoRes);
    // Envia el mensaje al canal
    bot.telegram.sendMessage(channelId, cryptoRes);
    cryptoRes = "";
  });
}

function setCryptosMessage(prevDay) {
  for (let obj of prevDay.slice(0, 15)) {
    let symbol = obj.symbol.slice(0, obj.symbol.indexOf("USDT"));
    //let symbol = obj.symbol;
    let volume =
      parseInt(obj.quoteVolume) > 1000000
        ? parseInt(parseInt(obj.quoteVolume) / 1000000) + "M"
        : obj.quoteVolume;
    let price = Math.round(obj.lastPrice * 10) / 10;
    cryptoRes += `${symbol} $${price} vol: ${volume}  change: ${obj.priceChangePercent}%\n`;
  }
}

bot.launch();
