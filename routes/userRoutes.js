const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updatePinnedLocation,
} = require("../controllers/userController");
const { loginUser } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const createRateLimit = require("../middleware/rateLimit");

const userAuthRateLimit = createRateLimit({
  key: "user-auth",
  windowMs: 15 * 60 * 1000,
  limit: 18,
  message: "Too many auth attempts, please try again later.",
});

router.post("/login", userAuthRateLimit, loginUser);
router.get("/profile", protect, getUserProfile);
router.get("/me", protect, getUserProfile);
router.post("/pinned-location", protect, updatePinnedLocation);

module.exports = router;
