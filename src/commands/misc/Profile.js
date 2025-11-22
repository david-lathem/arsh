const {
  Client,
  Interaction,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const User = require("../../models/User");

module.exports = {
  name: "userprofile",
  description: "View your staff profile.",
  options: [
    {
      name: "user",
      description: "User to view (optional)",
      type: 6, // USER
      required: false,
    },
  ],

  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const target =
      interaction.options.getUser("user") || interaction.user;

    let user = await User.findOne({ discordId: target.id });

    if (!user) {
      user = await User.create({ discordId: target.id });
    }

    // Format values
    const badgesFormatted =
      user.badges.length > 0
        ? user.badges
            .map((b) => `• **${b.badge}** — \`${formatDate(b.earnedAt)}\``)
            .join("\n")
        : "`No badges yet.`";

    const lastLogin = user.lastLogin
      ? `<t:${Math.floor(new Date(user.lastLogin).getTime() / 1000)}:F>`
      : "`Never logged in`";

    const createdAt = `<t:${Math.floor(
      user.createdAt.getTime() / 1000
    )}:F>`;

    // Build Embed
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({
        name: `${target.username}'s Profile`,
        iconURL: target.displayAvatarURL(),
      })
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(
        `Welcome to **${target.username}'s Staff Profile**.\n\n` +
          `Here is an overview of their activity, achievements, and progress.`
      )
      .addFields(
        {
          name: "📊 **Progress**",
          value:
            `**Level:** \`${user.level}\`\n` +
            `**XP:** \`${user.xp}\`\n` +
            `**Department:** \`${user.department}\`\n` +
            `**Last Achievement:** \`${user.lastAchievement || "None"}\``,
          inline: false,
        },
        {
          name: "🔥 **Streaks**",
          value:
            `**Login Streak:** \`${user.loginStreak} days\`\n` +
            `**Last Login:** ${lastLogin}`,
          inline: false,
        },
        {
          name: "📈 **Stats**",
          value:
            `• **Messages:** \`${user.stats.messages}\`\n` +
            `• **Orders Sorted:** \`${user.stats.ordersSorted}\`\n` +
            `• **Tickets Resolved:** \`${user.stats.ticketsResolved}\`\n` +
            `• **Total Logins:** \`${user.stats.totalLogins}\``,
          inline: false,
        },
        {
          name: "🏅 **Badges**",
          value: badgesFormatted,
          inline: false,
        },
        {
          name: "🕒 **Account Info**",
          value: `**Profile Created:** ${createdAt}`,
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

// helper
function formatDate(date) {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
