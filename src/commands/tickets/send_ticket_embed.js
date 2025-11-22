const {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "send_ticket_embed",
  description: "Sends a ticket panel with a button to open a new ticket.",
  permissionsRequired: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.SendMessages],

  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    // --- Embed ---
    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Tickets")
      .setDescription(
        "Need help? Click the button below to **open a ticket**.\n\n" +
        "Our support team will assist you as soon as possible.\n" +
        "You can describe your issue once the ticket opens."
      )
      .setColor("#ffa500")
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/1827/1827383.png")
      .setFooter({ text: "YourMuscleShop Support • Ticket System" })
      .setTimestamp();

    // --- Button ---
    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("openTicket")
        .setLabel("Open Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary)
    );

    // --- Send the embed in the same channel ---
    await interaction.channel.send({
      embeds: [embed],
      components: [buttonRow],
    });

    await interaction.editReply({
      content: "✅ Ticket panel sent successfully!",
      ephemeral: true,
    });
  },
};
