const assert = require("node:assert/strict");

const Application = require("../models/Application");
const Worker = require("../models/Workers");
const {
  applyJob,
  approveWorker,
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

const runApplyJobTest = async () => {
  const originalCreate = Application.create;
  const originalFindOne = Worker.findOne;
  Application.create = async (payload) => ({
    _id: "app_1",
    ...payload,
    status: "pending",
    save: async () => null,
  });

  const req = {
    body: {
      name: "Worker One",
      email: "worker@example.com",
      phone: "9999999999",
      address: "Test Address",
      password: "secret123",
      services: ["Cleaning", "Plumbing"],
    },
  };
  const res = makeResponse();

  try {
    await applyJob(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.application.email, "worker@example.com");
    assert.deepEqual(res.body.application.services, ["Cleaning", "Plumbing"]);
    assert.equal(res.body.application.status, "pending");
    assert.equal(res.body.worker, null);
    assert.equal(res.body.passwordConfigured, false);
    assert.equal(res.body.generatedPassword, null);
  } finally {
    Application.create = originalCreate;
    Worker.findOne = originalFindOne;
  }
};

const runApplyJobValidationTest = async () => {
  const originalCreate = Application.create;
  let createCalled = false;

  Application.create = async () => {
    createCalled = true;
    return null;
  };

  const req = {
    body: {
      name: "",
      email: "",
      phone: "",
      address: "",
      services: [],
    },
  };
  const res = makeResponse();

  try {
    await applyJob(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "name, phone, and email are required");
    assert.equal(createCalled, false);
  } finally {
    Application.create = originalCreate;
  }
};

const runApproveWorkerTest = async () => {
  const originalFindById = Application.findById;
  const originalFindOne = Worker.findOne;
  const originalCreate = Worker.create;

  const application = {
    _id: "app_2",
    name: "Worker Two",
    email: "worker2@example.com",
    phone: "8888888888",
    address: "Test Address",
    services: ["Electrical"],
    status: "pending",
    worker: null,
    save: async () => {
      application.saved = true;
      return application;
    },
  };

  Application.findById = async (id) => {
    assert.equal(id, "app_2");
    return application;
  };
  Worker.findOne = () => ({
    select: async () => null,
  });
  Worker.create = async (payload) => ({
    _id: "worker_2",
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const req = {
    body: {
      id: "app_2",
    },
  };
  const res = makeResponse();

  try {
    await approveWorker(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.worker.email, "worker2@example.com");
    assert.equal(res.body.application.status, "approved");
    assert.equal(res.body.worker.applicationStatus, "approved");
    assert.equal(res.body.worker.isApproved, true);
    assert.deepEqual(res.body.worker.services, ["Electrical"]);
    assert.equal(typeof res.body.temporaryPassword, "string");
    assert.equal(application.saved, true);
  } finally {
    Application.findById = originalFindById;
    Worker.findOne = originalFindOne;
    Worker.create = originalCreate;
  }
};

const main = async () => {
  await runApplyJobValidationTest();
  await runApplyJobTest();
  await runApproveWorkerTest();
  console.log("Application controller tests passed.");
};

module.exports = main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
