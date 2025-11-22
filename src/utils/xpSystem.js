// utils/xpSystem.js
const User = require("../models/User");

const LEVELS = [
  {
    level: 1,
    requiredXp: 0,
    title: "Beginner",
    reward: null,
    roleId: "1441725911983587398",
  },
  {
    level: 5,
    requiredXp: 300,
    title: "Rising Star ⭐",
    reward: "Announcement Recognition",
    roleId: "1441725986734604328",
  },
  {
    level: 10,
    requiredXp: 800,
    title: "Pro Performer 💼",
    reward: "Custom Color",
    roleId: "1441726075431555132",
  },
  {
    level: 20,
    requiredXp: 2000,
    title: "Elite Team 🦾",
    reward: "Private Lounge Access",
    roleId: "1441726165600571597",
  },
  {
    level: 30,
    requiredXp: 4500,
    title: "Legend 🏆",
    reward: "Bonus / Merch / Gift Card",
    roleId: "1441726310706843669",
  },
];

// XP VALUES
const XP_VALUES = {
  message: 1,
  sign_in: 5,
  sign_out: 5,
  sorted: 10,
  paid: 20,
  ticket_resolved: 10,
  kudos: 10,
};

async function giveXp(userId, guild, action = "message") {
  const xpToGive = XP_VALUES[action] || 1;

  let user = await User.findOne({ discordId: userId });
  if (!user) user = await User.create({ discordId: userId });

  const oldLevel = user.level;

  // Add XP
  user.xp += xpToGive;
  user.weekly.xp += xpToGive;

  if (action === "message") user.weekly.messages += 1;
  if (action === "ticket_resolved") user.weekly.ticketsResolved += 1;
  if (action === "sorted") user.weekly.sorted += 1;

  // Determine new level
  const levelInfo = LEVELS.slice()
    .reverse()
    .find((l) => user.xp >= l.requiredXp);
  user.level = levelInfo.level;

  await user.save();

  // LEVEL UP EVENT
  if (levelInfo.level > oldLevel) {
    const levelChannel = guild.channels.cache.get(process.env.LEVEL_UP_CHANNEL);

    // 🎉 Level Up Message
    await levelChannel?.send({
      embeds: [
        {
          title: "🎉 LEVEL UP!",
          description: `**<@${userId}>** just hit **Level ${levelInfo.level}!**`,
          fields: [
            { name: "🏅 Title", value: levelInfo.title, inline: true },
            {
              name: "🎁 Reward",
              value: levelInfo.reward || "None",
              inline: true,
            },
          ],
          color: 0xffd700,
        },
      ],
    });

    // 🏅 Give badge if not already owned
    const alreadyHas = user.badges.some((b) => b.badge === levelInfo.title);
    if (!alreadyHas) {
      user.badges.push({
        badge: levelInfo.title,
        earnedAt: new Date(),
      });
    }

    user.lastAchievement = levelInfo.title;
    await user.save();

    // -----------------------
    // 🔥 ROLE ASSIGNMENT
    // -----------------------
    try {
      const member = await guild.members.fetch(userId);

      // remove all other level roles
      const allLevelRoleIds = LEVELS.map((l) => l.roleId).filter(Boolean);

      const rolesToRemove = member.roles.cache.filter((r) =>
        allLevelRoleIds.includes(r.id)
      );

      for (const [id] of rolesToRemove) {
        await member.roles.remove(id).catch(() => {});
      }

      // give new level role
      if (levelInfo.roleId) {
        await member.roles.add(levelInfo.roleId).catch(() => {});
      }
    } catch (err) {
      console.log("Role assignment error:", err);
    }
  }
}

module.exports = { giveXp };
