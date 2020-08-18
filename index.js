const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");
const cron = require("node-cron");
const binance = require("node-binance-api")();

const bot = new Telegraf("1093840907:AAHd8jvFLeR0kgOVmHXoCDbw2xqgAYRGMWU", {
  username: "FinanzasHoy",
  channelMode: true,
});

const url = "https://www.dolar.blue/";
const urlBtc = "https://api-pub.bitfinex.com/v2/tickers?symbols=tBTCUSD";
let oficial = [];
let blue = [];
let btcPrice = "";

let channelId;
let cryptoRes = "";
let dollarsContext;

//#region Comandos del bot

//bot.hears("/btc", (ctx) => {
bot.on("text", (ctx) => {
  channelId = ctx.update.channel_post.chat.id;
  console.log(channelId);

  //Cada hora tiempo se ejecuta este metodo
  taskCrypto.start();

  // A las 10, 12 y 15 horas se ejecuta
  taskDolar.start();
});

//cuando le decis /start al bot responde lo siguiente
bot.start((ctx) => {
  ctx.reply("Bienvenido! Elegi /dolar_blue, /dolar_oficial o /btc");
});

//#endregion
//-------------------------------------------------------------------------------//
//#region SetsTimers

const taskCrypto = cron.schedule(
  "* * 1 * * *",
  () => {
    console.log("Ejecutando taskCrypto");
    // Pido todos los pares con mayor volumen las ultimas 24hrs
    binance.prevDay(false, (error, prevDay) => {
      // Ordena segun volumen y filtro los 15 mayores
      prevDay.sort(
        (a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume)
      );
      prevDay = prevDay.filter((pair) => pair.symbol.indexOf("USDT") > 1);
      for (let obj of prevDay.slice(0, 15)) {
        let symbol = obj.symbol;
        let volume = parseInt(obj.quoteVolume);
        cryptoRes += `${symbol}  volume:${volume}  change: ${obj.priceChangePercent}%\n`;
      }
      console.log(cryptoRes);
      // Envia el mensaje al canal
      bot.telegram.sendMessage(channelId, cryptoRes);
    });
  },
  {
    scheduled: false,
  }
);

// Timer para lanzar los valores del dolar 3 veces por dia
let taskDolar = cron.schedule(
  "* * 10,12,15 * * *",
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

//#endregion
//-------------------------------------------------------------------------------//

// Deprecated
/*bot.hears("/btc", (ctx) => {
  console.log(ctx.update.channel_post.chat);
  axios
    .get(urlBtc)
    .then((rawJsonBtc) => {
      console.log(rawJsonBtc.data[0][1]);
      btcPrice = rawJsonBtc.data[0][1];
    })
    .then(() => {
      ctx.reply(`Bitcoin USD${btcPrice}$`);
      btcPrice = "";
    })
    .catch(() => {
      ctx.reply(`Hubo un error al intentar obtener los valores`);
    });
});*/

bot.launch();

// You can use the optional API parameters for getting historical CANDLESTICKS, these are useful if you want to import data from earlier back in time.
// Optional parameters: limit (max/default 500), startTime, endTime.
// Intervals: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
/*
binance.candlesticks(
  "BTCUSDT",
  "1h",
  (error, ticks, symbol) => {
    //console.info("candlesticks()", ticks);
    let last_tick = ticks[ticks.length - 1];
    let [
      time,
      open,
      high,
      low,
      close,
      volume,
      closeTime,
      assetVolume,
      trades,
      buyBaseVolume,
      buyAssetVolume,
      ignored,
    ] = last_tick;
    console.info(
      `${symbol} OPEN @ ${open} CLOSE @${close} su pico estuvo en ${high} y su valle en ${low}`
    );
  },
  { limit: 1, endTime: 1514764800000 }
);
*/
