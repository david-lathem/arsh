const mongoose = require("mongoose");
const cron = require("node-cron");
const axios = require("axios");
const { ChannelType, EmbedBuilder } = require("discord.js");
const { startPoller } = require("../../utils/orderPoller");
const {
  scheduleDailySummary,
  scheduleMonthlySummary,
  scheduleWeeklySummary,
} = require("../../utils/dailySummary");
const User = require("../../models/User");
const startMeetingJob = require("../../utils/ZoomClient");
const Giveaway = require("../../models/Giveaway");
const DAILY_CHANNEL_ID = process.env.DAILY_CHANNEL_ID;

module.exports = async (client) => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log(`${client.user.tag} is online.`);
  console.log("MongoDB connected successfully");

  // WOOCOMMERECE INTEGRATION ORDER PAID AND SORTED
  startPoller(client);

  // SEND DAILY SUMMARY ON HOW MUC ORDERS SORTED AND PAID AND OTHER THINGS
  scheduleDailySummary(client);
  scheduleWeeklySummary(client);
  scheduleMonthlySummary(client);

  // ZOOM MEETING INTEGRATION
  startMeetingJob(client);

  // DAILY MOTIVATION
  cron.schedule("59 23 * * *", async () => {
    try {
      const channel = client.channels.cache.get(DAILY_CHANNEL_ID);
      if (!channel || channel.type !== ChannelType.GuildText) return;

      // Fetch a random quote using Axios
      const res = await axios.get("https://zenquotes.io/api/random");
      const data = res.data;

      const quote = data[0].q;
      const author = data[0].a;

      const embed = {
        title: "🌅 Daily Motivation",
        description: `> "${quote}"\n\n— **${author}**`,
        color: 0x00b1ff,
        footer: {
          text: "Daily Quote • Updated automatically",
        },
        timestamp: new Date(),
      };

      await channel.send({ embeds: [embed] });

      console.log("[Daily Quote] Sent successfully.");
    } catch (error) {
      console.error("[Daily Quote Error]:", error);
    }
  });
  // 0 0 * * MON
  // WEEKLY REPORT CHANNEL
  cron.schedule("0 0 * * MON", async () => {
    try {
      const channelId = process.env.WEEKLY_REPORT_CHANNEL;
      if (!channelId)
        return console.error("❌ WEEKLY_REPORT_CHANNEL missing in .env");

      const channel = client.channels.cache.get(channelId);
      if (!channel) return console.error("❌ Weekly report channel not found.");

      // Fetch all users
      const users = await User.find();

      if (!users.length)
        return channel.send("❌ No users found for weekly stats.");

      // Helper to get top user by field
      const getTop = (field) => {
        return users
          .filter((u) => u.weekly && u.weekly[field] > 0)
          .sort((a, b) => b.weekly[field] - a.weekly[field])[0];
      };

      const topXp = getTop("xp");
      const topMessages = getTop("messages");
      const topTickets = getTop("ticketsResolved");
      const topSorted = getTop("sorted");

      // ================================
      // 📘 EMBED 1 — Weekly XP Leader
      // ================================
      const xpEmbed = new EmbedBuilder()
        .setTitle("🏆 Weekly XP Leader")
        .setColor("#00A8FF")
        .setDescription(
          topXp
            ? `**<@${topXp.discordId}>** earned **${topXp.weekly.xp} XP** this week!`
            : "No XP activity this week."
        )
        .setTimestamp();

      // ================================
      // 💬 EMBED 2 — Weekly Messages Leader
      // ================================
      const msgEmbed = new EmbedBuilder()
        .setTitle("💬 Top Message Sender")
        .setColor("#2ECC71")
        .setDescription(
          topMessages
            ? `**<@${topMessages.discordId}>** sent **${topMessages.weekly.messages} messages** this week!`
            : "No message activity this week."
        )
        .setTimestamp();

      // ================================
      // 🎫 EMBED 3 — Weekly Tickets Closed Leader
      // ================================
      const ticketEmbed = new EmbedBuilder()
        .setTitle("🎫 Top Support Performer")
        .setColor("#F1C40F")
        .setDescription(
          topTickets
            ? `**<@${topTickets.discordId}>** resolved **${topTickets.weekly.ticketsResolved} tickets**!`
            : "No tickets resolved this week."
        )
        .setTimestamp();

      // ================================
      // 📦 EMBED 4 — Weekly Orders Sorted Leader
      // ================================
      const sortedEmbed = new EmbedBuilder()
        .setTitle("📦 Top Order Sorter")
        .setColor("#9B59B6")
        .setDescription(
          topSorted
            ? `**<@${topSorted.discordId}>** sorted **${topSorted.weekly.sorted} orders**!`
            : "No orders sorted this week."
        )
        .setTimestamp();

      // Send embeds
      await channel.send({ embeds: [xpEmbed] });
      await channel.send({ embeds: [msgEmbed] });
      await channel.send({ embeds: [ticketEmbed] });
      await channel.send({ embeds: [sortedEmbed] });

      // ================================
      // RESET WEEKLY STATS
      // ================================
      for (const user of users) {
        user.weekly.xp = 0;
        user.weekly.messages = 0;
        user.weekly.ticketsResolved = 0;
        user.weekly.sorted = 0;
        await user.save();
      }

      console.log("✅ Weekly stats posted + reset!");
    } catch (err) {
      console.error("❌ Weekly cron error:", err);
    }
  });
  // 0 0 1 */3 *
  // SEASON RESET — Every 3 months

  cron.schedule("0 0 1 */3 *", async () => {
    try {
      const guild = client.guilds.cache.get(process.env.MAIN_GUILD_ID);
      const logChannel = guild.channels.cache.get(
        process.env.SEASON_LOG_CHANNEL
      );

      if (!guild || !logChannel) {
        console.log("❌ Missing guild or log channel for season reset.");
        return;
      }

      console.log("🔄 Starting simple XP season reset...");

      // Fetch users
      const users = await User.find({});

      // Sort by XP and pick top 5
      const top5 = [...users].sort((a, b) => b.xp - a.xp).slice(0, 5);

      // Build leaderboard text
      const topList =
        top5.length > 0
          ? top5
              .map(
                (u, i) =>
                  `\`${i + 1}.\` <@${u.discordId}> • **${u.xp} XP** (Lvl ${
                    u.level
                  })`
              )
              .join("\n")
          : "`No XP data recorded.`";

      // Build embed description
      const description = `
🏁 **Season Reset Complete!**

A new **3-month season** has started! 🎉
All user XP and Levels have been reset to prepare for the new season.

🏆 **Top 5 Performers (Last Season)**
${topList}

🔄 **Season Reset Details**
• All XP set to **0**
• All Levels set to **1**

🚀 Aim for the top in this new season!
`;

      // Send summary embed
      await logChannel.send({
        embeds: [
          {
            title: "🔥 **Season Reset**",
            color: 0xffcc00,
            description,
            timestamp: new Date(),
          },
        ],
      });

      // Reset XP + LEVEL ONLY
      await User.updateMany(
        {},
        {
          $set: {
            xp: 0,
            level: 1,
          },
        }
      );

      console.log("✅ Simple XP reset completed.");
    } catch (err) {
      console.error("❌ Season reset error:", err);
    }
  });

  // Runs every minute to check for ended giveaways
  cron.schedule("*/30 * * * * *", async () => {
    try {
      const now = Date.now();

      // Fetch all giveaways that have ended but not yet marked completed
      const endedGiveaways = await Giveaway.find({
        endsAt: { $lte: now },
        completed: false,
      });
      for (const giveaway of endedGiveaways) {
        const channel = await client.channels
          .fetch(giveaway.channelId)
          .catch(() => null);
        if (!channel) continue;

        const msg = await channel.messages
          .fetch(giveaway.messageId)
          .catch(() => null);
        if (!msg) continue;

        // Select a random winner
        let winner = null;
        if (giveaway.participants.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * giveaway.participants.length
          );
          winner = giveaway.participants[randomIndex];
        }

        // Build final giveaway embed
        const finalEmbed = EmbedBuilder.from(msg.embeds[0])
          .setColor("#FFD700")
          .setTitle("🎉 GIVEAWAY ENDED!")
          .setFooter({ text: "The giveaway has concluded!" })
          .addFields([
            {
              name: "🏆 Winner",
              value: winner ? `<@${winner}>` : "No participants joined 😢",
              inline: true,
            },
          ])
          .setTimestamp();

        // Edit original message to remove button & show winner
        await msg.edit({
          embeds: [finalEmbed],
          components: [], // remove button
        });

        // Optionally announce separately in channel
        if (winner) {
          await channel.send({
            content: `🎊 Congratulations <@${winner}>! You won **${giveaway.prize}**!`,
          });
        } else {
          await channel.send("No one participated in the giveaway. 😢");
        }

        // Mark giveaway as completed
        giveaway.completed = true;
        await giveaway.save();
      }
    } catch (e) {
      console.log(e);
    }
  });
};
