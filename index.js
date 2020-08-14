const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");
const cron = require("node-cron");
const binance = require("node-binance-api")();

const bot = new Telegraf("1093840907:AAHd8jvFLeR0kgOVmHXoCDbw2xqgAYRGMWU", {
  username: "FinanzasHoy",
  channelMode: false,
});

const url = "https://www.dolar.blue/";
const urlBtc = "https://api-pub.bitfinex.com/v2/tickers?symbols=tBTCUSD";
let oficial = [];
let blue = [];
let btcPrice = "";

let cryptoContext;
let cryptoRes = "";
let dollarsContext;

//#region Comandos del bot

//cuando le decis /start al bot responde lo siguiente
bot.start((ctx) => {
  ctx.reply("Bienvenido! Elegi /dolar_blue, /dolar_oficial o /btc");
});

//responde a /dolar oficial
bot.hears("/dolar_oficial", (ctx) => {
  getDollars(true, false, ctx);
});
bot.hears("/dolar_blue", (ctx) => {
  getDollars(false, true, ctx);
});
bot.hears("/subscribe_crypto", (ctx) => {
  setCronCryto(true, ctx);
});

bot.hears("/unsubscribe_crypto", (ctx) => {
  setCronCryto(false, ctx);
});

bot.hears("/subscribe_dolar", (ctx) => {
  setCronDollars(true, ctx);
});

bot.hears("/unsubscribe_dolar", (ctx) => {
  setCronDollars(false, ctx);
});
//#endregion
//-------------------------------------------------------------------------------//
//#region SetsTimers

// timer para lanzar los valores de los 15 pares con mas volumen
let taskCrypto = cron.schedule(
  "*/1 * * * *",
  () => {
    console.log("running a task every 1 minute");

    // Pido los pares con mayor volumen las ultimas 24hrs
    binance.prevDay(false, (error, prevDay) => {
      // console.info(prevDay); // view all data
      prevDay.sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume));
      //console.info(prevDay); // view all data
      for (let obj of prevDay.slice(1, 16)) {
        let symbol = obj.symbol;
        let volume = parseInt(obj.volume);
        cryptoRes +=
          symbol +
          " volume:" +
          volume +
          " change: " +
          obj.priceChangePercent +
          "%\n";
      }
      cryptoContext.reply(cryptoRes);
    });
  },
  {
    scheduled: false,
  }
);

// timer para lanzar los valores del dolar 3 veces por dia
let taskDolar = cron.schedule(
  "*/30 * * * * *",
  () => {
    getDollars(true, true, false);
  },
  {
    scheduled: false,
    timezone: "America/Argentina/Buenos_Aires",
  }
);

// Se suscribe o desuscribe a cryptoNews
function setCronCryto(isSuscribe, ctx) {
  cryptoContext = ctx;
  if (isSuscribe) {
    taskCrypto.start();
    cryptoContext.reply(
      "Ahora estas subscripcion a cryptoNews a cada hora recibiras los 15 pares con mayor volumen"
    );
  } else {
    taskCrypto.stop();
    cryptoContext.reply("Te has dado de baja de la subscripcion a cryptoNews");
  }
}

// Se suscribe o desuscribe a dollarsNews
function setCronDollars(isSuscribe, ctx) {
  dollarsContext = ctx;
  if (isSuscribe) {
    taskDolar.start();
    dollarsContext.reply(
      "Ahora estas subscripcion a dollarsNews tres veces por dia recibiras la cotizacion del dolar oficial/blue"
    );
  } else {
    taskDolar.stop();
    dollarsContext.reply(
      "Te has dado de baja de la subscripcion a dollarsNews"
    );
  }
}
//#endregion
//-------------------------------------------------------------------------------//
// funcion auxiliar
function getDollars(isOficial, isBlue, ctx) {
  axios
    .get(url)
    .then((urlResponse) => {
      const $ = cheerio.load(urlResponse.data);
      // Guardo los datos sacados de la web en el array "oficial"
      $("p.price").each((i, element) => {
        oficial.push($(element).html());
      });
      // Guardo los datos sacados de la web en el array "blue"
      $("p.price-blue").each((i, element) => {
        blue.push($(element).html());
      });
    })
    .then(() => {
      if (!ctx) ctx = dollarsContext;
      if (isOficial) {
        ctx.reply(
          `OFICIAL compra: ${oficial[0]}$ venta: ${oficial[1]}$ promedio: ${oficial[2]}$`
        );
      }
      if (isBlue) {
        ctx.reply(
          `BLUE compra: ${blue[0]}$ venta: ${blue[1]}$ promedio: ${blue[2]}$`
        );
      }
      oficial = [];
      blue = [];
    })
    .catch(() => {
      ctx.reply(`Hubo un error al intentar obtener los valores`);
    });
}

bot.hears("/btc", (ctx) => {
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
});

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
