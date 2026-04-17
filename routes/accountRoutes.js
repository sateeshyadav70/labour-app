const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getUserProfile,
  getAddressBook,
  addAddressBookEntry,
  updatePinnedLocation,
} = require("../controllers/userController");
const { getUserBookings } = require("../controllers/bookingController");

router.get("/profile", protect, getUserProfile);
router.get("/user/me", protect, getUserProfile);
router.get("/bookings", protect, getUserBookings);
router.post("/address-book", protect, addAddressBookEntry);
router.get("/address-book", protect, getAddressBook);
router.post("/profile/pinned-location", protect, updatePinnedLocation);

module.exports = router;
