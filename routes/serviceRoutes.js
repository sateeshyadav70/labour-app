const express = require("express");
const router = express.Router();

const {
  getServices,
  getServiceById,
  getServicesByCategory,
} = require("../controllers/serviceController");

router.get("/", getServices);
router.get("/category/:category", getServicesByCategory);
router.get("/:id", getServiceById);

module.exports = router;