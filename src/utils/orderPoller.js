const Order = require("../models/order");
const { fetchRecentOrders } = require("./woocommerceClient");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const cron = require("node-cron");
const ORDERS_CHANNEL_ID = process.env.ORDERS_CHANNEL_ID;
const POLL_INTERVAL = parseInt(process.env.WC_POLL_INTERVAL || "60", 10) * 1000; // ms

function truncate(text, max = 50) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

function buildOrderEmbed(order, guild) {
  const guildIcon = guild?.iconURL({ size: 256 }) || null;

  const items =
    (order.line_items || [])
      .map((li) => `• **${truncate(li.name, 40)}** ×${li.quantity}`)
      .join("\n") || "—";

  const billing = order.billing || {};
  const shipping = order.shipping || {};

  const customerName = truncate(
    `${billing.first_name || ""} ${billing.last_name || ""}`.trim(),
    40
  );
  const customerEmail = truncate(billing.email || "", 40);

  const address = truncate(
    `${shipping.address_1 || ""} ${shipping.address_2 || ""}`.trim(),
    50
  );

  const cityLine = truncate(
    `${shipping.city || ""} ${shipping.state || ""} ${
      shipping.postcode || ""
    }`.trim(),
    50
  );

  const payment = truncate(
    order.payment_method_title || order.payment_method || "—",
    40
  );
  const status = truncate(order.status || "pending", 20);

  const embed = new EmbedBuilder()
    .setColor("#3b82f6")
    .setTitle(`🛒 New Order #${order.id}`)
    .setThumbnail(guildIcon)
    .setDescription(
      `A new order has been placed!\n` +
        `Here are the details:\n\n` +
        `━━━━━━━━━━━━━━━━━━━━`
    )
    .addFields(
      {
        name: "💳 **Payment Method**",
        value: `\`${payment}\``,
        inline: true,
      },
      {
        name: "💰 **Total**",
        value: `\`${order.total || "0.00"} ${order.currency || ""}\``,
        inline: true,
      },
      {
        name: "🔁 Status",
        value: `\`${status}\``,
        inline: true,
      },

      { name: "📦 **Items**", value: items },

      {
        name: "👤 **Customer**",
        value: `**${customerName}**\n${customerEmail}`,
        inline: true,
      },

      {
        name: "📬 **Shipping Address**",
        value: `${address}\n${cityLine}\n${shipping.country || ""}`,
        inline: true,
      }
    )
    .setFooter({ text: "WooCommerce Order" })
    .setTimestamp(
      new Date(order.date_created || order.date_created_gmt || Date.now())
    );

  return embed;
}

function buildActionRow(orderId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`wcmark_paid_${orderId}`)
      .setLabel("Mark Paid")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`wcmark_sorted_${orderId}`)
      .setLabel("Mark Sorted")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`wcassign_shipping_${orderId}`)
      .setLabel("Assign ➜ Shipping")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`wcassign_cs_${orderId}`)
      .setLabel("Assign ➜ CS")
      .setStyle(ButtonStyle.Secondary)
  );
}

let isRunning = false;
let pollIntervalHandle = null;

async function processNewOrders(client) {
  if (isRunning) return;
  isRunning = true;
  try {
    const channel = await client.channels
      .fetch(ORDERS_CHANNEL_ID)
      .catch(() => null);
    if (!channel) {
      console.warn("Orders channel not found. Check ORDERS_CHANNEL_ID.");
      return;
    }

    const recent = await fetchRecentOrders(20);
    if (!Array.isArray(recent)) return;

    for (const order of recent) {
      const exists = await Order.findOne({ orderId: order.id }).lean();

      if (exists) continue; // already processed

      // Post embed
      const embed = buildOrderEmbed(order);
      const actionRow = buildActionRow(order.id);

      const sent = await channel.send({
        embeds: [embed],
        components: [actionRow],
      });

      // Save to DB
      const doc = await Order.create({
        orderId: order.id,
        status: order.status,
        total: order.total,
        currency: order.currency,
        customerName: `${(order.billing && order.billing.first_name) || ""} ${
          (order.billing && order.billing.last_name) || ""
        }`.trim(),
        customerEmail: (order.billing && order.billing.email) || "",
        shippingAddress: order.shipping || {},
        lineItems: order.line_items || [],
        discordMessageId: sent.id,
        discordChannelId: channel.id,
        createdAtWC: order.date_created
          ? new Date(order.date_created)
          : new Date(),
      });

      console.log(`Posted order #${order.id} -> discord message ${sent.id}`);
    }
  } catch (err) {
    console.error("Order poller error:", err);
  } finally {
    isRunning = false;
  }
}

function startPoller(client) {
  cron.schedule("*/2 * * * *", () => {
    processNewOrders(client).catch(console.error);
  });
  // Optional: run once immediately at start
  processNewOrders(client).catch(console.error);
}

function stopPoller() {
  if (pollIntervalHandle) clearInterval(pollIntervalHandle);
  pollIntervalHandle = null;
}

module.exports = {
  startPoller,
  stopPoller,
  processNewOrders,
};
