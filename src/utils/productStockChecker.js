const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const { fetchAllProducts } = require("./woocommerceClient");

function startStockNotifier(client) {
  // Every 2 hours
  cron.schedule("0 */2 * * *", () => {
    checkAndNotifyStock(client);
  });
}

function createStockEmbeds(outOfStock) {
  const embeds = [];
  let currentChunk = "";
  let index = 1;

  for (const p of outOfStock) {
    const line = `${index}. \`${p.name}\` (Quantity: ${
      p.stock_quantity ?? "Out Of Stock"
    })\n`;

    // If adding this line would exceed safe limit → push current embed and start new one
    if ((currentChunk + line).length > 3500) {
      embeds.push(
        new EmbedBuilder()
          .setTitle("⚠️ Out of Stock Products")
          .setDescription(currentChunk)
          .setColor("Red")
      );
      currentChunk = "";
    }

    currentChunk += line;
    index++;
  }

  // Push the final chunk
  if (currentChunk.length > 0) {
    embeds.push(
      new EmbedBuilder()
        .setTitle("⚠️ Out of Stock Products")
        .setDescription(currentChunk)
        .setColor("Red")
    );
  }

  return embeds;
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
    const embeds = createStockEmbeds(outOfStock);

    const channel = client.channels.cache.get(
      process.env.STOCK_NOTIFIER_CHANNEL_ID
    );

    if (!channel) {
      console.warn(
        "[StockNotifier] Channel not found. Check STOCK_NOTIFIER_CHANNEL_ID."
      );
      return;
    }

    await channel.send({ embeds: [embeds] });

    console.log(
      `[StockNotifier] Sent notification for ${outOfStock.length} products.`
    );
  } catch (err) {
    console.error(err);
  }
}

module.exports = { startStockNotifier, checkAndNotifyStock };
