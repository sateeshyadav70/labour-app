const assert = require("node:assert/strict");

const {
  emitNewBookingNotifications,
  emitBookingStatusUpdate,
  emitTrackingUpdate,
} = require("../utils/bookingRealtime");

const makeIo = () => {
  const calls = [];

  return {
    calls,
    io: {
      to(room) {
        return {
          emit(event, payload) {
            calls.push({ room, event, payload });
          },
        };
      },
    },
  };
};

const booking = {
  _id: "booking_1",
  user: "user_1",
  worker: "worker_1",
  serviceId: "service_1",
  serviceType: "Cleaning",
  address: "Test Address",
  status: "accepted",
  paymentStatus: "pending",
};

const runNewBookingTest = () => {
  const { io, calls } = makeIo();

  const payload = emitNewBookingNotifications(io, booking, {
    worker: { _id: "worker_1", name: "Worker One" },
  });

  assert.equal(payload.bookingId, "booking_1");
  assert.equal(payload.workerId, "worker_1");
  assert.equal(calls.filter((call) => call.room === "worker:worker_1").length, 3);
  assert(calls.some((call) => call.room === "worker:worker_1" && call.event === "newBooking"));
  assert(calls.some((call) => call.room === "worker:worker_1" && call.event === "booking:new"));
  assert(calls.some((call) => call.room === "worker:worker_1" && call.event === "booking:assigned"));
  assert(calls.some((call) => call.room === "booking:booking_1" && call.event === "booking:assigned"));
  assert(calls.some((call) => call.room === "booking_1" && call.event === "booking:assigned"));
  assert(calls.some((call) => call.room === "user:user_1" && call.event === "booking:assigned"));
};

const runStatusUpdateTest = () => {
  const { io, calls } = makeIo();
  const payload = emitBookingStatusUpdate(io, booking, {
    trackingSnapshot: {
      bookingId: "booking_1",
      status: "accepted",
      updatedAt: new Date().toISOString(),
    },
    worker: { _id: "worker_1", name: "Worker One" },
  });

  assert.equal(payload.bookingId, "booking_1");
  assert.equal(calls.filter((call) => call.event === "booking:updated").length, 4);
  assert(calls.some((call) => call.room === "booking:booking_1"));
  assert(calls.some((call) => call.room === "booking_1"));
  assert(calls.some((call) => call.room === "user:user_1"));
  assert(calls.some((call) => call.room === "worker:worker_1"));
};

const runTrackingUpdateTest = () => {
  const { io, calls } = makeIo();
  const payload = emitTrackingUpdate(io, booking, {
    bookingId: "booking_1",
    workerId: "worker_1",
    status: "accepted",
    latitude: 12.34,
    longitude: 56.78,
    updatedAt: new Date().toISOString(),
  });

  assert.equal(payload.bookingId, "booking_1");
  assert.equal(calls.filter((call) => call.event === "tracking:update").length, 4);
  assert(calls.some((call) => call.room === "booking:booking_1"));
  assert(calls.some((call) => call.room === "booking_1"));
  assert(calls.some((call) => call.room === "user:user_1"));
  assert(calls.some((call) => call.room === "worker:worker_1"));
};

runNewBookingTest();
runStatusUpdateTest();
runTrackingUpdateTest();

console.log("Booking realtime tests passed.");

module.exports = Promise.resolve();
