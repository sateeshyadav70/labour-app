const express = require("express");
const router = express.Router();
const {
  registerWorker,
  loginWorker,
  applyJob,
  approveWorker,
  updateWorkerProfile,
  getWorkers,
  getWorkerProfile,
  getWorkerById,
  updateStatus,
  acceptBooking,
  rejectBooking,
  getWorkerBookings,
  getEarnings,
} = require("../controllers/workerController");
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/adminMiddleware");
const protectWorker = require("../middleware/workerAuthMiddleware");
const optionalAuth = require("../middleware/optionalAuthMiddleware");
const createRateLimit = require("../middleware/rateLimit");

const workerAuthRateLimit = createRateLimit({
  key: "worker-auth",
  windowMs: 15 * 60 * 1000,
  limit: 8,
  message: "Too many auth attempts, please try again later.",
});

router.post("/register", workerAuthRateLimit, registerWorker);
router.post("/login", workerAuthRateLimit, loginWorker);
router.post("/apply", applyJob);
router.post("/approve", protect, isAdmin, approveWorker);
router.get("/profile", protectWorker, getWorkerProfile);
router.put("/profile", protectWorker, updateWorkerProfile);
router.put("/status", protectWorker, updateStatus);
router.get("/bookings", protectWorker, getWorkerBookings);
router.get("/earnings", protectWorker, getEarnings);
router.post("/accept-booking", protectWorker, acceptBooking);
router.post("/reject-booking", protectWorker, rejectBooking);
router.get("/:id", getWorkerById);
router.get("/", optionalAuth, getWorkers);


module.exports = router;
