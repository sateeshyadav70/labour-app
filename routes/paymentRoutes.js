const express = require("express");
const router = express.Router();

const {
  createOrder,
  verifyPayment,
  getPaymentHistory,
} = require("../controllers/paymentController");
const protect = require("../middleware/authMiddleware");

router.post("/", protect, createOrder);
router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.get("/history", protect, getPaymentHistory);
router.get("/booking/:bookingId", protect, getPaymentHistory);

module.exports = router;
