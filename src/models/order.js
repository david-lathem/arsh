const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: { type: Number, required: true, unique: true, index: true },
  status: { type: String },
  total: { type: String },
  currency: { type: String },
  customerName: { type: String },
  customerEmail: { type: String },
  shippingAddress: { type: Object },
  lineItems: { type: Array },
  discordMessageId: { type: String }, // message ID of the embedded order post
  discordChannelId: { type: String },
  createdAtWC: { type: Date }, // when order was created in WooCommerce
  processedAt: { type: Date, default: Date.now }, // when bot processed it
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
