const User = require("../../models/User");
const { giveXp } = require("../../utils/xpSystem");

module.exports = async (client, message) => {
  if (message.author.bot) return;

  // Fetch or create user
  let user = await User.findOne({ discordId: message.author.id });
  if (!user) {
    user = await User.create({ discordId: message.author.id });
  }

  // Increment messages stat
  user.stats.messages = (user.stats.messages || 0) + 1;
  await user.save();

  // Give XP
  await giveXp(message.author.id, message.guild, "message");
};
