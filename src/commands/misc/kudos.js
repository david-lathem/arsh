const {
  Client,
  Interaction,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { giveXp } = require("../../utils/xpSystem");

module.exports = {
  name: "kudos",
  description: "Send kudos to a team member.",
  options: [
    {
      name: "user",
      description: "The user you want to appreciate",
      type: 6, // USER
      required: true,
    },
    {
      name: "reason",
      description: "Why are you giving kudos?",
      type: 3, // USER
      required: true,
    },
  ],

  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    try {
      const giver = interaction.user; // person who runs the command
      const receiver = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");

      if (receiver.id === giver.id) {
        return interaction.reply({
          content: "❌ You cannot give kudos to yourself!",
          ephemeral: true,
        });
      }

      const winsChannelId = process.env.WINS_CHANNEL_ID;
      const winsChannel = interaction.guild.channels.cache.get(winsChannelId);

      if (!winsChannel) {
        return interaction.reply({
          content: "❌ Wins-of-the-day channel not found.",
          ephemeral: true,
        });
      }

      // --- GIVE XP USING YOUR FUNCTION ---
      // (You already have the function, so we just call it)
      await giveXp(receiver.id, interaction.guild, "kudos");

      // --- BUILD EMBED ---
      const embed = new EmbedBuilder()
        .setColor("#00E1FF")
        .setTitle("💌 Kudos Received!")
        .setThumbnail(receiver.displayAvatarURL())
        .setDescription(
          `**${receiver}** received kudos from **${giver}**!\n\n` +
            `> **Reason:** ${reason}\n\n` +
            `(+10 XP)`
        )
        .setFooter({ text: "Wins of the Day" })
        .setTimestamp();

      // Send to #wins-of-the-day
      await winsChannel.send({ embeds: [embed] });

      // Reply to command author
      await interaction.reply({
        content: `🎉 Kudos sent to **${receiver.username}**!`,
        ephemeral: true,
      });
    } catch (e) {
      console.error("Kudos Command Error:", err);
      return await interaction.reply({
        content: "❌ Something went wrong while sending kudos.",
        ephemeral: true,
      });
    }
  },
};
