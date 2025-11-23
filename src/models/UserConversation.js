// models/UserConversation.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  messages: { type: [messageSchema], default: [] },
});

module.exports = mongoose.model("UserConversation", conversationSchema);
