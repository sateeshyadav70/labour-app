const express = require("express");
const router = express.Router();

const {
  createBooking,
  getBookingById,
  broadcastBooking,
  acceptBooking,
  rejectBooking,
  markBookingOnTheWay,
  completeBooking,
  getUserBookings,
} = require("../controllers/bookingController");

const protect = require("../middleware/authMiddleware");
const protectWorker = require("../middleware/workerAuthMiddleware");
const protectAny = require("../middleware/anyAuthMiddleware");

router.post("/", protect, createBooking);
router.post("/broadcast", protect, broadcastBooking);
router.get("/my", protect, getUserBookings);
router.get("/:id", protectAny, getBookingById);
router.post("/accept/:id", protectWorker, acceptBooking);
router.post("/reject/:id", protectWorker, rejectBooking);
router.post("/:id/on-the-way", protectWorker, markBookingOnTheWay);
router.post("/:id/complete", protectWorker, completeBooking);
router.put("/:id/accept", protectWorker, acceptBooking);

module.exports = router;
