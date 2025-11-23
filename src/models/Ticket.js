const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    channelId: { type: String, required: true, unique: true },
    creatorId: { type: String, required: true },
    claimerId: { type: String, default: null },
    status: { type: String, enum: ["open", "claimed"], default: "open" },
    createdAt: { type: Date, default: Date.now },
    claimedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
