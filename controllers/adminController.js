const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/Users");
const Worker = require("../models/Workers");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Application = require("../models/Application");
const generateToken = require("../utils/generateToken");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { persistAuthSession } = require("../utils/authSession");
const {
  serializeUser,
  serializeWorker,
  serializeBooking,
  serializePaymentRecord,
} = require("../utils/serializers");

const serializeApplication = (application) => {
  if (!application) {
    return null;
  }

  const worker =
    application.worker && typeof application.worker.toObject === "function"
      ? application.worker.toObject()
      : application.worker && application.worker.name
      ? application.worker
      : null;

  return {
    _id: application._id,
    name: application.name,
    email: application.email,
    phone: application.phone,
    address: application.address,
    services: Array.isArray(application.services) ? application.services : [],
    status: application.status,
    worker: worker ? serializeWorker(worker) : null,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
};

const userAccountFilter = {
  $or: [{ role: "user" }, { role: { $exists: false } }, { role: null }],
};

const normalizeServices = (...values) => {
  for (const services of values) {
    if (!Array.isArray(services)) {
      continue;
    }

    const normalized = services
      .map((service) => (typeof service === "string" ? service.trim() : ""))
      .filter(Boolean);

    if (normalized.length) {
      return normalized;
    }
  }

  return [];
};

const normalizePaymentStatus = (value) => {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (["success", "paid", "completed"].includes(status)) {
    return "completed";
  }

  if (["failed", "error"].includes(status)) {
    return "failed";
  }

  return "pending";
};

const buildPaymentSummary = async () => {
  const payments = await Payment.find({})
    .sort({ createdAt: -1, _id: -1 })
    .populate("bookingId", "user worker serviceId serviceType address date status paymentStatus");

  const paymentHistory = payments.map((payment) => {
    const booking =
      payment.bookingId && typeof payment.bookingId.toObject === "function"
        ? payment.bookingId.toObject()
        : payment.bookingId || null;

    return {
      ...serializePaymentRecord(payment),
      booking: booking ? serializeBooking(booking) : null,
    };
  });

  const completedPayments = paymentHistory.filter((payment) =>
    normalizePaymentStatus(payment.status) === "completed"
  );
  const failedPayments = paymentHistory.filter((payment) =>
    normalizePaymentStatus(payment.status) === "failed"
  );
  const pendingPayments = paymentHistory.filter((payment) =>
    normalizePaymentStatus(payment.status) === "pending"
  );

  const totalRevenue = completedPayments.reduce((sum, payment) => {
    const amount = Number(payment.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return {
    payments: paymentHistory,
    count: paymentHistory.length,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    completedPayments: completedPayments.length,
    failedPayments: failedPayments.length,
    pendingPayments: pendingPayments.length,
  };
};

const findWorkerForApplication = async (application) => {
  if (!application) {
    return null;
  }

  if (application.worker) {
    const workerId =
      typeof application.worker === "object" && application.worker._id
        ? application.worker._id
        : application.worker;

    if (workerId && mongoose.Types.ObjectId.isValid(String(workerId))) {
      return Worker.findById(workerId);
    }
  }

  if (application.email) {
    return Worker.findOne({ email: application.email });
  }

  return null;
};

const syncWorkerFromApplication = async (application, approve = true) => {
  let worker = await findWorkerForApplication(application);
  let temporaryPassword = null;
  const applicationServices = normalizeServices(application.services);

  if (approve) {
    if (!worker) {
      temporaryPassword = crypto.randomBytes(8).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

      worker = await Worker.create({
        name: application.name || "",
        email: application.email || "",
        password: hashedPassword,
        phone: application.phone || "",
        address: application.address || "",
        skills: applicationServices,
        services: applicationServices,
        isVerified: true,
        isApproved: true,
        isAvailable: true,
        isOnline: false,
        applicationStatus: "approved",
      });
    } else {
      worker.name = application.name || worker.name;
      worker.email = application.email || worker.email;
      worker.phone = application.phone || worker.phone;
      worker.address = application.address || worker.address;
      worker.skills = applicationServices.length ? applicationServices : worker.skills;
      worker.services = applicationServices.length
        ? applicationServices
        : normalizeServices(worker.services, worker.skills);
      worker.isVerified = true;
      worker.isApproved = true;
      worker.isAvailable = true;
      worker.isOnline = false;
      worker.applicationStatus = "approved";
      await worker.save();
    }
  } else if (worker) {
    worker.isVerified = false;
    worker.isApproved = false;
    worker.isAvailable = false;
    worker.isOnline = false;
    worker.applicationStatus = "rejected";
    await worker.save();
  }

  return { worker, temporaryPassword };
};

exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body || {};

  try {
    if (!email || !password) {
      return sendError(res, 400, "Email and password are required");
    }

    const admin = await User.findOne({ email, role: "admin" });

    if (!admin) {
      return sendError(res, 401, "Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(password, admin.password);

    if (!passwordMatches) {
      return sendError(res, 401, "Invalid credentials");
    }

    const token = generateToken(admin._id);
    await persistAuthSession(req, {
      accountType: "admin",
      accountId: admin._id,
      email: admin.email,
      name: admin.name,
    });

    return sendSuccess(res, "Admin login successful", {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      admin: serializeUser(admin),
      token,
      accountType: "admin",
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalWorkers, totalBookings, pendingApplications, revenueSummary] =
      await Promise.all([
        User.countDocuments(userAccountFilter),
        Worker.countDocuments({}),
        Booking.countDocuments({}),
        Application.countDocuments({ status: "pending" }),
        Payment.aggregate([
          {
            $match: {
              status: { $in: ["success", "paid", "completed"] },
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
            },
          },
        ]),
      ]);

    return sendSuccess(res, "Dashboard stats fetched successfully", {
      totalUsers,
      totalWorkers,
      totalBookings,
      totalRevenue: Number((revenueSummary[0]?.totalRevenue || 0).toFixed(2)),
      pendingApplications,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find(userAccountFilter).sort({ createdAt: -1 });

    return sendSuccess(res, "Users fetched successfully", {
      users: users.map(serializeUser),
      count: users.length,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find({}).select("-password").sort({ createdAt: -1 });

    return sendSuccess(res, "Workers fetched successfully", {
      workers: workers.map(serializeWorker),
      count: workers.length,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate([
        {
          path: "user",
          select: "name email phone address role addressBook pinnedLocation createdAt updatedAt",
        },
        {
          path: "worker",
          select: "-password",
        },
      ])
      .sort({ createdAt: -1 });

    return sendSuccess(res, "Bookings fetched successfully", {
      bookings: bookings.map(serializeBooking),
      count: bookings.length,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getPayments = async (req, res) => {
  try {
    const summary = await buildPaymentSummary();

    return sendSuccess(res, "Payments fetched successfully", summary);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getApplications = async (req, res) => {
  try {
    const { status } = req.query || {};
    const query = {};

    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();

      if (!["pending", "approved", "rejected"].includes(normalizedStatus)) {
        return sendError(res, 400, "Invalid application status");
      }

      query.status = normalizedStatus;
    }

    const applications = await Application.find(query)
      .populate({
        path: "worker",
        select: "-password",
      })
      .sort({ createdAt: -1 });

    return sendSuccess(res, "Applications fetched successfully", {
      applications: applications.map(serializeApplication),
      count: applications.length,
      pendingApplications: applications.filter((application) => application.status === "pending").length,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid application id");
    }

    const application = await Application.findById(id).populate({
      path: "worker",
      select: "-password",
    });

    if (!application) {
      return sendError(res, 404, "Application not found");
    }

    return sendSuccess(res, "Application fetched successfully", {
      application: serializeApplication(application),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.approveWorker = async (req, res) => {
  try {
    const applicationId = req.body?.applicationId || req.body?.id;

    if (!applicationId) {
      return sendError(res, 400, "applicationId is required");
    }

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return sendError(res, 400, "Invalid application id");
    }

    const application = await Application.findById(applicationId).populate({
      path: "worker",
      select: "-password",
    });

    if (!application) {
      return sendError(res, 404, "Application not found");
    }

    if (application.status === "approved") {
      return sendError(res, 409, "Application already approved");
    }

    const { worker, temporaryPassword } = await syncWorkerFromApplication(application, true);

    application.status = "approved";
    application.worker = worker?._id || application.worker;
    await application.save();

    const refreshedApplication = await Application.findById(application._id).populate({
      path: "worker",
      select: "-password",
    });

    return sendSuccess(res, "Worker approved successfully", {
      application: serializeApplication(refreshedApplication || application),
      worker: worker ? serializeWorker(worker) : null,
      temporaryPassword,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.rejectWorker = async (req, res) => {
  try {
    const applicationId = req.body?.applicationId || req.body?.id;

    if (!applicationId) {
      return sendError(res, 400, "applicationId is required");
    }

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return sendError(res, 400, "Invalid application id");
    }

    const application = await Application.findById(applicationId).populate({
      path: "worker",
      select: "-password",
    });

    if (!application) {
      return sendError(res, 404, "Application not found");
    }

    if (application.status === "rejected") {
      return sendError(res, 409, "Application already rejected");
    }

    const { worker } = await syncWorkerFromApplication(application, false);

    application.status = "rejected";
    await application.save();

    const refreshedApplication = await Application.findById(application._id).populate({
      path: "worker",
      select: "-password",
    });

    return sendSuccess(res, "Worker rejected successfully", {
      application: serializeApplication(refreshedApplication || application),
      worker: worker ? serializeWorker(worker) : null,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
