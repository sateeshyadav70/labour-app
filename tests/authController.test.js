const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt";

const User = require("../models/Users");
const Worker = require("../models/Workers");
const { registerUser, loginUser } = require("../controllers/authController");

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

const runRegisterTest = async () => {
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  const originalGenSalt = bcrypt.genSalt;
  const originalHash = bcrypt.hash;

  User.findOne = async () => null;
  User.create = async (payload) => ({
    _id: "user_123",
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  bcrypt.genSalt = async () => "salt";
  bcrypt.hash = async () => "hashed_password";

  const req = {
    body: {
      name: "Demo User",
      email: "demo@example.com",
      password: "secret123",
      phone: "9999999999",
    },
  };
  const res = makeResponse();

  try {
    await registerUser(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "User registered successfully");
    assert.equal(res.body.token, res.body.data.token);
    assert.equal(res.body.accountType, "user");
    assert.equal(res.body.user.email, "demo@example.com");
    assert.equal(res.body.user.role, "user");
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    bcrypt.genSalt = originalGenSalt;
    bcrypt.hash = originalHash;
  }
};

const runInvalidLoginTest = async () => {
  const originalFindOne = User.findOne;
  const originalCompare = bcrypt.compare;

  User.findOne = async () => ({
    _id: "user_123",
    name: "Demo User",
    email: "demo@example.com",
    password: "hashed_password",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  Worker.findOne = async () => null;
  bcrypt.compare = async () => false;

  const req = {
    body: {
      email: "demo@example.com",
      password: "wrong-password",
    },
  };
  const res = makeResponse();

  try {
    await loginUser(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Invalid credentials");
  } finally {
    User.findOne = originalFindOne;
    bcrypt.compare = originalCompare;
  }
};

const runLoginSuccessTest = async () => {
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  const originalCompare = bcrypt.compare;
  let saveCalled = false;
  let sessionSaved = false;

  User.findOne = async () => ({
    _id: "user_456",
    name: "Demo User",
    email: "demo@example.com",
    password: "hashed_password",
    role: "user",
    lastLoginAt: null,
    save: async function () {
      saveCalled = true;
      return this;
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  User.create = async () => {
    throw new Error("create should not be called during login");
  };
  bcrypt.compare = async () => true;

  const req = {
    body: {
      email: "demo@example.com",
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
    await loginUser(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.accountType, "user");
    assert.equal(res.body.user.email, "demo@example.com");
    assert.equal(res.body.token, res.body.data.token);
    assert.equal(res.body.user.lastLoginAt instanceof Date, true);
    assert.equal(saveCalled, true);
    assert.equal(sessionSaved, true);
    assert.equal(req.session.auth.accountType, "user");
    assert.equal(req.session.auth.accountId, "user_456");
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    bcrypt.compare = originalCompare;
  }
};

const runAdminLoginBlockedTest = async () => {
  const originalUserFindOne = User.findOne;
  const originalWorkerFindOne = Worker.findOne;
  const originalCompare = bcrypt.compare;

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
  };
  const res = makeResponse();

  try {
    await loginUser(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Use admin login");
  } finally {
    User.findOne = originalUserFindOne;
    Worker.findOne = originalWorkerFindOne;
    bcrypt.compare = originalCompare;
  }
};

const main = async () => {
  await runRegisterTest();
  await runInvalidLoginTest();
  await runLoginSuccessTest();
  await runAdminLoginBlockedTest();
  console.log("Auth controller tests passed.");
};

module.exports = main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
