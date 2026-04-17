const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/adminMiddleware");
const createRateLimit = require("../middleware/rateLimit");
const {
  loginAdmin,
  getStats,
  getUsers,
  getWorkers,
  getBookings,
  getPayments,
  getApplications,
  getApplicationById,
  approveWorker,
  rejectWorker,
} = require("../controllers/adminController");

const adminAuthRateLimit = createRateLimit({
  key: "admin-auth",
  windowMs: 15 * 60 * 1000,
  limit: 12,
  message: "Too many admin login attempts, please try again later.",
});

router.post("/login", adminAuthRateLimit, loginAdmin);

router.use(protect, isAdmin);

router.get("/stats", getStats);
router.get("/users", getUsers);
router.get("/workers", getWorkers);
router.get("/bookings", getBookings);
router.get("/payments", getPayments);
router.get("/applications", getApplications);
router.get("/application/:id", getApplicationById);
router.post("/approve-worker", approveWorker);
router.post("/reject-worker", rejectWorker);

module.exports = router;
