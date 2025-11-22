const {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    // --- Create the embed ---
    const embed = new EmbedBuilder()
      .setTitle("📋 Staff Attendance Panel")
      .setDescription(
        "Please record your attendance by using the buttons below.\n\n" +
        "🟢 **Sign In** when you start your shift.\n" +
        "🔴 **Sign Out** when you finish."
      )
      .setColor("#2b2d31")
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/1827/1827415.png")
      .setFooter({
        text: "YourMuscleShop Staff Attendance",
      })
      .setTimestamp();

    // --- Create buttons ---
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("attendanceSignIn")
        .setLabel("Sign In")
        .setEmoji("🟢")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("attendanceSignOut")
        .setLabel("Sign Out")
        .setEmoji("🔴")
        .setStyle(ButtonStyle.Danger)
    );

    // --- Send embed in the channel where command was used ---
    await interaction.channel.send({
      embeds: [embed],
      components: [buttons],
    });

    await interaction.editReply("✅ Attendance panel sent successfully!");
  },

  name: "send_attendance_embed",
  description: "Sends the attendance panel (Sign In / Sign Out buttons) in this channel.",
  permissionsRequired: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.SendMessages],
};
