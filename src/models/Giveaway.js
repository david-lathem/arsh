// models/Giveaway.js
const mongoose = require("mongoose");

const giveawaySchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: false }, // The giveaway message to edit later
    prize: { type: String, required: true },
    hostId: { type: String, required: true },
    endsAt: { type: Date, required: true },
    participants: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    description: { type: String, default: "" },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Giveaway", giveawaySchema);
