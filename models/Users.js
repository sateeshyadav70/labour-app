const mongoose = require("mongoose");

const addressBookEntrySchema = mongoose.Schema(
  {
    label: {
      type: String,
    },
    name: {
      type: String,
    },
    phone: {
      type: String,
    },
    addressLine1: {
      type: String,
    },
    addressLine2: {
      type: String,
    },
    landmark: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    pincode: {
      type: String,
    },
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const userSchema = mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
    },
    password: String,
    phone: String,
    address: String,
    role: {
      type: String,
      enum: ["user", "worker", "admin"],
      default: "user",
    },
    lastLoginAt: {
      type: Date,
    },
    addressBook: [addressBookEntrySchema],
    pinnedLocation: {
      addressBookId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      label: String,
      addressLine1: String,
      addressLine2: String,
      landmark: String,
      city: String,
      state: String,
      pincode: String,
      lat: Number,
      lng: Number,
      source: {
        type: String,
        default: "manual",
      },
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
