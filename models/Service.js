const mongoose = require("mongoose");

const serviceSchema = mongoose.Schema(
  {
    slug: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },

    serviceId: {
      type: String,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    title: {
      type: String,
    },

    category: {
      type: String,
      required: true, // e.g., "cleaning", "electrical", "painting"
    },

    description: String,

    color: String,

    basePrice: {
      type: Number,
      required: true, // price per hour
    },

    ratePerHour: Number,

    image: String,

    illustrationKey: String,

    badgeText: String,

    sortOrder: {
      type: Number,
      default: 0,
    },

    includedScope: [String], // what's included in the base price

    optionalAddons: [
      {
        name: String,
        price: Number,
        description: String,
      },
    ],

    skillTags: [String],

    durationMins: Number,

    cancellationNote: String,

    featured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
