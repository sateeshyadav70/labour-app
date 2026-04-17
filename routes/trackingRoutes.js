const express = require("express");
const router = express.Router();
const protectAny = require("../middleware/anyAuthMiddleware");
const { getTrackingSnapshot } = require("../controllers/bookingController");

router.get("/:bookingId", protectAny, getTrackingSnapshot);

module.exports = router;
