const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const connectDB = require("./config/db");
const User = require("./models/Users");
const Worker = require("./models/Workers");
const Booking = require("./models/Booking");
const { Server } = require("socket.io");
const { parseLocationInput } = require("./utils/coordinates");
const { sendSuccess } = require("./utils/apiResponse");
const { buildTrackingSnapshot, normalizeLocationInput } = require("./utils/tracking");
const {
  emitTrackingUpdate,
} = require("./utils/bookingRealtime");
const {
  getBookingRecord,
  patchBookingRecord,
  setBookingRecord,
} = require("./utils/runtimeStore");
const { serializeBooking, serializeTrackingSnapshot } = require("./utils/serializers");
const requestLogger = require("./middleware/requestLogger");
const notFoundHandler = require("./middleware/notFoundHandler");
const errorHandler = require("./middleware/errorHandler");
const { sessionMaxAge } = require("./utils/authSession");

dotenv.config();

// GLOBAL ERROR HANDLING
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

const app = express();
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === "production";

// SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

// MIDDLEWARE
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(requestLogger);
app.use(express.json());
app.use(
  session({
    name: process.env.SESSION_COOKIE_NAME || "labour.sid",
    secret:
      process.env.SESSION_SECRET ||
      process.env.JWT_SECRET ||
      "labour-backend-session",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: sessionMaxAge,
    },
  })
);

// ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/worker", require("./routes/workerRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/booking", require("./routes/bookingRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/tracking", require("./routes/trackingRoutes"));
app.use("/api", require("./routes/accountRoutes"));
app.use("/api", require("./routes/publicRoutes"));

// HEALTH CHECK
const healthHandler = (req, res) => {
  return sendSuccess(res, "Server is healthy", {
    ok: true,
    timestamp: new Date().toISOString(),
  });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

const emitInitialTrackingSnapshot = async (socket, bookingId) => {
  if (!bookingId) {
    return null;
  }

  const cached = getBookingRecord(bookingId);
  const bookingDoc = cached?.booking
    ? cached.booking
    : await Booking.findById(bookingId);

  if (!bookingDoc) {
    return null;
  }

  const trackingSnapshot =
    cached?.trackingSnapshot ||
    bookingDoc.trackingSnapshot ||
    buildTrackingSnapshot(bookingDoc, {
      bookingId,
      workerId: bookingDoc.worker,
      serviceId: bookingDoc.serviceId,
      status: bookingDoc.status,
      paymentStatus: bookingDoc.paymentStatus,
      address: bookingDoc.address,
      etaMinutes: bookingDoc.estimatedTime,
      updatedAt: bookingDoc.updatedAt,
    });

  const payload = serializeTrackingSnapshot(trackingSnapshot);

  socket.emit("tracking:snapshot", payload);
  socket.emit("receiveLocation", payload);
  socket.emit("tracking:update", payload);

  return payload;
};

const bookingRoomName = (bookingId) => {
  if (!bookingId) {
    return null;
  }

  return `booking:${String(bookingId)}`;
};

const legacyBookingRoomName = (bookingId) => {
  if (!bookingId) {
    return null;
  }

  return String(bookingId);
};

// SOCKET AUTH
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      socket.userType = "anonymous";
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.auth = decoded;

    const worker = await Worker.findById(decoded.id).select("-password");

    if (worker && worker.isApproved !== false && worker.isVerified !== false) {
      socket.worker = worker;
      socket.userType = "worker";
      return next();
    }

    const user = await User.findById(decoded.id).select("-password");

    if (user) {
      socket.user = user;
      socket.userType = "user";
      return next();
    }

    socket.userType = "anonymous";
    next();
  } catch (err) {
    socket.userType = "anonymous";
    next();
  }
});

// SOCKET EVENTS
io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id} (${socket.userType})`);

  // worker auto room join
  if (socket.userType === "worker" && socket.worker) {
    const room = `worker:${socket.worker._id}`;
    socket.join(room);
    console.log(`Worker joined room: ${room}`);
  }

  if (socket.userType === "user" && socket.user) {
    const room = `user:${socket.user._id}`;
    socket.join(room);
    console.log(`User joined room: ${room}`);
  }

  // join booking room
  socket.on("joinRoom", async (bookingId, ack) => {
    if (bookingId) {
      socket.join(bookingRoomName(bookingId));
      socket.join(legacyBookingRoomName(bookingId));
      const snapshot = await emitInitialTrackingSnapshot(socket, bookingId);

      if (typeof ack === "function") {
        ack({
          success: true,
          bookingId: String(bookingId),
          trackingSnapshot: snapshot,
        });
      }
    }
  });

  socket.on("joinBookingRoom", async (bookingId, ack) => {
    if (bookingId) {
      socket.join(bookingRoomName(bookingId));
      socket.join(legacyBookingRoomName(bookingId));
      const snapshot = await emitInitialTrackingSnapshot(socket, bookingId);

      if (typeof ack === "function") {
        ack({
          success: true,
          bookingId: String(bookingId),
          trackingSnapshot: snapshot,
        });
      }
    }
  });

  // join worker room manually
  socket.on("joinWorkerRoom", (workerId) => {
    if (workerId && (!socket.worker || String(socket.worker._id) === String(workerId))) {
      socket.join(`worker:${workerId}`);
    }
  });

  socket.on("joinUserRoom", (userId) => {
    if (userId && (!socket.user || String(socket.user._id) === String(userId))) {
      socket.join(`user:${userId}`);
    }
  });

  // leave room
  socket.on("leaveRoom", (bookingId) => {
    if (bookingId) {
      socket.leave(bookingRoomName(bookingId));
      socket.leave(legacyBookingRoomName(bookingId));
    }
  });

  // LIVE LOCATION
  socket.on("sendLocation", async (data = {}) => {
    const roomId = data?.bookingId || data?.roomId;
    const normalizedLocation = normalizeLocationInput(data.location || data);
    const latitude =
      normalizedLocation.latitude ?? data.latitude ?? data.lat ?? data.location?.lat ?? null;
    const longitude =
      normalizedLocation.longitude ?? data.longitude ?? data.lng ?? data.location?.lng ?? null;
    const status = data.status || null;
    const updatedAt = normalizedLocation.updatedAt || new Date().toISOString();
    let payload = {
      bookingId: data.bookingId || null,
      workerId: data.workerId || socket.worker?._id || null,
      serviceId: data.serviceId || null,
      status,
      paymentStatus: data.paymentStatus || null,
      stepIndex: data.stepIndex ?? null,
      progress: data.progress ?? null,
      label: data.label || null,
      subtitle: data.subtitle || null,
      zone: data.zone || null,
      address: data.address || null,
      etaMinutes: normalizedLocation.etaMinutes ?? data.etaMinutes ?? null,
      latitude,
      longitude,
      heading: normalizedLocation.heading ?? data.heading ?? null,
      speed: normalizedLocation.speed ?? data.speed ?? null,
      updatedAt,
    };

    if (data.bookingId) {
      try {
        const booking = await Booking.findById(data.bookingId);

        if (booking) {
          const trackingSnapshot = buildTrackingSnapshot(booking, {
            ...payload,
            bookingId: booking._id,
            workerId: payload.workerId || booking.worker,
            serviceId: payload.serviceId || booking.serviceId,
            status: payload.status || booking.status,
            paymentStatus: payload.paymentStatus || booking.paymentStatus,
            address: payload.address || booking.address,
            etaMinutes: payload.etaMinutes,
            latitude,
            longitude,
            heading: payload.heading,
            speed: payload.speed,
            updatedAt,
          });

          booking.trackingSnapshot = trackingSnapshot;

          if (latitude !== null && longitude !== null) {
            booking.trackingHistory = Array.isArray(booking.trackingHistory)
              ? booking.trackingHistory
              : [];
            booking.trackingHistory.push({
              lat: latitude,
              lng: longitude,
              accuracy: Number.isFinite(Number(data.accuracy))
                ? Number(data.accuracy)
                : undefined,
              source: data.source || "worker",
              recordedAt: new Date(updatedAt),
            });
          }

          await booking.save();

          const bookingPayload = serializeBooking(booking);
          setBookingRecord(booking._id, {
            booking: bookingPayload,
            trackingSnapshot,
            payment: booking.payment || null,
          });

          payload = serializeTrackingSnapshot(trackingSnapshot);
          emitTrackingUpdate(io, booking, trackingSnapshot);
        }
      } catch (error) {
        console.error("Failed to persist tracking update:", error.message);
      }
    }

    if (roomId && !data.bookingId) {
      const bookingRoom = roomId && String(roomId).startsWith("booking:")
        ? String(roomId)
        : bookingRoomName(roomId);
      io.to(bookingRoom).emit("receiveLocation", payload);
      io.to(bookingRoom).emit("tracking:update", payload);
      io.to(bookingRoom).emit("tracking:snapshot", payload);
    }
  });

  // CHAT
  socket.on("sendMessage", async (data = {}) => {
    const { bookingId, message } = data || {};
    const createdAt = data.createdAt || new Date().toISOString();

    if (!bookingId || !message) {
      return;
    }

    const payload = {
      ...data,
      createdAt,
    };

    const room = bookingRoomName(bookingId);
    io.to(room).emit("receiveMessage", payload);
    io.to(room).emit("chat:message", payload);

    try {
      await Booking.findByIdAndUpdate(bookingId, {
        $push: {
          chatMessages: {
            senderType: data.senderType || "system",
            sender: data.senderId || data.sender || undefined,
            senderModel: data.senderModel || "System",
            message,
            createdAt: new Date(createdAt),
            deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : undefined,
            readAt: data.readAt ? new Date(data.readAt) : undefined,
          },
        },
      });
    } catch (error) {
      console.error("Failed to persist chat message:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

// SERVER START
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Listening on 0.0.0.0:${PORT}`);
    });

    connectDB().catch((error) => {
        console.error("❌ DB CONNECTION ERROR:", error);
      });
  } catch (error) {
    console.error("❌ SERVER START ERROR:", error);
    process.exit(1);
  }
};

// PORT ERROR HANDLE
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} already in use`);
    process.exit(1);
  }

  console.error("❌ SERVER ERROR:", error);
  process.exit(1);
});

startServer();

app.use(notFoundHandler);
app.use(errorHandler);
