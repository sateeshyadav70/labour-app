const assert = require("node:assert/strict");
const crypto = require("crypto");
const mongoose = require("mongoose");

process.env.RAZORPAY_KEY = process.env.RAZORPAY_KEY || "test_key";
process.env.RAZORPAY_SECRET = process.env.RAZORPAY_SECRET || "test_secret";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt";

const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { verifyPayment } = require("../controllers/paymentController");

const makeResponse = () => {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
};

const main = async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const bookingId = new mongoose.Types.ObjectId().toString();
  const razorpayOrderId = "order_test_123";
  const razorpayPaymentId = "pay_test_456";
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const booking = {
    _id: bookingId,
    user: {
      toString: () => userId,
    },
    worker: null,
    serviceId: "service_1",
    serviceType: "Cleaning",
    address: "Test Address",
    estimatedTime: 30,
    estimatedAmount: 499,
    paymentStatus: "pending",
    status: "accepted",
    payment: {},
    createdAt: new Date("2026-04-16T00:00:00.000Z"),
    updatedAt: new Date("2026-04-16T00:00:00.000Z"),
    save: async () => {
      booking.saved = true;
      return booking;
    },
  };

  const originalFindById = Booking.findById;
  const originalFindOneAndUpdate = Payment.findOneAndUpdate;

  Booking.findById = async () => booking;
  Payment.findOneAndUpdate = async () => ({
    _id: new mongoose.Types.ObjectId(),
    bookingId,
    status: "success",
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
  });

  const req = {
    user: {
      _id: userId,
    },
    body: {
      bookingId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: signature,
    },
  };
  const res = makeResponse();

  try {
    await verifyPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Payment verified successfully");
    assert.equal(res.body.booking.status, "confirmed");
    assert.equal(res.body.booking.paymentStatus, "paid");
    assert.equal(res.body.payment.status, "paid");
    assert.equal(booking.saved, true);
    assert.equal(booking.status, "confirmed");
    assert.equal(booking.paymentStatus, "paid");
    assert.equal(booking.payment.paymentId, razorpayPaymentId);
    assert.equal(booking.payment.orderId, razorpayOrderId);

    console.log("Payment verify flow test passed.");
  } finally {
    Booking.findById = originalFindById;
    Payment.findOneAndUpdate = originalFindOneAndUpdate;
  }
};

module.exports = main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
