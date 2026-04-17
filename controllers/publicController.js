const { sendSuccess } = require("../utils/apiResponse");
const { getHomeConfig, SUPPORT_TEXT, APP_NAME } = require("../data/homeCatalog");

const buildSupportPayload = () => ({
  title: `${APP_NAME} Support`,
  contact: {
    email: process.env.SUPPORT_EMAIL || "support@labourbackend.local",
    phone: "+91-00000-00000",
    hours: "Mon-Sat, 9:00 AM to 7:00 PM",
  },
  summary: SUPPORT_TEXT,
  topics: [
    "Booking issues",
    "Payment issues",
    "Worker availability",
    "Account access",
  ],
});

const buildPolicyPayload = () => ({
  title: "Privacy Policy",
  updatedAt: new Date().toISOString(),
  sections: [
    "We collect only the data required to provide services.",
    "Location data is used for matching and tracking bookings.",
    "We do not sell personal data.",
  ],
});

const buildTermsPayload = () => ({
  title: "Terms of Service",
  updatedAt: new Date().toISOString(),
  sections: [
    "Use the platform responsibly.",
    "Bookings and payments are subject to availability and verification.",
    "Misuse of the platform may lead to account restrictions.",
  ],
});

exports.getSupport = async (req, res) => {
  return sendSuccess(res, "Support information fetched successfully", {
    support: buildSupportPayload(),
  });
};

exports.getPolicy = async (req, res) => {
  return sendSuccess(res, "Policy fetched successfully", {
    policy: buildPolicyPayload(),
  });
};

exports.getTerms = async (req, res) => {
  return sendSuccess(res, "Terms fetched successfully", {
    terms: buildTermsPayload(),
  });
};

exports.getHomeConfig = async (req, res) => {
  return sendSuccess(res, "Home config fetched successfully", {
    homeConfig: getHomeConfig(),
  });
};
