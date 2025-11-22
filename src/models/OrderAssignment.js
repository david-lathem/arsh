const mongoose = require("mongoose");

const orderAssignmentSchema = new mongoose.Schema(
  {
    orderId: { type: Number, required: true, index: true },
    assignedBy: { type: String, required: true }, // user tag or id
    assignedRole: { type: String, enum: ["shipping", "cs"], required: true },
    assignedAt: { type: Date, default: Date.now },
    discordMessageId: { type: String }, // optional: reference to embed message
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrderAssignment", orderAssignmentSchema);
