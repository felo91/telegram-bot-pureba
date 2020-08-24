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
  if (!channelId) {
    channelId =
      ctx.update.channel_post != undefined
        ? ctx.update.channel_post.chat.id
        : "no soy un grupo";
    console.log(channelId);

    // Cada hora tiempo se ejecuta este metodo
    cronTaskCryptos.start();

    // A las 10, 12 y 15 horas se ejecuta
    cronTaskDolar.start();
  }
});

const cronTaskCryptos = cron.schedule(
  "1 * * * *",
  () => {
    console.log("Ejecutando cronTaskCryptos");
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
  },
  {
    scheduled: false,
  }
);

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

const cronTaskDolar = cron.schedule(
  "5 10,12,15 * * *",
  () => {
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
  },
  {
    scheduled: false,
    timezone: "America/Argentina/Buenos_Aires",
  }
);

bot.launch();
