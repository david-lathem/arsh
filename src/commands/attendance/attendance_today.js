const { Client, Interaction, EmbedBuilder } = require("discord.js");
const Attendance = require("../../models/Attendance");

module.exports = {
  name: "attendance_todays",
  description: "Shows today's staff attendance in a clean table.",
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const guildId = interaction.guild.id;
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const records = await Attendance.find({ guildId });

    // Prepare rows
    const rows = [];

    for (const entry of records) {
      const todayRecord = entry.dates.find((d) => d.date === today);
      if (!todayRecord) continue;

      const user = await interaction.guild.members
        .fetch(entry.userId)
        .catch(() => null);

      const username = user ? user.user.username : "Unknown";

      const signIn = todayRecord.signIn
        ? new Date(todayRecord.signIn).toLocaleTimeString()
        : "—";

      const signOut = todayRecord.signOut
        ? new Date(todayRecord.signOut).toLocaleTimeString()
        : "—";

      rows.push({ username, signIn, signOut });
    }

    // Determine max column widths
    const colWidths = {
      username: Math.max(
        8,
        ...rows.map((r) => r.username.length)
      ),
      signIn: Math.max(
        7,
        ...rows.map((r) => r.signIn.length)
      ),
      signOut: Math.max(
        8,
        ...rows.map((r) => r.signOut.length)
      ),
    };

    // Build table string
    let table = "```\n";
    table +=
      "User".padEnd(colWidths.username) + " | " +
      "Sign In".padEnd(colWidths.signIn) + " | " +
      "Sign Out".padEnd(colWidths.signOut) + "\n";

    table +=
      "-".repeat(colWidths.username) + "-|-" +
      "-".repeat(colWidths.signIn) + "-|-" +
      "-".repeat(colWidths.signOut) + "\n";

    for (const row of rows) {
      table +=
        row.username.padEnd(colWidths.username) + " | " +
        row.signIn.padEnd(colWidths.signIn) + " | " +
        row.signOut.padEnd(colWidths.signOut) + "\n";
    }

    table += "```";

    if (rows.length === 0) {
      table = "```\nNo attendance recorded today.\n```";
    }

    // Embed
    const embed = new EmbedBuilder()
      .setTitle("📋 Today's Attendance Report")
      .setDescription(`Here is everyone's Sign-In / Sign-Out for **${today}**:\n\n${table}`)
      .setColor("#2b2d31")
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/1827/1827415.png")
      .setFooter({ text: "Attendance System • YourMuscleShop" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
