const crypto = require("crypto");
const mongoose = require("mongoose");
const razorpay = require("../utils/razorpay");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const {
  serializeBooking,
  serializePaymentRecord,
  serializeTrackingSnapshot,
} = require("../utils/serializers");
const { buildTrackingSnapshot } = require("../utils/tracking");
const { setBookingRecord, getBookingRecord } = require("../utils/runtimeStore");

const buildPaymentPayload = (order, booking = null) => ({
  paymentId: booking?.payment?.paymentId || null,
  orderId: order?.id || null,
  amount: order?.amount || null,
  currency: order?.currency || "INR",
  receipt: order?.receipt || null,
  status: order?.status || "created",
  provider: "razorpay",
  notes: order?.notes || null,
  bookingId: booking?._id || null,
});

const syncBookingPaymentState = async (booking, payment = null) => {
  if (!booking) {
    return null;
  }

  await booking.save();

  const currentSnapshot =
    booking.trackingSnapshot ||
    getBookingRecord(booking._id)?.trackingSnapshot ||
    buildTrackingSnapshot(booking, {
      bookingId: booking._id,
      workerId: booking.worker,
      serviceId: booking.serviceId,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      address: booking.address,
      etaMinutes: booking.estimatedTime,
      updatedAt: booking.updatedAt,
    });

  const serializedBooking = serializeBooking(booking);

  setBookingRecord(booking._id, {
    booking: serializedBooking,
    trackingSnapshot: currentSnapshot,
    payment: payment || booking.payment || null,
  });

  return {
    booking: serializedBooking,
    trackingSnapshot: currentSnapshot,
  };
};

exports.createOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return sendError(res, 500, "Razorpay is not configured");
    }

    const { amount, bookingId, currency = "INR", notes } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return sendError(res, 400, "Valid amount is required");
    }

    let booking = null;

    if (bookingId) {
      booking = await Booking.findById(bookingId);

      if (!booking) {
        return sendError(res, 404, "Booking not found");
      }

      if (booking.user.toString() !== req.user._id.toString()) {
        return sendError(res, 403, "Not allowed to update this booking");
      }
    }

    const options = {
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      bookingId: booking?._id || bookingId || null,
      amount: Number(amount),
      status: "pending",
      razorpay_order_id: order.id,
    });

    let trackingSnapshot = booking?.trackingSnapshot || null;

    if (booking) {
      booking.payment = {
        ...(booking.payment || {}),
        provider: "razorpay",
        orderId: order.id,
        amount: options.amount,
        currency,
        status: "created",
        receipt: options.receipt,
        notes: notes || booking.payment?.notes,
      };
      booking.estimatedAmount = Number.isFinite(Number(amount)) ? Number(amount) : booking.estimatedAmount;
      trackingSnapshot = booking.trackingSnapshot || buildTrackingSnapshot(booking, {
        bookingId: booking._id,
        workerId: booking.worker,
        serviceId: booking.serviceId,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        address: booking.address,
        etaMinutes: booking.estimatedTime,
        updatedAt: booking.updatedAt,
      });
      booking.trackingSnapshot = trackingSnapshot;
      await syncBookingPaymentState(booking, booking.payment);
    }

    const payment = buildPaymentPayload(order, booking);

    return sendSuccess(res, "Order created successfully", {
      payment,
      booking: booking ? serializeBooking(booking) : null,
      trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
      order,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_SECRET) {
      return sendError(res, 500, "Razorpay is not configured");
    }

    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendError(res, 400, "Missing payment verification fields");
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return sendError(res, 400, "Invalid payment signature");
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Not allowed to update this booking");
    }

    const paymentRecord = await Payment.findOneAndUpdate(
      { razorpay_order_id: razorpay_order_id, bookingId: booking._id },
      {
        status: "success",
        razorpay_payment_id,
      },
      { new: true }
    );

    if (!paymentRecord) {
      return sendError(res, 404, "Payment record not found");
    }

    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    booking.payment = {
      ...(booking.payment || {}),
      provider: booking.payment?.provider || "razorpay",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      status: "paid",
      paidAt: new Date(),
    };
    await booking.save();

    const trackingSnapshot = booking.trackingSnapshot || buildTrackingSnapshot(booking, {
      bookingId: booking._id,
      workerId: booking.worker,
      serviceId: booking.serviceId,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      address: booking.address,
      etaMinutes: booking.estimatedTime,
      updatedAt: booking.updatedAt,
    });

    setBookingRecord(booking._id, {
      booking: serializeBooking(booking),
      trackingSnapshot,
      payment: booking.payment,
    });

    return sendSuccess(res, "Payment verified successfully", {
      payment: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "paid",
        provider: "razorpay",
      },
      booking: serializeBooking(booking),
      trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const bookingId = req.params.bookingId || req.query.bookingId || null;
    const userId = req.user?._id;

    if (!userId) {
      return sendError(res, 401, "Not authorized");
    }

    if (bookingId && !mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendError(res, 400, "Invalid booking id");
    }

    let query = {};

    if (bookingId) {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return sendError(res, 404, "Booking not found");
      }

      if (booking.user.toString() !== userId.toString()) {
        return sendError(res, 403, "Not allowed to access this booking");
      }

      query = { bookingId: booking._id };
    } else {
      const userBookings = await Booking.find({ user: userId }).select("_id");
      const bookingIds = userBookings.map((item) => item._id);

      if (bookingIds.length === 0) {
        return sendSuccess(res, "Payment history fetched successfully", {
          payments: [],
          count: 0,
        });
      }

      query = { bookingId: { $in: bookingIds } };
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .populate("bookingId", "user worker serviceId serviceType address date status paymentStatus");

    const paymentHistory = payments.map((payment) => {
      const booking = payment.bookingId && typeof payment.bookingId.toObject === "function"
        ? payment.bookingId.toObject()
        : payment.bookingId || null;

      return {
        ...serializePaymentRecord(payment),
        booking: booking ? serializeBooking(booking) : null,
      };
    });

    return sendSuccess(res, "Payment history fetched successfully", {
      payments: paymentHistory,
      count: paymentHistory.length,
      bookingId: bookingId || null,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
