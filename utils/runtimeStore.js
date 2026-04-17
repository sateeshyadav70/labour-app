const bookingRecords = new Map();

const normalizeKey = (value) => (value == null ? null : String(value));

const cloneRecord = (record) => {
  if (!record || typeof record !== "object") {
    return null;
  }

  return {
    ...record,
    trackingSnapshot:
      record.trackingSnapshot && typeof record.trackingSnapshot === "object"
        ? { ...record.trackingSnapshot }
        : record.trackingSnapshot || null,
    payment:
      record.payment && typeof record.payment === "object"
        ? { ...record.payment }
        : record.payment || null,
  };
};

const setBookingRecord = (bookingId, record) => {
  const key = normalizeKey(bookingId);

  if (!key) {
    return null;
  }

  const cloned = cloneRecord(record);
  bookingRecords.set(key, cloned);
  return cloned;
};

const getBookingRecord = (bookingId) => {
  const key = normalizeKey(bookingId);

  if (!key) {
    return null;
  }

  const record = bookingRecords.get(key);
  return cloneRecord(record);
};

const patchBookingRecord = (bookingId, patch = {}) => {
  const current = getBookingRecord(bookingId) || {};
  const next = {
    ...current,
    ...patch,
  };

  if (patch.trackingSnapshot && typeof patch.trackingSnapshot === "object") {
    next.trackingSnapshot = {
      ...(current.trackingSnapshot || {}),
      ...patch.trackingSnapshot,
    };
  }

  if (patch.payment && typeof patch.payment === "object") {
    next.payment = {
      ...(current.payment || {}),
      ...patch.payment,
    };
  }

  return setBookingRecord(bookingId, next);
};

module.exports = {
  setBookingRecord,
  getBookingRecord,
  patchBookingRecord,
};
