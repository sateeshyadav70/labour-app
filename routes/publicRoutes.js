const express = require("express");
const router = express.Router();

const {
  getSupport,
  getPolicy,
  getTerms,
  getHomeConfig,
} = require("../controllers/publicController");

router.get("/support", getSupport);
router.get("/policy", getPolicy);
router.get("/terms", getTerms);
router.get("/home-config", getHomeConfig);

module.exports = router;
