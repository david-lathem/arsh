// utils/handleUserLogin.js
const User = require("../models/User");

// Badge definitions
const BADGES = [
  {
    title: "🌞 Early Bird",
    requirement: (user) => user.loginStreak >= 30
  },
  {
    title: "📆 100 Days Active",
    requirement: (user) => user.stats?.totalLogins >= 100
  },
  {
    title: "🧱 Steady Builder",
    requirement: (user) => user._steadyBuilderEligible
  }
];

 async function handleUserLogin(discordId) {
  let user = await User.findOne({ discordId });
  const now = new Date();

  if (!user) {
    user = new User({
      discordId,
      loginStreak: 1,
      lastLogin: now,
      stats: { totalLogins: 1 }
    });
  } else {
    const last = user.lastLogin ? new Date(user.lastLogin) : null;
    const diff = last ? now - last : Infinity;

    if (diff < 48 * 60 * 60 * 1000) user.loginStreak += 1;
    else user.loginStreak = 1;

    user.lastLogin = now;

    if (!user.stats.totalLogins) user.stats.totalLogins = 0;
    user.stats.totalLogins += 1;

    // WEEKLY tracking for Steady Builder
    const week = `${now.getFullYear()}-${Math.ceil((now.getDate() + ((now.getDay() + 6) % 7)) / 7)}`;
    if (!user._steadyBuilderWeeks.includes(week)) {
      user._steadyBuilderWeeks.push(week);
    }

    if (user._steadyBuilderWeeks.length >= 8) {
      user._steadyBuilderEligible = true;
    }
  }

  // Award badges
  const earnedBadges = [];

  for (const b of BADGES) {
    const has = user.badges.some(x => x.badge === b.title);
    if (!has && b.requirement(user)) {
      user.badges.push({ badge: b.title, earnedAt: new Date() });
      earnedBadges.push(b.title);
    }
  }

  await user.save();

  return { user, earnedBadges };
};

module.exports = {
    handleUserLogin
}
