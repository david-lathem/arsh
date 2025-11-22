const {
  Client,
  Interaction,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const Attendance = require("../../models/Attendance");

module.exports = {
  name: "attendance_user",
  description: "Show full attendance history for a specific user.",
  options: [
    {
      name: "user",
      description: "Select a user",
      type: 6, // USER
      required: true,
    },
  ],

  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const user = interaction.options.getUser("user");

    const record = await Attendance.findOne({
      guildId: interaction.guild.id,
      userId: user.id,
    });

    if (!record || record.dates.length === 0) {
      return interaction.editReply({
        content: `❌ No attendance data found for **${user.username}**.`,
      });
    }

    let rows = "";

    const pad = (text, length) => (text + " ".repeat(length)).slice(0, length);

    for (const day of record.dates) {
      const signIn = formatTime(day.signIn);
      const signOut = formatTime(day.signOut);

      rows += `\`${pad(day.date, 12)} | ${pad(signIn, 12)} | ${pad(
        signOut,
        12
      )}\`\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📅 Attendance History — ${user.username}`)
      .setColor("#2b2d31")
      .setDescription(
        "**Date** | **Sign In** | **Sign Out**\n" +
          "```\n" +
          "DATE         | SIGN IN      | SIGN OUT     \n" +
          "--------------------------------------------\n" +
          rows +
          "```"
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};

const formatTime = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
