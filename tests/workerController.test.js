const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt";

const Booking = require("../models/Booking");
const Worker = require("../models/Workers");
const {
  acceptBooking,
  getWorkerBookings,
  getEarnings,
} = require("../controllers/workerController");

const makeResponse = () => {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
};

const runAcceptBookingBodyTest = async () => {
  const bookingId = new mongoose.Types.ObjectId().toString();
  const workerId = new mongoose.Types.ObjectId().toString();

  const booking = {
    _id: bookingId,
    user: new mongoose.Types.ObjectId().toString(),
    worker: null,
    serviceId: "service_1",
    serviceType: "Cleaning",
    status: "pending",
    paymentStatus: "pending",
    broadcastHistory: [],
    trackingSnapshot: null,
    save: async () => booking,
  };

  const originalFindById = Booking.findById;
  const originalFindOneAndUpdate = Booking.findOneAndUpdate;
  const originalFindByIdAndUpdate = Worker.findByIdAndUpdate;

  Booking.findById = async (id) => {
    assert.equal(String(id), bookingId);
    return booking;
  };
  Booking.findOneAndUpdate = async () => {
    booking.worker = workerId;
    booking.status = "accepted";
    return booking;
  };
  Worker.findByIdAndUpdate = async (id, update) => ({
    _id: id,
    ...update,
  });

  const req = {
    body: { bookingId },
    params: {},
    user: { _id: workerId },
    app: { get: () => null },
  };
  const res = makeResponse();

  try {
    await acceptBooking(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.booking.status, "accepted");
    assert.equal(booking.status, "accepted");
    assert.equal(String(booking.worker), workerId);
  } finally {
    Booking.findById = originalFindById;
    Booking.findOneAndUpdate = originalFindOneAndUpdate;
    Worker.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
};

const runWorkerBookingsShapeTest = async () => {
  const workerId = new mongoose.Types.ObjectId().toString();
  const bookings = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user: new mongoose.Types.ObjectId().toString(),
      worker: workerId,
      serviceId: "service_1",
      serviceType: "Cleaning",
      status: "pending",
      paymentStatus: "pending",
      save: async () => bookings[0],
    },
  ];

  const originalFind = Booking.find;
  Booking.find = () => ({
    populate() {
      return this;
    },
    sort() {
      return Promise.resolve(bookings);
    },
  });

  const req = {
    user: { _id: workerId },
  };
  const res = makeResponse();

  try {
    await getWorkerBookings(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.bookings), true);
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.bookings.length, 1);
    assert.equal(res.body.data.length, 1);
  } finally {
    Booking.find = originalFind;
  }
};

const runWorkerLoginBlockedTest = async () => {
  const originalFindOne = Worker.findOne;
  const originalCompare = bcrypt.compare;

  Worker.findOne = async () => ({
    _id: "worker_blocked",
    name: "Blocked Worker",
    email: "blocked@example.com",
    password: "hashed_password",
    isVerified: false,
    isApproved: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  bcrypt.compare = async () => true;

  const req = {
    body: {
      email: "blocked@example.com",
      password: "secret123",
    },
  };
  const res = makeResponse();

  try {
    const { loginWorker } = require("../controllers/workerController");
    await loginWorker(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Admin approval required");
  } finally {
    Worker.findOne = originalFindOne;
    bcrypt.compare = originalCompare;
  }
};

const runWorkerLoginSuccessTest = async () => {
  const originalFindOne = Worker.findOne;
  const originalCompare = bcrypt.compare;
  let sessionSaved = false;

  Worker.findOne = async () => ({
    _id: "worker_123",
    name: "Demo Worker",
    email: "worker@example.com",
    password: "hashed_password",
    isVerified: true,
    isApproved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  bcrypt.compare = async () => true;

  const req = {
    body: {
      email: "worker@example.com",
      password: "secret123",
    },
    session: {
      cookie: {},
      save(callback) {
        sessionSaved = true;
        callback?.();
      },
    },
  };
  const res = makeResponse();

  try {
    const { loginWorker } = require("../controllers/workerController");
    await loginWorker(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.accountType, "worker");
    assert.equal(res.body.worker.email, "worker@example.com");
    assert.equal(res.body.token, res.body.data.token);
    assert.equal(sessionSaved, true);
    assert.equal(req.session.auth.accountType, "worker");
    assert.equal(req.session.auth.accountId, "worker_123");
  } finally {
    Worker.findOne = originalFindOne;
    bcrypt.compare = originalCompare;
  }
};

const runEarningsShapeTest = async () => {
  const workerId = new mongoose.Types.ObjectId().toString();
  const paidAt = new Date();
  const bookings = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user: new mongoose.Types.ObjectId().toString(),
      worker: workerId,
      serviceId: "service_1",
      serviceType: "Cleaning",
      status: "completed",
      paymentStatus: "paid",
      estimatedAmount: 499,
      payment: { paidAt },
      createdAt: paidAt,
      updatedAt: paidAt,
      save: async () => bookings[0],
    },
  ];

  const originalFind = Booking.find;
  Booking.find = () => ({
    populate() {
      return this;
    },
    sort() {
      return Promise.resolve(bookings);
    },
  });

  const req = {
    user: { _id: workerId },
    query: { range: "today" },
  };
  const res = makeResponse();

  try {
    await getEarnings(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.earnings), true);
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.total, 499);
    assert.equal(res.body.earnings.length, 1);
    assert.equal(res.body.data.length, 1);
  } finally {
    Booking.find = originalFind;
  }
};

const main = async () => {
  await runAcceptBookingBodyTest();
  await runWorkerBookingsShapeTest();
  await runWorkerLoginBlockedTest();
  await runWorkerLoginSuccessTest();
  await runEarningsShapeTest();
  console.log("Worker controller tests passed.");
};

module.exports = main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
