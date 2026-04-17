const {
  serializeBooking,
  serializeTrackingSnapshot,
  serializeWorker,
} = require("./serializers");

const toRoomId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object" && value._id) {
    return String(value._id);
  }

  return String(value);
};

const uniqueRooms = (rooms = []) => {
  return [...new Set(rooms.filter(Boolean).map(toRoomId))];
};

const bookingRoomName = (bookingId) => {
  const roomId = toRoomId(bookingId);

  if (!roomId) {
    return null;
  }

  return `booking:${roomId}`;
};

const emitToRooms = (io, rooms = [], eventNames = [], payload) => {
  if (!io || !eventNames.length) {
    return;
  }

  for (const room of uniqueRooms(rooms)) {
    for (const eventName of eventNames) {
      io.to(room).emit(eventName, payload);
    }
  }
};

const buildBookingPayload = (booking, trackingSnapshot = null, worker = null) => {
  const bookingId = toRoomId(booking?._id || booking?.bookingId);

  return {
    bookingId,
    workerId: toRoomId(worker?._id || booking?.worker || null),
    booking: serializeBooking(booking),
    trackingSnapshot: serializeTrackingSnapshot(trackingSnapshot),
    worker: serializeWorker(worker),
  };
};

const emitNewBookingNotifications = (io, booking, options = {}) => {
  const payload = buildBookingPayload(
    booking,
    options.trackingSnapshot || null,
    options.worker || null
  );

  const workerId = options.workerRoom === false
    ? null
    : toRoomId(options.workerRoom || options.worker?._id || booking?.worker);
  const workerRoom = workerId ? `worker:${workerId}` : null;
  const bookingRoom = options.bookingRoom === false
    ? null
    : bookingRoomName(options.bookingRoom || booking?._id);
  const legacyBookingRoom = options.bookingRoom === false
    ? null
    : toRoomId(options.bookingRoom || booking?._id);
  const userRoom = options.userRoom === false
    ? null
    : toRoomId(options.userRoom || (booking?.user ? `user:${booking.user}` : null));

  emitToRooms(io, [workerRoom], ["newBooking", "booking:new", "booking:assigned"], payload);
  emitToRooms(io, [bookingRoom, legacyBookingRoom, userRoom], ["booking:assigned"], payload);

  return payload;
};

const emitBookingStatusUpdate = (io, booking, options = {}) => {
  const payload = buildBookingPayload(
    booking,
    options.trackingSnapshot || null,
    options.worker || null
  );
  const eventName = options.eventName || "booking:updated";
  const bookingRoom = options.bookingRoom === false
    ? null
    : bookingRoomName(options.bookingRoom || booking?._id);
  const legacyBookingRoom = options.bookingRoom === false
    ? null
    : toRoomId(options.bookingRoom || booking?._id);
  const userRoom = options.userRoom === false
    ? null
    : toRoomId(options.userRoom || (booking?.user ? `user:${booking.user}` : null));
  const workerRoom = options.workerRoom === false
    ? null
    : toRoomId(options.workerRoom || (booking?.worker ? `worker:${booking.worker}` : null));

  emitToRooms(io, [bookingRoom, legacyBookingRoom, userRoom, workerRoom], [eventName], payload);

  return payload;
};

const emitTrackingUpdate = (io, booking, trackingSnapshot, options = {}) => {
  const payload = serializeTrackingSnapshot(trackingSnapshot);
  const bookingRoom = options.bookingRoom === false
    ? null
    : bookingRoomName(options.bookingRoom || booking?._id);
  const legacyBookingRoom = options.bookingRoom === false
    ? null
    : toRoomId(options.bookingRoom || booking?._id);
  const userRoom = options.userRoom === false
    ? null
    : toRoomId(options.userRoom || (booking?.user ? `user:${booking.user}` : null));
  const workerRoom = options.workerRoom === false
    ? null
    : toRoomId(options.workerRoom || (booking?.worker ? `worker:${booking.worker}` : null));

  emitToRooms(io, [bookingRoom, legacyBookingRoom, userRoom, workerRoom], ["receiveLocation", "tracking:update", "tracking:snapshot"], payload);

  return payload;
};

module.exports = {
  toRoomId,
  buildBookingPayload,
  emitNewBookingNotifications,
  emitBookingStatusUpdate,
  emitTrackingUpdate,
};
