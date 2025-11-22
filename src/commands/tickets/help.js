const {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

module.exports = {
  name: "help",
  description: "Open a support ticket",
  
  /**
   * 
   * @param {Client} client 
   * @param {Interaction} interaction 
   */
  callback: async (client, interaction) => {
    const guild = interaction.guild;
    const user = interaction.user;

    const supportRoleId = process.env.SUPPORT_ROLE_ID;
    const ownerRoleId = process.env.OWNER_ROLE_ID;
    const categoryId = process.env.TICKET_CATEGORY_ID;

    // Check if user already has an open ticket
    const existingChannel = guild.channels.cache.find(
      (ch) =>
        ch.type === ChannelType.GuildText &&
        ch.name === `ticket-${user.username.toLowerCase()}` &&
        ch.parentId === categoryId
    );

    if (existingChannel) {
      return interaction.reply({
        content: `⛔ You already have an open ticket: ${existingChannel}`,
        ephemeral: true,
      });
    }

    // Create private ticket channel
    const ticketChannel = await guild.channels.create({
      name: `ticket-${user.username}`.toLowerCase(),
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: supportRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: ownerRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    // Mention support role
    await ticketChannel.send({ content: `<@&${supportRoleId}> New ticket opened by <@${user.id}>` });

    // Embed inside ticket
    const embed = new EmbedBuilder()
      .setTitle(`🎫 Ticket — ${user.username}`)
      .setDescription(
        "Hello! Our support team will assist you shortly.\n\n" +
        "Use the buttons below to resolve or escalate this ticket."
      )
      .setColor("#00b1ff")
      .setFooter({ text: "YourMuscleShop Support Ticket" })
      .setTimestamp();

    // Buttons
    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("resolveTicket")
        .setLabel("Resolve")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("escalateTicket")
        .setLabel("Escalate to Owner")
        .setEmoji("🚨")
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: `<@${user.id}>`,
      embeds: [embed],
      components: [buttonRow],
    });

    await interaction.reply({
      content: `✅ Ticket created: ${ticketChannel}`,
      ephemeral: true,
    });
  },
};
