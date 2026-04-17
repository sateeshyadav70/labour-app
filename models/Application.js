const mongoose = require("mongoose");

const appSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    address: String,
    services: [String],
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", appSchema);
