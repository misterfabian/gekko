import KrakenClient from "kraken-api";
import Functions from "firebase-functions";

const trade = async (client, pair, volume, price, close) => {
  const order = {
    pair: pair,
    type: "buy",
    ordertype: "limit",
    oflags: "post",
    volume: String(volume),
    price: String(price),
  };
  if (close) {
    order["close[ordertype]"] = "limit";
    order["close[price]"] = String(close);
  }
  const request = await client.api("AddOrder", order);
  console.info(request["result"]["descr"]["order"]);
};

export const accumulator = Functions.runWith({
  secrets: ["KRAKEN_API_KEY", "KRAKEN_API_SECRET"],
})
  .pubsub.schedule("every day 06:00")
  .timeZone("UTC")
  .onRun(async (_) => {
    const client = new KrakenClient(
      process.env.KRAKEN_API_KEY,
      process.env.KRAKEN_API_SECRET
    );
    const pair = "BTCUSD";
    const ticker = await client.api("Ticker", { pair });
    const bid = ticker["result"][pair]["b"][0];
    const value = 1000;
    const price = (parseFloat(bid) * 0.999).toFixed(1);
    const volume = (value / price).toFixed(9);
    trade(client, pair, volume, price);
  });

export const trader = Functions.runWith({
  secrets: ["KRAKEN_API_KEY", "KRAKEN_API_SECRET"],
})
  .pubsub.schedule("every 10 minutes")
  .onRun(async (_) => {
    const client = new KrakenClient(
      process.env.KRAKEN_API_KEY,
      process.env.KRAKEN_API_SECRET
    );
    const orders = await client.api("OpenOrders");
    if (Object.keys(orders["result"]["open"]).length < 1) {
      const pair = "ALGOUSD";
      const value = 1000;
      const price = 0.311;
      const volume = (value / price).toFixed();
      const close = (price * 1.01).toFixed(5);
      trade(client, pair, volume, price, close);
    }
  });
