const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const { fetchAllProducts } = require("./utils/woocommerceClient"); // your existing function

function startStockNotifier(client) {
  // Every 2 hours
  cron.schedule("0 */2 * * *", () => {
    checkAndNotifyStock(client);
  });
}

async function checkAndNotifyStock(client) {
  try {
    console.log("[StockNotifier] Running stock check...");

    const allProducts = await fetchAllProducts();
    const outOfStock = allProducts.filter(
      (p) =>
        p.stock_status === "outofstock" ||
        p.stock_quantity !== null ||
        p.stock_quantity < 10
    );

    if (outOfStock.length === 0) {
      console.log("[StockNotifier] No products out of stock.");
      return;
    }

    // Prepare embed
    const embed = new EmbedBuilder()
      .setTitle("⚠️ Out of Stock Products")
      .setDescription(
        outOfStock
          .map(
            (p, i) =>
              `${i + 1}. \`${p.name}\` (Quantity: ${
                p.stock_quantity || "Out Of Stock"
              })`
          )
          .join("\n")
      )
      .setColor("Red");

    const channel = client.channels.cache.get(
      process.env.STOCK_NOTIFIER_CHANNEL_ID
    );

    if (!channel) {
      console.warn(
        "[StockNotifier] Channel not found. Check STOCK_NOTIFIER_CHANNEL_ID."
      );
      return;
    }

    await channel.send({ embeds: [embed] });

    console.log(
      `[StockNotifier] Sent notification for ${outOfStock.length} products.`
    );
  } catch (err) {
    console.error(err);
  }
}

module.exports = { startStockNotifier, checkAndNotifyStock };
