const {
  Client,
  Interaction,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
module.exports = {
  name: "rewrite",
  description: "Rewrite any text using AI",
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    const modal = new ModalBuilder()
      .setCustomId("rewritemodal")
      .setTitle("Rewrite Text");

    // Text input for original text
    const originalInput = new TextInputBuilder()
      .setCustomId("original_text")
      .setLabel("Enter the text you want to rewrite")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    // Optional instructions
    const instructionsInput = new TextInputBuilder()
      .setCustomId("instructions")
      .setLabel("Instructions for rewriting")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    // Add inputs to modal rows
    const row1 = new ActionRowBuilder().addComponents(originalInput);
    const row2 = new ActionRowBuilder().addComponents(instructionsInput);

    modal.addComponents(row1, row2);

    // Show modal to user
    await interaction.showModal(modal);
  },
};
