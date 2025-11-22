const {
  Client,
  Interaction,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
module.exports = {
  name: "summarize",
  description: "Summarize any text using AI",
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    const modal = new ModalBuilder()
      .setCustomId("summarizemodal")
      .setTitle("Summarize Text");

    // Text input for original text
    const originalInput = new TextInputBuilder()
      .setCustomId("original_text")
      .setLabel("Enter the text you want to summarize")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    // Optional instructions
    const instructionsInput = new TextInputBuilder()
      .setCustomId("instructions")
      .setLabel("instructions (e.g. short version)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const row1 = new ActionRowBuilder().addComponents(originalInput);
    const row2 = new ActionRowBuilder().addComponents(instructionsInput);

    modal.addComponents(row1, row2);

    // Show modal to user
    await interaction.showModal(modal);
  },
};
