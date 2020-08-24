const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");
const cron = require("node-cron");
const binance = require("node-binance-api")();

const bot = new Telegraf(TOKEN, {
  username: "FinanzasHoy",
  channelMode: true,
});

const url = "https://www.dolar.blue/";
const urlBtc = "https://api-pub.bitfinex.com/v2/tickers?symbols=tBTCUSD";
let oficial = [];
let blue = [];
let channelId;
let cryptoRes = "";

bot.on("text", (ctx) => {
  setChannelId(ctx);
});

function setChannelId(ctx) {
  if (!channelId) {
    channelId =
      ctx.update.channel_post != undefined
        ? ctx.update.channel_post.chat.id
        : "no soy un channel";
    console.log(`Channel ID =${channelId}`);
  }
}

// A las 9:50, 11:50 y 14:50 horas se ejecuta
const cronTaskDolar = cron.schedule(
  "50 9,11,14 * * *",
  () => {
    getDollars();
  },
  {
    timezone: "America/Argentina/Buenos_Aires",
  }
);

// Cada hora tiempo se ejecuta este metodo
const cronTaskCryptos = cron.schedule("5 * * * *", () => {
  console.log("Ejecutando cronTaskCryptos");
  getCryptos();
});

// Obtiene el valor de los dolares sincronicamente
bot.hears("/usd", (ctx) => {
  setChannelId(ctx);
  getDollars();
});

// Obtiene el valor de las crypto sincronicamente
bot.hears("/status", (ctx) => {
  setChannelId(ctx);
  getCryptos();
});

function getDollars() {
  if (channelId) {
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
}

function getCryptos() {
  if (channelId) {
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
}

function setCryptosMessage(prevDay) {
  for (let obj of prevDay.slice(0, 15)) {
    let symbol = obj.symbol.slice(0, obj.symbol.indexOf("USDT"));
    //let symbol = obj.symbol;
    let volume =
      parseInt(obj.quoteVolume) > 1000000
        ? parseInt(parseInt(obj.quoteVolume) / 1000000) + "M"
        : obj.quoteVolume;
    cryptoRes += `${symbol}  vol: ${volume}  change: ${obj.priceChangePercent}%\n`;
  }
}

bot.launch();
