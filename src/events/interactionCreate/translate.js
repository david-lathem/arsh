const OpenAI = require("openai").default;

module.exports = async (client, interaction) => {
  try {
    if (!interaction.isMessageContextMenuCommand()) return;

    if (interaction.commandName !== "Translate") return;

    const originalText = interaction.targetMessage.content;

    if (!originalText || originalText.trim().length === 0) {
      return await interaction.reply({
        content: "❌ The selected message has no text to translate.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // AI translation request
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a translator. Translate the following text into natural **Colombian Spanish** (neutral tone, not slang). Do not add anything extra. Only provide the translation. Keep the original meaning and style exactly.",
        },
        {
          role: "user",
          content: originalText,
        },
      ],
    });

    const translated = response.choices[0].message.content;

    await interaction.editReply({
      content: `**Translated to Colombian Spanish:**\n${translated}`,
    });
  } catch (err) {
    console.error(err);
  }
};
