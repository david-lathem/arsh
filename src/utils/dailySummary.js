// dailySummary.js
const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const Order = require("../models/order");

const DAILY_LOG_CHANNEL_ID = process.env.DAILY_LOG_CHANNEL_ID;

// Helper: calculate metrics for any time range
async function buildMetrics(start, end) {
  const newOrders = await Order.countDocuments({
    createdAtWC: { $gte: start, $lte: end },
  });

  const ordersShipped = await Order.countDocuments({
    status: { $in: ["paid", "sorted"] },
    processedAt: { $gte: start, $lte: end },
  });

  const salesOrders = await Order.find({
    createdAtWC: { $gte: start, $lte: end },
  });

  const totalSales = salesOrders.reduce(
    (sum, o) => sum + parseFloat(o.total || 0),
    0
  );

  return { newOrders, ordersShipped, totalSales };
}

/* ────────────────────────────────────────────
   DAILY SUMMARY
──────────────────────────────────────────── */
async function sendDailySummary(client) {
  try {
    const channel = await client.channels.fetch(DAILY_LOG_CHANNEL_ID);
    if (!channel) return;

    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const day = await buildMetrics(startOfDay, now);
    const week = await buildMetrics(startOfWeek, now);
    const month = await buildMetrics(startOfMonth, now);

    const embed = new EmbedBuilder()
      .setTitle("🧾 Daily, Weekly & Monthly Summary")
      .setColor("#00b1ff")
      .setTimestamp()
      .setDescription(
        `
### 📅 **Daily Summary**
• **New Orders:** ${day.newOrders}
• **Orders Shipped:** ${day.ordersShipped}
• **Total Sales:** $${day.totalSales.toFixed(2)}

---

### 📆 **Weekly Summary (Last 7 Days)**
• **New Orders:** ${week.newOrders}
• **Orders Shipped:** ${week.ordersShipped}
• **Total Sales:** $${week.totalSales.toFixed(2)}

---

### 📅 **Monthly Summary (Last 30 Days)**
• **New Orders:** ${month.newOrders}
• **Orders Shipped:** ${month.ordersShipped}
• **Total Sales:** $${month.totalSales.toFixed(2)}
        `
      );

    await channel.send({ embeds: [embed] });

    console.log("✅ Daily / Weekly / Monthly summary sent.");
  } catch (err) {
    console.error("❌ Error sending summary:", err);
  }
}

/* ────────────────────────────────────────────
   WEEKLY SUMMARY (SEPARATE)
──────────────────────────────────────────── */
async function sendWeeklyReport(client) {
  try {
    const channel = await client.channels.fetch(DAILY_LOG_CHANNEL_ID);
    if (!channel) return;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const data = await buildMetrics(startOfWeek, now);

    const embed = new EmbedBuilder()
      .setTitle("📆 Weekly Report (Last 7 Days)")
      .setColor("#ffaa00")
      .setTimestamp()
      .setDescription(
        `
• **New Orders:** ${data.newOrders}
• **Orders Shipped:** ${data.ordersShipped}
• **Total Sales:** $${data.totalSales.toFixed(2)}
        `
      );

    await channel.send({ embeds: [embed] });

    console.log("✅ Weekly report sent.");
  } catch (err) {
    console.error("❌ Weekly summary error:", err);
  }
}

/* ────────────────────────────────────────────
   MONTHLY SUMMARY (SEPARATE)
──────────────────────────────────────────── */
async function sendMonthlyReport(client) {
  try {
    const channel = await client.channels.fetch(DAILY_LOG_CHANNEL_ID);
    if (!channel) return;

    const now = new Date();
    const startOfMonth = new Date(now);
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const data = await buildMetrics(startOfMonth, now);

    const embed = new EmbedBuilder()
      .setTitle("📅 Monthly Report (Last 30 Days)")
      .setColor("#33cc33")
      .setTimestamp()
      .setDescription(
        `
• **New Orders:** ${data.newOrders}
• **Orders Shipped:** ${data.ordersShipped}
• **Total Sales:** $${data.totalSales.toFixed(2)}
        `
      );

    await channel.send({ embeds: [embed] });

    console.log("✅ Monthly report sent.");
  } catch (err) {
    console.error("❌ Monthly summary error:", err);
  }
}

/* ────────────────────────────────────────────
   CRON JOBS
──────────────────────────────────────────── */

// DAILY — every night at 23:59
function scheduleDailySummary(client) {
  cron.schedule("59 23 * * *", () => sendDailySummary(client));
}

// WEEKLY — every Monday at 00:00
function scheduleWeeklySummary(client) {
  cron.schedule("0 0 * * MON", () => sendWeeklyReport(client));
}

// MONTHLY — 1st day of month at 00:00
function scheduleMonthlySummary(client) {
  cron.schedule("0 0 1 * *", () => sendMonthlyReport(client));
}

/* ──────────────────────────────────────────── */

module.exports = {
  sendDailySummary,
  sendWeeklyReport,
  sendMonthlyReport,
  scheduleDailySummary,
  scheduleWeeklySummary,
  scheduleMonthlySummary,
};
