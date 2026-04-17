const Razorpay = require("razorpay");

const keyId = process.env.RAZORPAY_KEY;
const keySecret = process.env.RAZORPAY_SECRET;

let razorpay = null;

if (keyId && keySecret) {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
} else {
  console.warn(
    "Razorpay keys are not set. Payment routes will fail until env is configured."
  );
}

module.exports = razorpay;
