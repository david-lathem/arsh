// models/Attendance.js
const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  dates: [
    {
      date: { type: String, required: true },
      signIn: { type: Date, default: null },
      signOut: { type: Date, default: null },
      active: { type: Boolean, default: false },
    },
  ],
});

AttendanceSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
