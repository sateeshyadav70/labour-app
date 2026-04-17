const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt";

const User = require("../models/Users");
const protect = require("../middleware/authMiddleware");

const runSessionAuthTest = async () => {
  const originalFindById = User.findById;
  let nextCalled = false;

  User.findById = (id) => ({
    select() {
      return Promise.resolve({
        _id: id,
        name: "Session User",
        email: "session@example.com",
      });
    },
  });

  const req = {
    headers: {},
    session: {
      auth: {
        accountType: "user",
        accountId: "user_789",
      },
    },
  };
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  const next = () => {
    nextCalled = true;
  };

  try {
    await protect(req, res, next);

    assert.equal(nextCalled, true);
    assert.equal(req.user._id, "user_789");
    assert.equal(req.user.email, "session@example.com");
    assert.equal(req.accountType, "user");
  } finally {
    User.findById = originalFindById;
  }
};

const main = async () => {
  await runSessionAuthTest();
  console.log("Auth middleware tests passed.");
};

module.exports = main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
