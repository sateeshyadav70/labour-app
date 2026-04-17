const mongoose = require("mongoose");

const workerSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    address: {
      type: String,
    },

    services: [
      {
        type: String,
      },
    ],

    skills: [
      {
        type: String,
      },
    ],

    experience: {
      type: Number, // in years
      default: 0,
    },

    hourlyRate: {
      type: Number,
    },

    location: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },

    profileImage: {
      type: String,
    },

    workImages: [
      {
        type: String,
      },
    ],

    rating: {
      type: Number,
      default: 0,
    },

    numReviews: {
      type: Number,
      default: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false, // admin approve karega
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", workerSchema);
