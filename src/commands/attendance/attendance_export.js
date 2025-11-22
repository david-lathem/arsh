const {
  Client,
  Interaction,
  EmbedBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
} = require("discord.js");
const Attendance = require("../../models/Attendance");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "attendance_export",
  description: "Export attendance data in CSV format.",
  options: [
    {
      name: "range",
      description: "Select export range",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "Today", value: "today" },
        { name: "Weekly", value: "weekly" },
        { name: "Monthly", value: "monthly" },
        { name: "All Time", value: "all" },
      ],
    },
  ],

  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const range = interaction.options.getString("range");
    const guildId = interaction.guild.id;

    // Fetch attendance for all users in guild
    const records = await Attendance.find({ guildId });

    if (!records || records.length === 0) {
      return interaction.editReply("❌ No attendance data found.");
    }

    // date helpers
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter based on range
    const filterByRange = (dateStr) => {
      const d = new Date(dateStr);

      if (range === "today") return dateStr === today;
      if (range === "weekly") return d >= startOfWeek;
      if (range === "monthly") return d >= startOfMonth;
      return true; // all
    };

    // Build CSV content
    let csv = "User,Date,Sign In,Sign Out\n";

    for (const userData of records) {
      for (const day of userData.dates) {
        if (!filterByRange(day.date)) continue;

        const user = await interaction.guild.members.fetch(userData.userId).catch(() => null);
        const username = user ? user.user.username : "Unknown";

        csv += `${username},${day.date},${formatTime(day.signIn)},${formatTime(day.signOut)}\n`;
      }
    }

    // Save CSV
    const fileName = `attendance_${range}_${Date.now()}.csv`;
    const filePath = path.join(__dirname, "../../exports", fileName);

    // Make sure exports folder exists
    if (!fs.existsSync(path.join(__dirname, "../../exports"))) {
      fs.mkdirSync(path.join(__dirname, "../../exports"));
    }

    fs.writeFileSync(filePath, csv);

    const file = new AttachmentBuilder(filePath);

    // Embed response
    const embed = new EmbedBuilder()
      .setTitle("📤 Attendance Export")
      .setDescription(
        `Your **${range.toUpperCase()}** attendance report is ready.\n\n` +
        `**Format:** CSV\n` +
        `**Rows:** Auto-generated\n\n` +
        `Download the file below.`
      )
      .setColor("#2b2d31")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [file] });

    // Auto-delete file after 30 sec for cleanup
    setTimeout(() => {
      fs.unlinkSync(filePath);
    }, 30000);
  },
};

// Format time helper
const formatTime = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
