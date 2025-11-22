const mongoose = require('mongoose');

const emailDraftSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    emailText: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EmailDraft", emailDraftSchema);
