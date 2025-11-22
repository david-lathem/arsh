const {
  Client,
  Interaction,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const Attendance = require("../../models/Attendance");

module.exports = {
  name: "attendance_weekly",
  description: "Show a weekly summary of all staff attendance.",

  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const guildId = interaction.guild.id;
    const now = new Date();
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const records = await Attendance.find({ guildId });

    if (!records || records.length === 0) {
      return interaction.editReply("❌ No attendance data found.");
    }

    let rows = "";
    const pad = (text, length) => (text + " ".repeat(length)).slice(0, length);

    for (const rec of records) {
      const user = await interaction.guild.members.fetch(rec.userId).catch(() => null);
      const userName = user ? user.user.username : "Unknown";

      // Filter last 7 days
      const weekEntries = rec.dates.filter(d => new Date(d.date) >= last7);

      if (weekEntries.length === 0) continue;

      let totalHours = 0;

      weekEntries.forEach((d) => {
        if (d.signIn && d.signOut) {
          totalHours += (d.signOut - d.signIn) / (1000 * 60 * 60);
        }
      });

      rows +=
        `\`${pad(userName, 14)} | ${pad(weekEntries.length.toString(), 5)} | ${pad(totalHours.toFixed(1) + "h", 6)}\`\n`;
    }

    if (!rows) rows = "No attendance recorded this week.";

    const embed = new EmbedBuilder()
      .setTitle("📊 Weekly Attendance Summary (Last 7 Days)")
      .setColor("#2b2d31")
      .setDescription(
        "**User** | **Days** | **Hours**\n" +
          "```\n" +
          "USER           | DAYS | HOURS \n" +
          "--------------------------------\n" +
          rows +
          "```"
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
