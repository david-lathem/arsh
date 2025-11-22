const {
  Client,
  Interaction,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const User = require("../../models/User");
const BADGES = [
  // PERFORMANCE BADGES
  { badge: "🥇 Top Shipper", meaning: "Packed the most orders in a week" },
  { badge: "📈 Sales Driver", meaning: "Helped boost sales/marketing" },

  // ACHIEVEMENT BADGES
  { badge: "🎯 Target Smasher", meaning: "Completed all weekly goals" },
  { badge: "💡 Innovator", meaning: "Suggested an idea that gets implemented" },
  { badge: "🚀 Growth Hacker", meaning: "Started a successful campaign" },

  // SOCIAL / CULTURE BADGES
  { badge: "❤️ Team Spirit", meaning: "Helped a teammate" },
  { badge: "🌞 Positive Vibes", meaning: "Motivational or uplifting messages" },
  { badge: "🏋️ Health Freak", meaning: "Sharing fitness/health wins" },
];

module.exports = {
  name: "givebadge",
  description: "Give a badge to a staff member.",
  options: [
    {
      name: "user",
      description: "The user to give the badge to",
      type: 6, // USER
      required: true,
    },
    {
      name: "badge",
      description: "Select the badge to give",
      type: 3, // STRING
      required: true,
      choices: BADGES.map((b) => ({
        name: `${b.badge} — ${b.meaning}`,
        value: b.badge,
      })),
    },
  ],

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    // ADMIN CHECK
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.editReply("❌ You don't have permission.");
    }

    const selectedUser = interaction.options.getUser("user");
    const badgeTitle = interaction.options.getString("badge");

    let user = await User.findOne({ discordId: selectedUser.id });
    if (!user) {
      user = await User.create({ discordId: selectedUser.id });
    }

    // Already has badge?
    const alreadyHas = user.badges.some((b) => b.badge === badgeTitle);

    if (alreadyHas) {
      return interaction.editReply(
        `⚠️ **${selectedUser.username}** already has the **${badgeTitle}** badge!`
      );
    }

    // Give badge
    user.badges.push({
      badge: badgeTitle,
      earnedAt: new Date(),
    });
    await user.save();

    // Send success message to admin
    await interaction.editReply(
      `✅ Badge **${badgeTitle}** has been awarded to **${selectedUser.username}**!`
    );

    // ANNOUNCE BADGE PUBLICLY
    const announceChannelId = process.env.ACHEIVEMENT_CHANNEL_ID;
    const announceChannel =
      interaction.guild.channels.cache.get(announceChannelId);

    if (announceChannel) {
      const meaning = BADGES.find((b) => b.badge === badgeTitle)?.meaning;

      const embed = new EmbedBuilder()
        .setColor("#ffcc00")
        .setTitle("🏅 New Badge Earned!")
        .setDescription(
          `🎉 <@${selectedUser.id}> has earned the **${badgeTitle}** badge!`
        )
        .addFields({
          name: "📌 Reason",
          value: meaning || "N/A",
        })
        .setThumbnail(selectedUser.displayAvatarURL())
        .setTimestamp();

      await announceChannel.send({ embeds: [embed] });
    }
  },
};
