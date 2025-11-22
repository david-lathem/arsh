const { EmbedBuilder } = require("discord.js");
const EmailDraft = require("../../models/EmailDraft");
const OpenAI = require("openai").default;
module.exports = async (client, interaction) => {
  try {
    if (!interaction.isModalSubmit()) return;

    const [action, id] = interaction.customId.split("_");

    switch (action) {
      case "rewriteemailmodal":
        await handleRewriteEmailModal(interaction, id);
        break;
      case "rewritemodal":
        await handleRewriteModal(interaction);
        break;
      case "summarizemodal":
        await handleSummarizeModal(interaction);
        break;
      default:
        console.log(`Unknown button action: ${action}`);
    }
  } catch (err) {
    console.log(err);
  }
};

async function handleRewriteEmailModal(interaction, messageId) {
  await interaction.deferReply({ ephemeral: true });

  const record = await EmailDraft.findOne({ messageId });
  if (!record) return interaction.editReply("❌ Email record not found.");

  const changes = interaction.fields.getTextInputValue("rewrite_changes");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
Rewrite the email with these changes:

Changes: ${changes}

Original Email:
${record.emailText}
        `;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "user", content: prompt }],
  });

  const rewritten = completion.choices[0].message.content;
  const subjectLine = rewritten.split("\n")[0].replace("Subject:", "").trim();

  const embed = new EmbedBuilder()
    .setColor("#00c46b")
    .setTitle("✏️ Rewritten Email")
    .addFields(
      { name: "📝 Subject", value: `\`${subjectLine}\`` },
      { name: "📨 Updated Content", value: `\`\`\`\n${rewritten}\n\`\`\`` }
    )
    .setFooter({ text: "AI Email Rewriter" })
    .setTimestamp();

  const channel = await interaction.client.channels.fetch(record.channelId);
  const msg = await channel.messages.fetch(messageId);

  await msg.edit({
    embeds: [embed],
    components: [], // Remove rewrite button after use
  });

  record.emailText = rewritten;
  await record.save();

  return interaction.editReply("✅ Email rewritten successfully.");
}

async function handleRewriteModal(interaction) {
  await interaction.deferReply();

  const originalText = interaction.fields.getTextInputValue("original_text");
  const instructions = interaction.fields.getTextInputValue("instructions");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = instructions
    ? `Rewrite the following text. ${instructions}\n\nText: ${originalText}`
    : `Rewrite the following text in a better, professional, or more clear way:\n\nText: ${originalText}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const rewrittenText = completion.choices[0].message.content;

    const embed = new EmbedBuilder()
      .setTitle("✏️ Rewritten Text")
      .setColor("#00c46b")
      .setDescription(`\`\`\`\n${rewrittenText}\n\`\`\``)
      .setFooter({ text: "AI Rewrite" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.editReply("❌ Something went wrong while rewriting.");
  }
}

async function handleSummarizeModal(interaction) {
  await interaction.deferReply();

  const originalText = interaction.fields.getTextInputValue("original_text");
  const instructions = interaction.fields.getTextInputValue("instructions");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = instructions
    ? `Summarize the following text. ${instructions}\n\nText: ${originalText}`
    : `Summarize the following text in a clear and concise manner:\n\nText: ${originalText}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const summary = completion.choices[0].message.content;

    const embed = new EmbedBuilder()
      .setTitle("📝 Summary")
      .setColor("#ff9900")
      .setDescription(`\`\`\`\n${summary}\n\`\`\``)
      .setFooter({ text: "AI Summarizer" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.editReply("❌ Something went wrong while summarizing.");
  }
}
