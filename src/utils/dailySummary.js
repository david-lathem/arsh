// dailySummary.js
const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const Order = require("../models/order"); // Adjust path if needed

const DAILY_LOG_CHANNEL_ID = process.env.DAILY_LOG_CHANNEL_ID;

// Function to send daily summary
async function sendDailySummary(client) {
  try {
    const channel = await client.channels.fetch(DAILY_LOG_CHANNEL_ID);
    if (!channel) {
      console.warn("Daily log channel not found. Check DAILY_LOG_CHANNEL_ID.");
      return;
    }

    // Define today's time range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch metrics
    const newOrders = await Order.countDocuments({
      createdAtWC: { $gte: startOfDay, $lte: endOfDay },
    });

    const ordersShipped = await Order.countDocuments({
      status: { $in: ["paid", "sorted"] },
      processedAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // Total sales
    const salesOrders = await Order.find({
      createdAtWC: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalSales = salesOrders.reduce(
      (sum, o) => sum + parseFloat(o.total || 0),
      0
    );

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle("🧾 Daily Summary")
      .setColor("#00b1ff")
      .addFields(
        { name: "New Orders", value: `${newOrders}`, inline: true },
        { name: "Orders Shipped", value: `${ordersShipped}`, inline: true },
        { name: "New Refunds", value: `0`, inline: true }, // Placeholder for future refund tracking
        {
          name: "Total Sales",
          value: `$${totalSales.toFixed(2)}`,
          inline: true,
        }
      )
      .setFooter({ text: "YourMuscleShop Daily Summary" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    console.log("✅ Daily summary sent successfully.");
  } catch (err) {
    console.error("Error sending daily summary:", err);
  }
}

// Schedule the cron job to run daily at 23:59
function scheduleDailySummary(client) {
  cron.schedule("*/30 * * * * *", async () => {
    await sendDailySummary(client);
  }); // Replace with your timezone
}

module.exports = { scheduleDailySummary, sendDailySummary };
