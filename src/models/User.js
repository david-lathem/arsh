// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true, unique: true },

    // XP & Leveling
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    // Badges stored directly as titles
    badges: [
      {
        badge: String, // Example: "🌞 Early Bird"
        earnedAt: Date,
      },
    ],

    // Department
    department: { type: String, default: "General" },

    // Achievement tracking
    lastAchievement: { type: String, default: null },

    // Event statistics
    stats: {
      messages: { type: Number, default: 0 },
      ordersSorted: { type: Number, default: 0 },
      ticketsResolved: { type: Number, default: 0 },
      totalLogins: { type: Number, default: 0 },
    },

    // Streaks
    loginStreak: { type: Number, default: 0 },
    lastLogin: { type: Date },

    // Weekly stats tracking
    weekly: {
      xp: { type: Number, default: 0 },
      messages: { type: Number, default: 0 },
      ticketsResolved: { type: Number, default: 0 },
      sorted : { type: Number, default: 0 },
    },

    // For steady builder badge
    _steadyBuilderWeeks: { type: [String], default: [] },
    _steadyBuilderEligible: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
