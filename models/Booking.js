const mongoose = require("mongoose");

const bookingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
    },

    serviceId: {
      type: String,
      index: true,
    },

    serviceType: String,

    notes: {
      type: String,
    },

    estimatedAmount: {
      type: Number,
    },

    address: String,

    date: Date,

    userLocation: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },

    distance: {
      type: Number,
    },

    estimatedTime: {
      type: Number,
    },

    broadcastHistory: [
      {
        worker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Worker",
        },
        distance: {
          type: Number,
        },
        estimatedTime: {
          type: Number,
        },
        responseStatus: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        notifiedAt: {
          type: Date,
          default: Date.now,
        },
        respondedAt: {
          type: Date,
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "searching",
        "pending",
        "confirmed",
        "accepted",
        "rejected",
        "on-the-way",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    payment: {
      provider: {
        type: String,
        default: "razorpay",
      },
      orderId: {
        type: String,
      },
      paymentId: {
        type: String,
      },
      signature: {
        type: String,
      },
      amount: {
        type: Number,
      },
      currency: {
        type: String,
        default: "INR",
      },
      status: {
        type: String,
        enum: ["pending", "created", "paid", "failed"],
        default: "pending",
      },
      paidAt: {
        type: Date,
      },
      receipt: {
        type: String,
      },
      method: {
        type: String,
      },
      notes: {
        type: Object,
      },
    },

    trackingHistory: [
      {
        lat: {
          type: Number,
        },
        lng: {
          type: Number,
        },
        accuracy: {
          type: Number,
        },
        source: {
          type: String,
          enum: ["worker", "user", "system"],
          default: "worker",
        },
        recordedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    chatMessages: [
      {
        senderType: {
          type: String,
          enum: ["user", "worker", "system"],
          default: "system",
        },
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "chatMessages.senderModel",
        },
        senderModel: {
          type: String,
          enum: ["User", "Worker", "System"],
          default: "System",
        },
        message: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        deliveredAt: {
          type: Date,
        },
        readAt: {
          type: Date,
        },
      },
    ],

    trackingSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
