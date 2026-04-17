const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
} = require("../controllers/authController");
const createRateLimit = require("../middleware/rateLimit");

const authRateLimit = createRateLimit({
  key: "user-auth",
  windowMs: 15 * 60 * 1000,
  limit: 18,
  message: "Too many auth attempts, please try again later.",
});

router.post("/register", authRateLimit, registerUser);
router.post("/login", authRateLimit, loginUser);

module.exports = router;
