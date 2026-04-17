const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt";

const User = require("../models/Users");
const Worker = require("../models/Workers");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Application = require("../models/Application");
const {
  loginAdmin,
  getStats,
  getApplications,
  getApplicationById,
} = require("../controllers/adminController");

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

const runAdminLoginTest = async () => {
  const originalFindOne = User.findOne;
  const originalCompare = bcrypt.compare;
  let sessionSaved = false;

  User.findOne = async () => ({
    _id: "admin_123",
    name: "Admin User",
    email: "admin@example.com",
    password: "hashed_password",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  bcrypt.compare = async () => true;

  const req = {
    body: {
      email: "admin@example.com",
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
    await loginAdmin(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.accountType, "admin");
    assert.equal(res.body.admin.email, "admin@example.com");
    assert.equal(res.body.token, res.body.data.token);
    assert.equal(sessionSaved, true);
    assert.equal(req.session.auth.accountType, "admin");
    assert.equal(req.session.auth.accountId, "admin_123");
  } finally {
    User.findOne = originalFindOne;
    bcrypt.compare = originalCompare;
  }
};

const runStatsTest = async () => {
  const originalUserCount = User.countDocuments;
  const originalWorkerCount = Worker.countDocuments;
  const originalBookingCount = Booking.countDocuments;
  const originalApplicationCount = Application.countDocuments;
  const originalPaymentAggregate = Payment.aggregate;

  User.countDocuments = async () => 8;
  Worker.countDocuments = async () => 3;
  Booking.countDocuments = async () => 12;
  Application.countDocuments = async () => 2;
  Payment.aggregate = async () => [{ totalRevenue: 1250.5 }];

  const req = {};
  const res = makeResponse();

  try {
    await getStats(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.totalUsers, 8);
    assert.equal(res.body.totalWorkers, 3);
    assert.equal(res.body.totalBookings, 12);
    assert.equal(res.body.totalRevenue, 1250.5);
    assert.equal(res.body.pendingApplications, 2);
  } finally {
    User.countDocuments = originalUserCount;
    Worker.countDocuments = originalWorkerCount;
    Booking.countDocuments = originalBookingCount;
    Application.countDocuments = originalApplicationCount;
    Payment.aggregate = originalPaymentAggregate;
  }
};

const runApplicationsFilterTest = async () => {
  const originalFind = Application.find;
  let capturedQuery = null;

  const applications = [
    {
      _id: "app_1",
      name: "Worker One",
      email: "one@example.com",
      phone: "9999999999",
      address: "Address 1",
      services: ["Cleaning"],
      status: "pending",
      worker: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  Application.find = (query) => {
    capturedQuery = query;
    return {
      populate() {
        return this;
      },
      sort() {
        return Promise.resolve(applications);
      },
    };
  };

  const req = {
    query: { status: "pending" },
  };
  const res = makeResponse();

  try {
    await getApplications(req, res);

    assert.deepEqual(capturedQuery, { status: "pending" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.pendingApplications, 1);
    assert.equal(res.body.applications[0].status, "pending");
  } finally {
    Application.find = originalFind;
  }
};

const runApplicationByIdTest = async () => {
  const originalFindById = Application.findById;
  const applicationId = new mongoose.Types.ObjectId().toString();

  Application.findById = (id) => ({
    populate() {
      return Promise.resolve({
        _id: id,
        name: "Worker Detail",
        email: "detail@example.com",
        phone: "8888888888",
        address: "Address 2",
        services: ["Electrical"],
        status: "approved",
        worker: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
  });

  const req = {
    params: { id: applicationId },
  };
  const res = makeResponse();

  try {
    await getApplicationById(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.application.email, "detail@example.com");
    assert.equal(res.body.application.status, "approved");
  } finally {
    Application.findById = originalFindById;
  }
};

const main = async () => {
  await runAdminLoginTest();
  await runStatsTest();
  await runApplicationsFilterTest();
  await runApplicationByIdTest();
  console.log("Admin controller tests passed.");
};

module.exports = main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
