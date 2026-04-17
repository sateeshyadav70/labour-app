const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
  },
  amount: Number,
  status: {
    type: String,
    default: "pending",
  },
  razorpay_order_id: String,
  razorpay_payment_id: String,
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
