const { findHomeServiceById } = require("../data/homeCatalog");

const STATUS_META = {
  searching: {
    stepIndex: 0,
    progress: 0.15,
    label: "Searching for a worker",
    subtitle: "Matching the nearest available worker",
  },
  pending: {
    stepIndex: 0,
    progress: 0.1,
    label: "Pending",
    subtitle: "Waiting for confirmation",
  },
  accepted: {
    stepIndex: 1,
    progress: 0.45,
    label: "Booking accepted",
    subtitle: "Worker confirmed the visit",
  },
  rejected: {
    stepIndex: 1,
    progress: 0.45,
    label: "Booking rejected",
    subtitle: "Worker rejected the request",
  },
  "on-the-way": {
    stepIndex: 2,
    progress: 0.8,
    label: "Worker on the way",
    subtitle: "Live movement is being tracked",
  },
  completed: {
    stepIndex: 3,
    progress: 1,
    label: "Completed",
    subtitle: "Service finished successfully",
  },
  cancelled: {
    stepIndex: 3,
    progress: 1,
    label: "Cancelled",
    subtitle: "This booking was cancelled",
  },
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeLocationInput = (value = {}) => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const latitude = toNumber(
    value.latitude ?? value.lat ?? value.location?.lat ?? value.coords?.latitude ?? value.coords?.lat
  );
  const longitude = toNumber(
    value.longitude ?? value.lng ?? value.location?.lng ?? value.coords?.longitude ?? value.coords?.lng
  );
  const heading = toNumber(value.heading);
  const speed = toNumber(value.speed);
  const etaMinutes = toNumber(value.etaMinutes);

  return {
    latitude,
    longitude,
    heading,
    speed,
    etaMinutes,
    updatedAt: value.updatedAt || value.recordedAt || new Date().toISOString(),
  };
};

const getStatusMeta = (status) => {
  return STATUS_META[status] || STATUS_META.pending;
};

const buildTrackingSnapshot = (booking, overrides = {}) => {
  if (!booking) {
    return null;
  }

  const service = findHomeServiceById(booking.serviceId || booking.serviceType || overrides.serviceId);
  const status = overrides.status || booking.status || "pending";
  const statusMeta = getStatusMeta(status);
  const location = normalizeLocationInput({
    ...booking.trackingSnapshot,
    ...overrides,
  });

  const workerId =
    overrides.workerId ||
    booking.worker?._id ||
    booking.worker ||
    booking.assignedWorkerId ||
    null;

  return {
    bookingId: String(booking._id || booking.bookingId || overrides.bookingId || ""),
    workerId: workerId ? String(workerId) : null,
    serviceId: booking.serviceId || overrides.serviceId || service?.serviceId || service?.id || null,
    status,
    paymentStatus: overrides.paymentStatus || booking.paymentStatus || "pending",
    stepIndex: overrides.stepIndex ?? statusMeta.stepIndex,
    progress: overrides.progress ?? statusMeta.progress,
    label: overrides.label || statusMeta.label,
    subtitle: overrides.subtitle || statusMeta.subtitle,
    zone: overrides.zone || service?.category || "service",
    address: overrides.address || booking.address || null,
    etaMinutes: overrides.etaMinutes ?? location.etaMinutes ?? booking.estimatedTime ?? null,
    latitude: overrides.latitude ?? location.latitude ?? booking.userLocation?.lat ?? null,
    longitude: overrides.longitude ?? location.longitude ?? booking.userLocation?.lng ?? null,
    heading: overrides.heading ?? location.heading ?? null,
    speed: overrides.speed ?? location.speed ?? null,
    updatedAt: overrides.updatedAt || location.updatedAt || new Date().toISOString(),
  };
};

const mergeTrackingSnapshot = (current, patch = {}) => {
  const base = current || {};

  return {
    ...base,
    ...patch,
    bookingId: patch.bookingId || base.bookingId || null,
    workerId: patch.workerId || base.workerId || null,
    serviceId: patch.serviceId || base.serviceId || null,
    status: patch.status || base.status || null,
    paymentStatus: patch.paymentStatus || base.paymentStatus || null,
    stepIndex: patch.stepIndex ?? base.stepIndex ?? null,
    progress: patch.progress ?? base.progress ?? null,
    label: patch.label || base.label || null,
    subtitle: patch.subtitle || base.subtitle || null,
    zone: patch.zone || base.zone || null,
    address: patch.address || base.address || null,
    etaMinutes: patch.etaMinutes ?? base.etaMinutes ?? null,
    latitude: patch.latitude ?? base.latitude ?? null,
    longitude: patch.longitude ?? base.longitude ?? null,
    heading: patch.heading ?? base.heading ?? null,
    speed: patch.speed ?? base.speed ?? null,
    updatedAt: patch.updatedAt || new Date().toISOString(),
  };
};

module.exports = {
  buildTrackingSnapshot,
  mergeTrackingSnapshot,
  normalizeLocationInput,
  getStatusMeta,
};
