const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Worker = require("../models/Workers");
const { calculateDistanceKm, isValidCoordinate } = require("../utils/distance");
const estimateTimeMins = require("../utils/timeEstimate");
const { parseLocationInput } = require("../utils/coordinates");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const {
  serializeBooking,
  serializeWorker,
  serializeTrackingSnapshot,
} = require("../utils/serializers");
const {
  emitNewBookingNotifications,
  emitBookingStatusUpdate,
} = require("../utils/bookingRealtime");
const { findHomeServiceById, getHomeServiceSkillTags, normalizeId } = require("../data/homeCatalog");
const {
  buildTrackingSnapshot,
  mergeTrackingSnapshot,
} = require("../utils/tracking");
const {
  setBookingRecord,
  getBookingRecord,
  patchBookingRecord,
} = require("../utils/runtimeStore");

const roundDistance = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(2));
};

const roundTime = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
};

const isObjectIdEqual = (left, right) => {
  if (!left || !right) {
    return false;
  }

  const leftId = typeof left === "object" && left._id ? left._id : left;
  const rightId = typeof right === "object" && right._id ? right._id : right;

  return String(leftId) === String(rightId);
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const buildServiceFilterTerms = (serviceId, serviceType) => {
  const terms = new Set();

  const addTerms = (values) => {
    for (const value of values || []) {
      const normalized = normalizeText(value);
      if (normalized) {
        terms.add(normalized);
      }
    }
  };

  if (serviceType) {
    addTerms([serviceType]);
  }

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

const resolveAddressBookLocation = async (user, body = {}) => {
  if (!user) {
    return null;
  }

  const addressBookId = body.addressBookId || body.selectedAddressId || null;
  const addressBook = Array.isArray(user.addressBook) ? user.addressBook : [];

  const selectedAddress =
    addressBook.find((entry) => String(entry._id) === String(addressBookId)) ||
    addressBook.find((entry) => entry.isDefault);

  if (selectedAddress && isValidCoordinate(selectedAddress)) {
    return {
      lat: selectedAddress.lat,
      lng: selectedAddress.lng,
    };
  }

  const pinned = user.pinnedLocation;
  if (pinned && isValidCoordinate({ lat: pinned.lat, lng: pinned.lng })) {
    return {
      lat: pinned.lat,
      lng: pinned.lng,
    };
  }

  return null;
};

const resolveUserLocation = async (req, body = {}) => {
  const parsed = parseLocationInput(body.userLocation || body.location || body);

  if (parsed) {
    return parsed;
  }

  if (req.user) {
    return resolveAddressBookLocation(req.user, body);
  }

  return null;
};

const buildWorkerMatch = (worker, userLocation) => {
  const workerLocation = worker.location && isValidCoordinate(worker.location) ? worker.location : null;

  if (!workerLocation) {
    return null;
  }

  const distanceKm = calculateDistanceKm(userLocation, workerLocation);

  if (distanceKm === null) {
    return null;
  }

  return {
    worker,
    distanceKm,
    estimatedTime: estimateTimeMins(distanceKm),
  };
};

const getAvailableWorkers = async () => {
  return Worker.find({
    isAvailable: true,
    isVerified: true,
  }).select("-password");
};

const pickNearestWorker = async (userLocation, serviceTerms = []) => {
  const workers = await getAvailableWorkers();

  const workersWithDistance = workers
    .filter((worker) => {
      if (!serviceTerms.length) {
        return true;
      }

      return Array.isArray(worker.skills) && worker.skills.some((skill) => {
        const normalized = normalizeText(skill);
        return serviceTerms.includes(normalized);
      });
    })
    .map((worker) => {
      const workerLocation =
        worker.location && isValidCoordinate(worker.location) ? worker.location : null;

      const distanceKm = workerLocation
        ? calculateDistanceKm(userLocation, workerLocation)
        : null;

      return {
        worker,
        distanceKm,
        estimatedTime: distanceKm === null ? null : estimateTimeMins(distanceKm),
      };
    })
    .filter((item) => item.distanceKm !== null);

  workersWithDistance.sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }

    if ((b.worker.rating || 0) !== (a.worker.rating || 0)) {
      return (b.worker.rating || 0) - (a.worker.rating || 0);
    }

    return (b.worker.experience || 0) - (a.worker.experience || 0);
  });

  return workersWithDistance[0] || null;
};

const updateBroadcastHistory = (booking, workerId, responseStatus) => {
  const now = new Date();
  const entries = Array.isArray(booking.broadcastHistory) ? booking.broadcastHistory : [];
  const existingIndex = entries.findIndex((entry) => isObjectIdEqual(entry.worker, workerId));

  if (existingIndex >= 0) {
    entries[existingIndex].responseStatus = responseStatus;
    entries[existingIndex].respondedAt = now;
  } else {
    entries.push({
      worker: workerId,
      responseStatus,
      respondedAt: now,
      notifiedAt: now,
    });
  }

  booking.broadcastHistory = entries;
};

const isBookingAssignedToWorker = (booking, workerId) => {
  if (!booking.worker) {
    return true;
  }

  return isObjectIdEqual(booking.worker, workerId);
};

const canAccessBooking = (booking, requesterId) => {
  if (!booking || !requesterId) {
    return false;
  }

  return (
    isObjectIdEqual(booking.user, requesterId) ||
    isObjectIdEqual(booking.worker, requesterId)
  );
};

const setWorkerAvailability = async (workerId, isAvailable) => {
  await Worker.findByIdAndUpdate(workerId, { isAvailable });
};

const getIo = (req) => req.app.get("io");

const syncTrackingState = async (booking, patch = {}) => {
  if (!booking) {
    return null;
  }

  const currentSnapshot =
    patch.trackingSnapshot ||
    booking.trackingSnapshot ||
    getBookingRecord(booking._id)?.trackingSnapshot ||
    null;

  const trackingSnapshot = mergeTrackingSnapshot(
    currentSnapshot,
    buildTrackingSnapshot(booking, {
      bookingId: booking._id,
      workerId: patch.workerId || booking.worker,
      serviceId: patch.serviceId || booking.serviceId,
      status: patch.status || booking.status,
      paymentStatus: patch.paymentStatus || booking.paymentStatus,
      address: patch.address || booking.address,
      etaMinutes: patch.etaMinutes,
      latitude: patch.latitude,
      longitude: patch.longitude,
      heading: patch.heading,
      speed: patch.speed,
      updatedAt: patch.updatedAt,
    })
  );

  booking.trackingSnapshot = trackingSnapshot;
  await booking.save();

  setBookingRecord(booking._id, {
    booking: serializeBooking(booking),
    trackingSnapshot,
    payment: booking.payment || null,
  });

  return trackingSnapshot;
};

const buildBookingResponse = (booking, worker = null, trackingSnapshot = null) => {
  const plainBooking =
    typeof booking?.toObject === "function" ? booking.toObject({ depopulate: false }) : booking;

  if (worker) {
    plainBooking.worker = worker;
  }

  if (trackingSnapshot) {
    plainBooking.trackingSnapshot = trackingSnapshot;
  }

  return serializeBooking(plainBooking);
};

const resolveServiceSelection = (body = {}) => {
  const serviceId = body.serviceId || null;
  const serviceType = body.serviceType || null;
  const service = findHomeServiceById(serviceId || serviceType);

  return {
    serviceId: service?.serviceId || normalizeId(serviceId || serviceType) || null,
    serviceType: service?.title || serviceType || serviceId || null,
    service,
  };
};

const estimateAmount = (body = {}, service = null) => {
  const requested = Number(body.estimatedAmount);
  if (Number.isFinite(requested) && requested > 0) {
    return requested;
  }

  if (service) {
    if (Number.isFinite(Number(service.ratePerHour)) && Number.isFinite(Number(service.durationMins))) {
      return roundTime(Number(service.ratePerHour) * (Number(service.durationMins) / 60));
    }

    if (Number.isFinite(Number(service.ratePerHour))) {
      return Number(service.ratePerHour);
    }
  }

  return null;
};

// Create Booking (User)
exports.createBooking = async (req, res) => {
  try {
    const { workerId, address, date, notes } = req.body || {};
    const selection = resolveServiceSelection(req.body || {});

    if (!selection.serviceId && !selection.serviceType) {
      return sendError(res, 400, "serviceId or serviceType is required");
    }

    if (!address || !date) {
      return sendError(res, 400, "address and date are required");
    }

    const parsedUserLocation = await resolveUserLocation(req, req.body || {});

    if (!parsedUserLocation) {
      return sendError(
        res,
        400,
        "Valid userLocation.lat and userLocation.lng are required"
      );
    }

    let assignedWorker = null;
    let distanceKm = null;
    let estimatedTime = null;
    const serviceTerms = buildServiceFilterTerms(selection.serviceId, selection.serviceType);

    if (workerId) {
      assignedWorker = await Worker.findById(workerId).select("-password");

      if (!assignedWorker) {
        return sendError(res, 404, "Worker not found");
      }

      if (!assignedWorker.isVerified) {
        return sendError(res, 400, "Worker is not verified");
      }

      if (!assignedWorker.location || !isValidCoordinate(assignedWorker.location)) {
        return sendError(res, 400, "Worker location is missing");
      }

      distanceKm = calculateDistanceKm(parsedUserLocation, assignedWorker.location);
      estimatedTime = estimateTimeMins(distanceKm);
    } else {
      const nearest = await pickNearestWorker(parsedUserLocation, serviceTerms);

      if (!nearest) {
        return sendError(res, 404, "No workers available");
      }

      assignedWorker = nearest.worker;
      distanceKm = nearest.distanceKm;
      estimatedTime = nearest.estimatedTime;
    }

    const booking = await Booking.create({
      user: req.user._id,
      worker: assignedWorker ? assignedWorker._id : undefined,
      serviceId: selection.serviceId,
      serviceType: selection.serviceType,
      notes: notes || undefined,
      estimatedAmount: estimateAmount(req.body || {}, selection.service),
      address,
      date,
      userLocation: parsedUserLocation,
      distance: roundDistance(distanceKm),
      estimatedTime: roundTime(estimatedTime),
      status: workerId ? "pending" : "searching",
    });

    const trackingSnapshot = await syncTrackingState(booking, {
      workerId: assignedWorker?._id,
      serviceId: selection.serviceId,
      status: booking.status,
      address,
      etaMinutes: roundTime(estimatedTime),
      updatedAt: new Date().toISOString(),
    });

    const bookingPayload = buildBookingResponse(
      booking,
      assignedWorker ? serializeWorker(assignedWorker) : null,
      trackingSnapshot
    );

    const io = getIo(req);
    if (io && assignedWorker) {
      emitNewBookingNotifications(io, booking, {
        worker: assignedWorker,
        trackingSnapshot,
      });
    }

    return sendSuccess(
      res,
      "Booking created successfully",
      {
        booking: bookingPayload,
        trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
      },
      201
    );
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const requesterId = req.user?._id || req.account?._id;
    const bookingId = req.params.id;

    if (!requesterId) {
      return sendError(res, 401, "Not authorized");
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendError(res, 400, "Invalid booking id");
    }

    const booking = await Booking.findById(bookingId).populate([
      {
        path: "user",
        select: "-password",
      },
      {
        path: "worker",
        select: "-password",
      },
    ]);

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (!canAccessBooking(booking, requesterId)) {
      return sendError(res, 403, "Not allowed to access this booking");
    }

    return sendSuccess(res, "Booking fetched successfully", {
      booking: buildBookingResponse(booking, null, booking.trackingSnapshot),
      trackingSnapshot: serializeTrackingSnapshot(booking.trackingSnapshot),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getTrackingSnapshot = async (req, res) => {
  try {
    const requesterId = req.user?._id || req.account?._id;
    const bookingId = req.params.bookingId;

    if (!requesterId) {
      return sendError(res, 401, "Not authorized");
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendError(res, 400, "Invalid booking id");
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (!canAccessBooking(booking, requesterId)) {
      return sendError(res, 403, "Not allowed to access this booking");
    }

    const stored = getBookingRecord(bookingId);
    const trackingSnapshot = stored?.trackingSnapshot || booking.trackingSnapshot || buildTrackingSnapshot(booking, {
      bookingId: booking._id,
      workerId: booking.worker,
      serviceId: booking.serviceId,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      address: booking.address,
      etaMinutes: booking.estimatedTime,
      updatedAt: booking.updatedAt,
    });

    return sendSuccess(res, "Tracking snapshot fetched successfully", {
      trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
      bookingId: String(booking._id),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// Broadcast Booking (User)
exports.broadcastBooking = async (req, res) => {
  try {
    const { serviceId, serviceType, userLocation } = req.body || {};
    const selection = resolveServiceSelection({ serviceId, serviceType });

    if (!selection.serviceId && !selection.serviceType) {
      return sendError(res, 400, "serviceId or serviceType is required");
    }

    const parsedUserLocation =
      parseLocationInput(userLocation) || (await resolveUserLocation(req, req.body || {}));

    if (!parsedUserLocation) {
      return sendError(
        res,
        400,
        "Valid userLocation.lat and userLocation.lng are required"
      );
    }

    const workers = await getAvailableWorkers();
    const serviceTerms = buildServiceFilterTerms(selection.serviceId, selection.serviceType);

    const matchedWorkers = workers
      .filter((worker) => matchesServiceFilter(worker, serviceTerms))
      .map((worker) => {
        const match = buildWorkerMatch(worker, parsedUserLocation);

        if (!match) {
          return null;
        }

        return {
          worker: serializeWorker(match.worker),
          distance: roundDistance(match.distanceKm),
          estimatedTime: roundTime(match.estimatedTime),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        if ((b.worker.rating || 0) !== (a.worker.rating || 0)) {
          return (b.worker.rating || 0) - (a.worker.rating || 0);
        }

        return (b.worker.experience || 0) - (a.worker.experience || 0);
      });

    const booking = await Booking.create({
      user: req.user._id,
      serviceId: selection.serviceId,
      serviceType: selection.serviceType,
      userLocation: parsedUserLocation,
      status: "searching",
      broadcastHistory: matchedWorkers.map((match) => ({
        worker: match.worker._id,
        distance: match.distance,
        estimatedTime: match.estimatedTime,
        responseStatus: "pending",
        notifiedAt: new Date(),
      })),
    });

    const trackingSnapshot = await syncTrackingState(booking, {
      serviceId: selection.serviceId,
      status: "searching",
      address: req.body?.address || booking.address,
      latitude: parsedUserLocation.lat,
      longitude: parsedUserLocation.lng,
      updatedAt: new Date().toISOString(),
    });

    const io = getIo(req);
    const requestPayload = {
      bookingId: booking._id,
      requestId: booking._id,
      serviceId: selection.serviceId,
      serviceType: selection.serviceType,
      userLocation: parsedUserLocation,
      status: booking.status,
    };

    matchedWorkers.forEach((match) => {
      if (io) {
        io.to(`worker:${match.worker._id}`).emit("booking:broadcast", {
          ...requestPayload,
          workerId: match.worker._id,
          distance: match.distance,
          estimatedTime: match.estimatedTime,
        });
      }
    });

    return sendSuccess(
      res,
      "Searching worker",
      {
        requestId: booking._id,
        bookingId: booking._id,
        workersNotified: matchedWorkers.length,
        matchedWorkers: matchedWorkers.map((match) => ({
          workerId: match.worker._id,
          name: match.worker.name,
          skills: match.worker.skills,
          distance: match.distance,
          estimatedTime: match.estimatedTime,
          rating: match.worker.rating,
          experience: match.worker.experience,
        })),
        booking: buildBookingResponse(booking, null, trackingSnapshot),
        trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
      },
      201
    );
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// Worker Accept Booking
exports.acceptBooking = async (req, res) => {
  try {
    const worker = req.user;
    const bookingId = req.body?.bookingId || req.params?.bookingId || req.params?.id;

    if (!bookingId) {
      return sendError(res, 400, "bookingId is required");
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendError(res, 400, "Invalid booking id");
    }

    let booking = await Booking.findById(bookingId);

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (!isBookingAssignedToWorker(booking, worker._id)) {
      return sendError(res, 403, "Not allowed to accept this booking");
    }

    if (!booking.worker) {
      booking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          $or: [{ worker: null }, { worker: { $exists: false } }],
        },
        {
          $set: {
            worker: worker._id,
            status: "accepted",
          },
        },
        { new: true }
      );

      if (!booking) {
        const latestBooking = await Booking.findById(bookingId);

        if (latestBooking && !isObjectIdEqual(latestBooking.worker, worker._id)) {
          return sendError(res, 409, "Booking already accepted");
        }

        booking = latestBooking;
      }
    } else {
      booking.status = "accepted";
      await booking.save();
    }

    updateBroadcastHistory(booking, worker._id, "accepted");
    await setWorkerAvailability(worker._id, false);

    const trackingSnapshot = await syncTrackingState(booking, {
      workerId: worker._id,
      status: "accepted",
      updatedAt: new Date().toISOString(),
    });

    const io = getIo(req);
    if (io) {
      emitBookingStatusUpdate(io, booking, {
        trackingSnapshot,
        worker: worker,
      });
    }

    return sendSuccess(res, "Booking accepted successfully", {
      booking: buildBookingResponse(booking, null, trackingSnapshot),
      trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.rejectBooking = async (req, res) => {
  try {
    const worker = req.user;
    const bookingId = req.body?.bookingId || req.params?.bookingId || req.params?.id;

    if (!bookingId) {
      return sendError(res, 400, "bookingId is required");
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendError(res, 400, "Invalid booking id");
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (!isBookingAssignedToWorker(booking, worker._id)) {
      return sendError(res, 403, "Not allowed to reject this booking");
    }

    updateBroadcastHistory(booking, worker._id, "rejected");
    booking.status = "rejected";

    await booking.save();

    const trackingSnapshot = await syncTrackingState(booking, {
      workerId: worker._id,
      status: booking.status,
      updatedAt: new Date().toISOString(),
    });

    const io = getIo(req);
    if (io) {
      emitBookingStatusUpdate(io, booking, {
        trackingSnapshot,
        worker: worker,
      });
    }

    return sendSuccess(res, "Booking rejected successfully", {
      booking: buildBookingResponse(booking, null, trackingSnapshot),
      trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.markBookingOnTheWay = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (!isObjectIdEqual(booking.worker, req.user._id)) {
      return sendError(res, 403, "Not allowed to update this booking");
    }

    booking.status = "on-the-way";
    await booking.save();

    const trackingSnapshot = await syncTrackingState(booking, {
      workerId: req.user._id,
      status: "on-the-way",
      updatedAt: new Date().toISOString(),
    });

    const io = getIo(req);
    if (io) {
      emitBookingStatusUpdate(io, booking, {
        trackingSnapshot,
        worker: req.user,
      });
    }

    return sendSuccess(res, "Booking updated successfully", {
      booking: buildBookingResponse(booking, null, trackingSnapshot),
      trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    if (!isObjectIdEqual(booking.worker, req.user._id)) {
      return sendError(res, 403, "Not allowed to complete this booking");
    }

    booking.status = "completed";
    await booking.save();
    await setWorkerAvailability(req.user._id, true);

    const trackingSnapshot = await syncTrackingState(booking, {
      workerId: req.user._id,
      status: "completed",
      updatedAt: new Date().toISOString(),
    });

    const io = getIo(req);
    if (io) {
      emitBookingStatusUpdate(io, booking, {
        trackingSnapshot,
        worker: req.user,
      });
    }

    return sendSuccess(res, "Booking completed successfully", {
      booking: buildBookingResponse(booking, null, trackingSnapshot),
      trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// Get User Bookings
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).populate({
      path: "worker",
      select: "-password",
    });

    return sendSuccess(res, "Bookings fetched successfully", {
      bookings: bookings.map((booking) => buildBookingResponse(booking, null, booking.trackingSnapshot)),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
