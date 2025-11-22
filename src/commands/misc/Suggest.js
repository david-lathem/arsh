const {
  Client,
  Interaction,
  EmbedBuilder,
  ApplicationCommandOptionType,
} = require("discord.js");

module.exports = {
  name: "suggest",
  description: "Submit a suggestion.",
  options: [
    {
      name: "text",
      description: "Your suggestion",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const suggestionText = interaction.options.get("text").value;
    const suggestionChannelId = process.env.SUGGESTION_CHANNEL_ID;
    const suggestionChannel =
      interaction.guild.channels.cache.get(suggestionChannelId);

    if (!suggestionChannel) {
      return interaction.editReply(
        "❌ Suggestion channel not found in this server."
      );
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle("📝 New Suggestion")
      .setColor("#00b1ff")
      .setDescription(suggestionText)
      .addFields({
        name: "Suggested By",
        value: `<@${interaction.user.id}>`,
        inline: true,
      })
      .setTimestamp();

    // Send embed
    const message = await suggestionChannel.send({ embeds: [embed] });

    // Add reactions
    await message.react("👍");
    await message.react("👎");

    await interaction.editReply("✅ Your suggestion has been submitted!");
  },
};
