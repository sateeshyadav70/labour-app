const mongoose = require("mongoose");
const crypto = require("crypto");
const Worker = require("../models/Workers");
const Booking = require("../models/Booking");
const Application = require("../models/Application");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const { calculateDistanceKm, isValidCoordinate } = require("../utils/distance");
const estimateTimeMins = require("../utils/timeEstimate");
const { parseCoordinateQuery, parseLocationInput } = require("../utils/coordinates");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { persistAuthSession } = require("../utils/authSession");
const {
  serializeWorker,
  serializeWorkerSearchResult,
  serializeBooking,
} = require("../utils/serializers");
const {
  findHomeServiceById,
  getHomeServiceSkillTags,
  normalizeId,
} = require("../data/homeCatalog");
const {
  acceptBooking: acceptBookingFlow,
  rejectBooking: rejectBookingFlow,
} = require("./bookingController");

const roundDistance = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(1));
};

const roundTime = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getRequestLocationContext = (req) => {
  const queryLocation = parseCoordinateQuery(req.query);

  if (queryLocation) {
    return {
      location: queryLocation,
      source: "query",
    };
  }

  const addressBookId = req.query.addressBookId || req.query.selectedAddressId || null;
  const user = req.user;

  if (!user) {
    return {
      location: null,
      source: null,
    };
  }

  const pinned = user.pinnedLocation;
  if (pinned && isValidCoordinate({ lat: pinned.lat, lng: pinned.lng })) {
    return {
      location: {
        lat: pinned.lat,
        lng: pinned.lng,
      },
      source: "pinned-location",
      addressBookId: pinned.addressBookId || null,
    };
  }

  const addressBook = Array.isArray(user.addressBook) ? user.addressBook : [];
  const selectedAddress =
    addressBook.find((entry) => String(entry._id) === String(addressBookId)) ||
    addressBook.find((entry) => entry.isDefault);

  if (selectedAddress && isValidCoordinate(selectedAddress)) {
    return {
      location: {
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
      },
      source: addressBookId ? "selected-address" : "default-address",
      addressBookId: selectedAddress._id || null,
    };
  }

  return {
    location: null,
    source: null,
    addressBookId: null,
  };
};

const buildServiceFilterTerms = (serviceId, skill, serviceType) => {
  const terms = new Set();

  const addTerms = (values) => {
    for (const value of values || []) {
      const normalized = normalizeText(value);
      if (normalized) {
        terms.add(normalized);
      }
    }
  };

  addTerms([skill, serviceType]);

  if (serviceId) {
    const service = findHomeServiceById(serviceId);
    if (service) {
      addTerms([service.id, service.serviceId, service.title, service.category]);
      addTerms(getHomeServiceSkillTags(service.id));
    } else {
      addTerms([serviceId]);
    }
  }

  return [...terms];
};

const matchesServiceFilter = (worker, terms = []) => {
  if (!terms.length) {
    return true;
  }

  if (!worker || !Array.isArray(worker.skills)) {
    return false;
  }

  const workerSkills = worker.skills.map(normalizeText);

  return terms.some((term) => workerSkills.includes(term));
};

const getSortedWorkers = (workers = [], userLocation = null) => {
  const workersWithMeta = workers.map((worker) => {
    const workerLocation = worker.location && isValidCoordinate(worker.location) ? worker.location : null;
    const distanceKm =
      workerLocation && userLocation ? calculateDistanceKm(userLocation, workerLocation) : null;
    const timeMins = distanceKm === null ? null : estimateTimeMins(distanceKm);

    return serializeWorkerSearchResult(worker, {
      distance: roundDistance(distanceKm),
      time: roundTime(timeMins),
      etaMinutes: roundTime(timeMins),
      price: worker.hourlyRate ?? null,
    });
  });

  workersWithMeta.sort((a, b) => {
    const aHasDistance = typeof a.distance === "number";
    const bHasDistance = typeof b.distance === "number";

    if (aHasDistance && bHasDistance) {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }

      if ((b.rating || 0) !== (a.rating || 0)) {
        return (b.rating || 0) - (a.rating || 0);
      }

      return (b.experience || 0) - (a.experience || 0);
    }

    if (aHasDistance) {
      return -1;
    }

    if (bHasDistance) {
      return 1;
    }

    if ((b.rating || 0) !== (a.rating || 0)) {
      return (b.rating || 0) - (a.rating || 0);
    }

    return (b.experience || 0) - (a.experience || 0);
  });

  return workersWithMeta;
};

const buildFilterMeta = (req, serviceId, locationContext, terms) => ({
  serviceId: serviceId || null,
  locationSource: locationContext.source || null,
  addressBookId: locationContext.addressBookId || null,
  filterTerms: terms,
  hasNearbyContext: Boolean(locationContext.location),
});

const normalizeServiceList = (services) => {
  if (!Array.isArray(services)) {
    if (typeof services === "string" && services.trim()) {
      return [services.trim()];
    }

    return [];
  }

  return services
    .map((service) => (typeof service === "string" ? service.trim() : ""))
    .filter(Boolean);
};

const resolveWorkerServices = (...values) => {
  for (const value of values) {
    const normalized = normalizeServiceList(value);
    if (normalized.length) {
      return normalized;
    }
  }

  return [];
};

exports.applyJob = async (req, res) => {
  try {
    const payload = req.body || {};
    const normalizedServices = normalizeServiceList(payload.services);

    if (!payload.name || !payload.phone || !payload.email) {
      return sendError(res, 400, "name, phone, and email are required");
    }

    if (!normalizedServices.length) {
      return sendError(res, 400, "services is required");
    }

    if (!payload.address) {
      return sendError(res, 400, "address is required");
    }

    const application = await Application.create({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      services: normalizedServices,
      worker: null,
      status: "pending",
    });

    return sendSuccess(
      res,
      "Application submitted successfully",
      {
        application,
        worker: null,
        passwordConfigured: false,
        generatedPassword: null,
      },
      201
    );
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.approveWorker = async (req, res) => {
  try {
    const id = req.body?.id || req.body?.applicationId;

    if (!id) {
      return sendError(res, 400, "id is required");
    }

    const application = await Application.findById(id);

    if (!application) {
      return sendError(res, 404, "Application not found");
    }

    if (application.status === "approved") {
      return sendError(res, 409, "Application already approved");
    }

    const existingWorker = await Worker.findOne({ email: application.email }).select("-password");

    if (existingWorker) {
      existingWorker.isVerified = true;
      existingWorker.isApproved = true;
      existingWorker.isAvailable = true;
      existingWorker.isOnline = false;
      existingWorker.applicationStatus = "approved";
      existingWorker.address = application.address || existingWorker.address;
      existingWorker.skills = normalizeServiceList(application.services);
      existingWorker.services = normalizeServiceList(application.services);
      await existingWorker.save();

      application.worker = existingWorker._id;
      application.status = "approved";
      await application.save();

      return sendSuccess(res, "Worker already exists", {
        worker: serializeWorker(existingWorker),
        application,
      });
    }

    const temporaryPassword = crypto.randomBytes(8).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

    const worker = await Worker.create({
      name: application.name,
      email: application.email,
      password: hashedPassword,
      phone: application.phone,
      address: application.address || "",
      skills: normalizeServiceList(application.services),
      services: normalizeServiceList(application.services),
      isVerified: true,
      isApproved: true,
      isAvailable: true,
      isOnline: false,
      applicationStatus: "approved",
    });

    application.worker = worker._id;
    application.status = "approved";
    await application.save();

    return sendSuccess(res, "Worker approved successfully", {
      worker: serializeWorker(worker),
      application,
      temporaryPassword,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// Register Worker
exports.registerWorker = async (req, res) => {
    const { name, email, password, phone, skills, services, location, address } = req.body || {};

  try {
    if (!name || !email || !password || !phone) {
      return sendError(
        res,
        400,
        "Name, email, password, and phone are required"
      );
    }

    const workerExists = await Worker.findOne({ email });

    if (workerExists) {
      return sendError(res, 400, "Worker already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const worker = await Worker.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address: address || "",
      skills: resolveWorkerServices(skills, services),
      services: resolveWorkerServices(services, skills),
      location: parseLocationInput(location) || undefined,
      applicationStatus: "approved",
      isVerified: true,
      isApproved: true,
    });

    const token = generateToken(worker._id);
    await persistAuthSession(req, {
      accountType: "worker",
      accountId: worker._id,
      email: worker.email,
      name: worker.name,
    });

    return sendSuccess(
      res,
      "Worker registered successfully",
      {
        _id: worker._id,
        name: worker.name,
        email: worker.email,
        worker: serializeWorker(worker),
        token,
        accountType: "worker",
      },
      201
    );
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// Login Worker
exports.loginWorker = async (req, res) => {
  const { email, password } = req.body || {};

  try {
    if (!email || !password) {
      return sendError(res, 400, "Email and password are required");
    }

    const worker = await Worker.findOne({ email });

    if (worker && (worker.isApproved === false || worker.isVerified === false)) {
      return sendError(res, 403, "Admin approval required");
    }

    if (worker && (await bcrypt.compare(password, worker.password))) {
      const token = generateToken(worker._id);
      await persistAuthSession(req, {
        accountType: "worker",
        accountId: worker._id,
        email: worker.email,
        name: worker.name,
      });

      return sendSuccess(res, "Login successful", {
        _id: worker._id,
      name: worker.name,
      email: worker.email,
      worker: serializeWorker(worker),
      token,
      accountType: "worker",
      });
    }

    return sendError(res, 401, "Invalid credentials");
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// Update Worker Profile
exports.updateWorkerProfile = async (req, res) => {
  try {
    const worker = await Worker.findById(req.user._id);

    if (!worker) {
      return sendError(res, 404, "Worker not found");
    }

    worker.name = req.body.name || worker.name;
    worker.phone = req.body.phone || worker.phone;
    worker.address = req.body.address || worker.address;
    worker.skills = resolveWorkerServices(req.body.skills, req.body.services, worker.skills);
    worker.services = resolveWorkerServices(req.body.services, req.body.skills, worker.services, worker.skills);
    const parsedLocation = parseLocationInput(req.body.location);

    if (parsedLocation) {
      worker.location = parsedLocation;
    }
    worker.experience = req.body.experience || worker.experience;
    worker.hourlyRate = req.body.hourlyRate || worker.hourlyRate;

    const updatedWorker = await worker.save();
    const safeWorker = await Worker.findById(updatedWorker._id).select("-password");

    return sendSuccess(res, "Worker profile updated successfully", {
      worker: serializeWorker(safeWorker || updatedWorker),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getWorkerProfile = async (req, res) => {
  try {
    const worker = await Worker.findById(req.user._id).select("-password");

    if (!worker) {
      return sendError(res, 404, "Worker not found");
    }

    return sendSuccess(res, "Worker profile fetched successfully", {
      worker: serializeWorker(worker),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getWorkerById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid worker id");
    }

    const worker = await Worker.findById(req.params.id).select("-password");

    if (!worker) {
      return sendError(res, 404, "Worker not found");
    }

    return sendSuccess(res, "Worker details fetched successfully", {
      worker: serializeWorker(worker),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// Get Workers (Search + Filter)
exports.getWorkers = async (req, res) => {
  try {
    const serviceId = req.query.serviceId || "";
    const skill = req.query.skill || req.query.serviceType || "";
    const locationContext = getRequestLocationContext(req);
    const filterTerms = buildServiceFilterTerms(serviceId, skill, req.query.serviceType);

    const query = {
      isVerified: true,
    };

    if (filterTerms.length) {
      query.skills = { $in: filterTerms };
    }

    const workers = await Worker.find(query).select("-password");

    if (!workers.length) {
      return sendSuccess(res, "Workers fetched successfully", {
        workers: [],
        filter: buildFilterMeta(req, normalizeId(serviceId), locationContext, filterTerms),
      });
    }

    const workersWithMeta = getSortedWorkers(workers, locationContext.location);

    return sendSuccess(res, "Workers fetched successfully", {
      workers: workersWithMeta,
      filter: buildFilterMeta(req, normalizeId(serviceId), locationContext, filterTerms),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { isOnline } = req.body || {};

    if (typeof isOnline !== "boolean") {
      return sendError(res, 400, "isOnline must be a boolean");
    }

    const worker = await Worker.findByIdAndUpdate(
      req.user._id,
      { isOnline },
      { new: true }
    ).select("-password");

    if (!worker) {
      return sendError(res, 404, "Worker not found");
    }

    return sendSuccess(res, "Worker status updated successfully", {
      worker: serializeWorker(worker),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.acceptBooking = async (req, res) => {
  const bookingId = req.body?.bookingId || req.params?.bookingId || req.params?.id;

  if (!bookingId) {
    return sendError(res, 400, "bookingId is required");
  }

  req.params.id = bookingId;
  return acceptBookingFlow(req, res);
};

exports.rejectBooking = async (req, res) => {
  const bookingId = req.body?.bookingId || req.params?.bookingId || req.params?.id;

  if (!bookingId) {
    return sendError(res, 400, "bookingId is required");
  }

  req.params.id = bookingId;
  return rejectBookingFlow(req, res);
};

exports.getWorkerBookings = async (req, res) => {
  try {
    const { status, paymentStatus } = req.query || {};
    const query = { worker: req.user._id };

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const bookings = await Booking.find(query)
      .populate([
        {
          path: "user",
          select: "name phone address addressBook pinnedLocation createdAt updatedAt",
        },
        {
          path: "worker",
          select: "-password",
        },
      ])
      .sort({ createdAt: -1 });

    const serializedBookings = bookings.map((booking) => serializeBooking(booking));

    return sendSuccess(res, "Worker bookings fetched successfully", {
      bookings: serializedBookings,
      data: serializedBookings,
      count: bookings.length,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

const getAmountFromBooking = (booking) => {
  const estimated = Number(booking?.estimatedAmount);

  if (Number.isFinite(estimated) && estimated > 0) {
    return estimated;
  }

  const paymentAmount = Number(booking?.payment?.amount);
  if (Number.isFinite(paymentAmount) && paymentAmount > 0) {
    return Number((paymentAmount / 100).toFixed(2));
  }

  return 0;
};

const isSameDayInTimeZone = (left, right, timeZone = "Asia/Kolkata") => {
  if (!left || !right) {
    return false;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(left)) === formatter.format(new Date(right));
};

exports.getEarnings = async (req, res) => {
  try {
    const { range = "all", from = null, to = null } = req.query || {};

    const bookings = await Booking.find({
      worker: req.user._id,
      status: "completed",
      paymentStatus: "paid",
    })
      .populate([
        {
          path: "user",
          select: "name phone address addressBook pinnedLocation createdAt updatedAt",
        },
        {
          path: "worker",
          select: "-password",
        },
      ])
      .sort({ updatedAt: -1 });

    const filteredBookings = bookings.filter((booking) => {
      const paidAt = booking?.payment?.paidAt || booking?.updatedAt || booking?.createdAt;

      if (range === "today") {
        return isSameDayInTimeZone(paidAt, new Date());
      }

      if (range === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(paidAt) >= weekAgo;
      }

      if (range === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(paidAt) >= monthAgo;
      }

      if (from && new Date(paidAt) < new Date(from)) {
        return false;
      }

      if (to && new Date(paidAt) > new Date(to)) {
        return false;
      }

      return true;
    });

    const total = filteredBookings.reduce((sum, booking) => sum + getAmountFromBooking(booking), 0);
    const todayTotal = bookings.reduce((sum, booking) => {
      const paidAt = booking?.payment?.paidAt || booking?.updatedAt || booking?.createdAt;
      if (!isSameDayInTimeZone(paidAt, new Date())) {
        return sum;
      }
      return sum + getAmountFromBooking(booking);
    }, 0);

    const earnings = filteredBookings.map((booking) => ({
        booking: serializeBooking(booking),
        amount: getAmountFromBooking(booking),
        paidAt: booking?.payment?.paidAt || booking?.updatedAt || booking?.createdAt || null,
      }));

    return sendSuccess(res, "Earnings fetched successfully", {
      total: Number(total.toFixed(2)),
      today: Number(todayTotal.toFixed(2)),
      currency: "INR",
      earnings,
      data: earnings,
      bookings: earnings,
      count: filteredBookings.length,
      range,
      from,
      to,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
