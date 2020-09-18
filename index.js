const Binance = require('node-binance-api');
var map = require('collection-map');
const cron = require("node-cron");
const { Telegraf } = require("telegraf");
const moment = require('moment')
const fs = require('fs');
let jsonData = require('./persistence.json');

test = true

upchart = `\u{1F4C8}`
downchart = `\u{1F4C9}`

const bot = new Telegraf(process.env.BOT_TOKEN, {
    username: "FinanzasHoy",
    channelMode: true,
});

const binance = new Binance().options({
    APIKEY: process.env.APIKEY,
    APISECRET: process.env.APISECRET
});


//Prod
let channelId = process.env.CHANNEL_ID
//Test
let testChannelId = process.env.TEST_CHANNEL_ID


function sendMessageToChannel(message) {
    if (test) {
        bot.telegram.sendMessage(testChannelId, message, { parse_mode: 'HTML' });
    } else {
        bot.telegram.sendMessage(channelId, message, { parse_mode: 'HTML' });
    }
    bot.telegram.sendMessage(channelId, message, { parse_mode: 'HTML' });

    console.log(message)
}

var res = new Map();
var percentage = new Map();
var coinsMap = new Map();
var finalMap = new Map();
var updateMap = new Map()
var notificationMap = new Map()

var coinPer = new Map();

var coinInfo = {}


global.ticker = {};

// Get 24h price change statistics for all symbols
binance.websockets.prevDay(false, function(error, obj) {
    global.ticker[obj.symbol] = obj;
    //console.log(obj)
    if (coinsMap.has(obj.symbol)) {
        var coin = {}
        coin.volume = coinsMap.get(obj.symbol).quoteVolume
        coin.percentage = obj.percentChange
        coin.price = obj.bestBid
        coin.symbol = obj.symbol
        finalMap.set(obj.symbol, coin)
    }
});

binance.websockets.miniTicker(markets => {
    //console.log(markets)
    markets = Object.keys(markets).filter(key => key.indexOf("USDT") > 1).reduce((obj, key) => {
        obj[key] = markets[key];
        return obj;
    }, {});
    for (var i in markets) {
        res.set(i, markets[i].quoteVolume)
        coinsMap.set(i, markets[i])
    }
});

function trimName(coin) {
    var value = {}
    if (symbol.indexOf("USDT") > 1) {
        value.symbol = symbol.slice(0, coin.symbol.indexOf("USDT"));
        value.pair = "USDT"
    } else if (symbol.indexOf("BTC") > 1) {
        value.symbol = symbol.slice(0, coin.symbol.indexOf("BTC"));
        value.pair = "BTC"
    }
    if (symbol.indexOf("ETH") > 1) {
        value.symbol = symbol.slice(0, coin.symbol.indexOf("ETH"));
        value.pair = "ETH"
    }
}

function orderByPercentage(coinMap) {
    var mapAsc = new Map([...coinMap].sort(
        (a, b) => parseFloat(coinMap.get(b[0]).percentage) - parseFloat(coinMap.get(a[0]).percentage)
    ));
    return mapAsc
}

cron.schedule("*/3 * * * * *", function() {
    var mapAsc = orderByPercentage(finalMap);
    //console.log(mapAsc)
    var b = [...mapAsc].slice(0, 15)
    var send = false
    var message = "Coin Trading Update\n"
    for (i in b) {
        coin = b[i][1]
        icon = upchart
        if (Math.abs(parseFloat(coin.percentage)) > 5) {
            if (jsonData[coin.symbol] != undefined) {
                if (coin.price / jsonData[coin.symbol].price > 0.95 && coin.price / jsonData[coin.symbol].price < 1.05) {
                    continue
                }
                if (coin.price < jsonData[coin.symbol].price) {
                    icon = downchart
                }
            }
            var now = moment();
            var updated = false
            if (jsonData[coin.symbol] != undefined) {
                notification = jsonData[coin.symbol]
                t = moment(notification.updated, "DD MM YYYY HH:mm:ss")
                if (now.diff(t, 'seconds') < 3) {
                    updated = true
                }
            }
            if (!updated) {
                let symbol = coin.symbol.slice(0, coin.symbol.indexOf("USDT"));
                let volume = parseInt(coin.volume) > 1000000 ? parseInt(parseInt(coin.volume) / 1000000) + "M" : coin.volume;
                volume = Math.round(coin.volume);
                let price = Math.round(coin.price * 100) / 100;
                let percentage = Math.round(coin.percentage * 100) / 100;
                message += (`${icon} ${symbol} $${price} 24HVol: ${volume} ${percentage}%\n`)
                send = true
                notification = {}
                notification.updated = now.format('DD MM YYYY HH:mm:ss')
                notification.percentage = coin.percentage
                notification.price = coin.price
                jsonData[coin.symbol] = notification
                let data = JSON.stringify(jsonData, null, 2);
                fs.writeFile('persistence.json', data, (err) => {
                    if (err) throw err;
                    console.log('Data written to file');
                });
            }
        }
    }
    if (send) {
        sendMessageToChannel(message)
    }

    //console.log("---ticker---");
});