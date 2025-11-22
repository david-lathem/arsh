const {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const EmailDraft = require("../../models/EmailDraft");
const OpenAI = require("openai").default;
module.exports = {
  name: "email-draft",
  description: "Generate a professional email using OpenAI",
  options: [
    {
      name: "purpose",
      description: "What is the purpose of the email?",
      type: 3,
      required: true,
    },
    {
      name: "tone",
      description: "Tone of the email (formal, friendly, etc.)",
      type: 3,
      required: true,
    },
    {
      name: "details",
      description: "Any extra details to include",
      type: 3,
      required: true,
    },
  ],

  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply();

    const purpose = interaction.options.getString("purpose");
    const tone = interaction.options.getString("tone");
    const details = interaction.options.getString("details");

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `
Write a professional email:

Purpose: ${purpose}
Tone: ${tone}
Details: ${details}

Format:
- Include a subject
- Greeting
- Body
- Closing
            `;

      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const email = completion.choices[0].message.content;

      // Extract subject (first line)
      const subjectLine = email.split("\n")[0].replace("Subject:", "").trim();

      const embed = new EmbedBuilder()
        .setColor("#2b90ff")
        .setTitle(`📧 Generated Email Draft`)
        .addFields(
          {
            name: "📝 Subject",
            value: `\`${subjectLine}\``,
          },
          {
            name: "📨 Email Content",
            value: `\`\`\`\n${email}\n\`\`\``,
          }
        )
        .setFooter({ text: "AI Email Generator" })
        .setTimestamp();

      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rewriteemail_")
          .setLabel("Rewrite Email")
          .setEmoji("✏️")
          .setStyle(ButtonStyle.Secondary)
      );

      const sentMsg = await interaction.editReply({
        embeds: [embed],
        components: [btnRow],
      });

      // Save to DB
      await EmailDraft.create({
        userId: interaction.user.id,
        messageId: sentMsg.id,
        channelId: sentMsg.channel.id,
        emailText: email,
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Something went wrong.");
    }
  },
};
