// commands/admin/giveaway.js
const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const ms = require("ms");
const Giveaway = require("../../models/Giveaway");

module.exports = {
  name: "giveaway",
  description: "Create a giveaway in the current channel.",
  permissionsRequired: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.SendMessages],

  options: [
    {
      name: "prize",
      description: "What is the giveaway prize?",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "duration",
      description: "Duration (e.g. 10m, 1h, 2d).",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "description",
      description: "Extra description for the giveaway (optional)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const prize = interaction.options.get("prize").value;
    const durationStr = interaction.options.get("duration").value;
    const extraDesc = interaction.options.get("description")?.value || "";

    const timeMs = ms(durationStr);
    if (!timeMs) {
      return interaction.editReply(
        "❌ Invalid duration format. Use `10m`, `1h`, `2d`, etc."
      );
    }

    const endTimestamp = Date.now() + timeMs;

    // Step 1: Create giveaway in DB first to get ID
    const giveawayDoc = await Giveaway.create({
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      prize,
      hostId: interaction.user.id,
      endsAt: new Date(endTimestamp),
      description: extraDesc,
      participants: [],
    });

    // Step 2: Build embed
    const embed = new EmbedBuilder()
      .setTitle("🎉 **GIVEAWAY STARTED!**")
      .setColor("#ff7b00")
      .setDescription(
        `**Prize:** ${prize}\n\n` +
          `${extraDesc ? extraDesc + "\n\n" : ""}` +
          `⏳ **Ends:** <t:${Math.floor(endTimestamp / 1000)}:R>\n` +
          `👤 **Hosted By:** <@${interaction.user.id}>`
      )
      .setTimestamp()
      .setFooter({ text: "Click the button to enter the giveaway!" });

    // Step 3: Button with giveaway ID in customId
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_${giveawayDoc._id}`)
        .setLabel("🎉 Join Giveaway")
        .setStyle(ButtonStyle.Success)
    );

    // Step 4: Send message
    const msg = await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    // Step 5: Update document with message ID
    giveawayDoc.messageId = msg.id;
    await giveawayDoc.save();

    await interaction.editReply("🎉 Giveaway started successfully!");
  },
};
