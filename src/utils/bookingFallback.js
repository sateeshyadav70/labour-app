const routePoints = [
  {
    stepIndex: 0,
    label: "Service hub",
    subtitle: "Request prepared locally",
    etaMinutes: 18,
    latitude: 28.6129,
    longitude: 77.209,
    heading: 32,
    speed: 0,
    status: "pending",
    zone: "Service hub",
  },
  {
    stepIndex: 1,
    label: "Main road",
    subtitle: "Payment confirmed locally",
    etaMinutes: 12,
    latitude: 28.6182,
    longitude: 77.2182,
    heading: 54,
    speed: 18,
    status: "confirmed",
    zone: "Main road",
  },
];

const localBookings = [];
const localPayments = [];

const clone = (value) => JSON.parse(JSON.stringify(value));

const nowIso = () => new Date().toISOString();

const upsertLocalBooking = (booking) => {
  const index = localBookings.findIndex((item) => item.bookingId === booking.bookingId || item.id === booking.id);
  const nextBooking = {
    ...booking,
  };

  if (index >= 0) {
    localBookings[index] = {
      ...localBookings[index],
      ...nextBooking,
    };
  } else {
    localBookings.unshift(nextBooking);
  }

  return nextBooking;
};

const upsertLocalPayment = (payment) => {
  const index = localPayments.findIndex((item) => item.id === payment.id);
  const nextPayment = {
    ...payment,
  };

  if (index >= 0) {
    localPayments[index] = nextPayment;
  } else {
    localPayments.unshift(nextPayment);
  }

  return nextPayment;
};

export const buildLocalBooking = ({ worker, serviceId, date, address, notes, estimatedAmount }) => {
  const bookingId = `b${Date.now()}`;
  const createdAt = nowIso();
  const booking = {
    id: bookingId,
    bookingId,
    workerId: worker?.id || "",
    worker: worker
      ? {
          id: worker.id,
          name: worker.name,
          rating: worker.rating,
          experience: worker.experience,
          price: worker.price ?? worker.hourlyRate ?? 0,
          hourlyRate: worker.hourlyRate ?? worker.price ?? 0,
          serviceId: worker.serviceId,
          about: worker.about,
        }
      : null,
    serviceId: serviceId || worker?.serviceId || "",
    date,
    address,
    notes: notes || "",
    estimatedAmount: estimatedAmount ?? null,
    status: "pending",
    paymentStatus: "unpaid",
    trackingStep: 0,
    trackingUpdatedAt: createdAt,
    createdAt,
  };

  upsertLocalBooking(booking);

  return {
    booking,
    trackingSnapshot: buildLocalTrackingSnapshot({
      bookingId,
      worker,
      serviceId: serviceId || worker?.serviceId || "",
      stepIndex: 0,
      status: "pending",
      paymentStatus: "unpaid",
      address,
      updatedAt: createdAt,
    }),
  };
};

export const buildLocalPaymentResult = ({ bookingId, worker, amount, booking, status = "confirmed" }) => ({
  payment: upsertLocalPayment({
    id: `p${Date.now()}`,
    bookingId,
    amount,
    method: "razorpay",
    status: "paid",
    createdAt: nowIso(),
  }),
  booking: booking
    ? upsertLocalBooking({
        ...booking,
        status,
        paymentStatus: "paid",
        trackingStep: Math.max(booking.trackingStep || 0, 1),
        trackingUpdatedAt: nowIso(),
      })
    : null,
  trackingSnapshot: buildLocalTrackingSnapshot({
    bookingId,
    worker,
    serviceId: booking?.serviceId || worker?.serviceId || "",
    stepIndex: 1,
    status,
    paymentStatus: "paid",
    address: booking?.address || "",
    updatedAt: nowIso(),
  }),
});

export const getLocalBookingById = (bookingId) => {
  const booking = localBookings.find((item) => item.bookingId === bookingId || item.id === bookingId);
  return booking ? clone(booking) : null;
};

export const getLocalPaymentHistory = (userEmail = null) => {
  const history = userEmail ? localPayments.filter((payment) => payment.userEmail === userEmail) : localPayments;
  return clone(history).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getLocalBookingPaymentDetails = (bookingId, userEmail = null) => {
  const booking = getLocalBookingById(bookingId);
  const history = localPayments
    .filter((payment) => payment.bookingId === bookingId && (!userEmail || payment.userEmail === userEmail))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    booking,
    payment: history[0] || null,
    history,
    trackingSnapshot: booking
      ? buildLocalTrackingSnapshot({
          bookingId,
          worker: booking.worker ? booking.worker : null,
          serviceId: booking.serviceId || "",
          stepIndex: Math.max(booking.trackingStep || 0, 0),
          status: booking.status || "pending",
          paymentStatus: booking.paymentStatus || "unpaid",
          address: booking.address || "",
          updatedAt: booking.trackingUpdatedAt || booking.createdAt || nowIso(),
        })
      : null,
  };
};

export const createLocalPaymentOrder = ({ bookingId, amount, method = "razorpay", userEmail = null, userId = null, booking = null }) => {
  const createdAt = nowIso();
  const order = {
    id: `o${Date.now()}`,
    bookingId,
    amount,
    currency: "INR",
    method,
    status: "created",
    userId,
    userEmail,
    createdAt,
  };

  if (booking) {
    upsertLocalBooking({
      ...booking,
      pendingPaymentOrderId: order.id,
      paymentStatus: booking.paymentStatus || "unpaid",
      trackingUpdatedAt: createdAt,
    });
  }

  return order;
};

export const confirmLocalPayment = ({
  bookingId,
  amount,
  booking,
  worker,
  orderId,
  paymentId,
  signature,
  userEmail = null,
  userId = null,
}) => {
  const createdAt = nowIso();
  const payment = upsertLocalPayment({
    id: paymentId || `p${Date.now()}`,
    bookingId,
    orderId,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId || null,
    razorpay_signature: signature || null,
    amount,
    method: "razorpay",
    status: "paid",
    userId,
    userEmail,
    createdAt,
  });

  const updatedBooking = booking
    ? upsertLocalBooking({
        ...booking,
        status: "confirmed",
        paymentStatus: "paid",
        trackingStep: Math.max(booking.trackingStep || 0, 1),
        trackingUpdatedAt: createdAt,
      })
    : getLocalBookingById(bookingId);

  const resolvedBooking = updatedBooking || booking || null;

  return {
    payment,
    booking: resolvedBooking,
    trackingSnapshot: buildLocalTrackingSnapshot({
      bookingId,
      worker,
      serviceId: resolvedBooking?.serviceId || worker?.serviceId || "",
      stepIndex: Math.max(resolvedBooking?.trackingStep || 1, 1),
      status: resolvedBooking?.status || "confirmed",
      paymentStatus: "paid",
      address: resolvedBooking?.address || "",
      updatedAt: createdAt,
    }),
  };
};

export const buildLocalTrackingSnapshot = ({
  bookingId,
  worker,
  serviceId,
  stepIndex = 0,
  status = "pending",
  paymentStatus = "unpaid",
  address = "",
  updatedAt = new Date().toISOString(),
} = {}) => {
  const point = routePoints[stepIndex] || routePoints[0];

  return {
    bookingId,
    bookingRef: bookingId,
    workerId: worker?.id || "",
    serviceId: serviceId || worker?.serviceId || "",
    status,
    paymentStatus,
    stepIndex: point.stepIndex,
    progress: point.stepIndex / Math.max(routePoints.length - 1, 1),
    label: point.label,
    subtitle: point.subtitle,
    zone: point.zone,
    address,
    etaMinutes: point.etaMinutes,
    latitude: point.latitude,
    longitude: point.longitude,
    heading: point.heading,
    speed: point.speed,
    updatedAt,
    worker: worker
      ? {
          id: worker.id,
          name: worker.name,
          rating: worker.rating,
          experience: worker.experience,
          price: worker.price ?? worker.hourlyRate ?? 0,
          serviceId: worker.serviceId,
          about: worker.about,
        }
      : null,
    service: null,
    route: routePoints,
  };
};
