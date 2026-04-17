const serializeAddressBookEntry = (entry) => {
  if (!entry) {
    return null;
  }

  return {
    _id: entry._id,
    label: entry.label,
    name: entry.name,
    phone: entry.phone,
    addressLine1: entry.addressLine1,
    addressLine2: entry.addressLine2,
    landmark: entry.landmark,
    city: entry.city,
    state: entry.state,
    pincode: entry.pincode,
    lat: entry.lat,
    lng: entry.lng,
    isDefault: entry.isDefault,
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
};

const serializeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role || "user",
    lastLoginAt: user.lastLoginAt || null,
    address: user.address,
    addressBook: Array.isArray(user.addressBook)
      ? user.addressBook.map(serializeAddressBookEntry)
      : [],
    pinnedLocation: user.pinnedLocation
      ? {
          addressBookId: user.pinnedLocation.addressBookId || null,
          label: user.pinnedLocation.label || null,
          addressLine1: user.pinnedLocation.addressLine1 || null,
          addressLine2: user.pinnedLocation.addressLine2 || null,
          landmark: user.pinnedLocation.landmark || null,
          city: user.pinnedLocation.city || null,
          state: user.pinnedLocation.state || null,
          pincode: user.pinnedLocation.pincode || null,
          lat: user.pinnedLocation.lat ?? null,
          lng: user.pinnedLocation.lng ?? null,
          source: user.pinnedLocation.source || null,
          updatedAt: user.pinnedLocation.updatedAt || null,
        }
      : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const serializeWorker = (worker) => {
  if (!worker) {
    return null;
  }

  return {
    _id: worker._id,
    name: worker.name,
    email: worker.email,
    phone: worker.phone,
    address: worker.address,
    services: Array.isArray(worker.services) ? worker.services : [],
    skills: Array.isArray(worker.skills) ? worker.skills : [],
    experience: worker.experience,
    hourlyRate: worker.hourlyRate,
    location: worker.location,
    profileImage: worker.profileImage,
    workImages: worker.workImages,
    rating: worker.rating,
    numReviews: worker.numReviews,
    isAvailable: worker.isAvailable,
    isVerified: worker.isVerified,
    isApproved: worker.isApproved,
    isOnline: worker.isOnline,
    applicationStatus: worker.applicationStatus,
    serviceIds: Array.isArray(worker.services)
      ? worker.services
      : Array.isArray(worker.skills)
      ? worker.skills
      : [],
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
};

const serializeWorkerSearchResult = (worker, meta = {}) => {
  return {
    ...serializeWorker(worker),
    distance: meta.distance ?? null,
    time: meta.time ?? null,
    etaMinutes: meta.etaMinutes ?? meta.time ?? null,
    price: meta.price ?? worker?.hourlyRate ?? null,
    ...meta,
  };
};

const serializeService = (service) => {
  if (!service) {
    return null;
  }

  return {
    _id: service._id,
    slug: service.slug,
    serviceId: service.serviceId,
    name: service.name,
    title: service.title,
    category: service.category,
    description: service.description,
    color: service.color,
    basePrice: service.basePrice,
    ratePerHour: service.ratePerHour,
    image: service.image,
    illustrationKey: service.illustrationKey,
    badgeText: service.badgeText,
    sortOrder: service.sortOrder,
    includedScope: service.includedScope,
    optionalAddons: service.optionalAddons,
    skillTags: service.skillTags,
    durationMins: service.durationMins,
    cancellationNote: service.cancellationNote,
    featured: service.featured,
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
};

const serializeHomeService = (service) => {
  if (!service) {
    return null;
  }

  return {
    id: service.id,
    title: service.title,
    description: service.description,
    color: service.color,
    ratePerHour: service.ratePerHour,
    badgeText: service.badgeText,
    sortOrder: service.sortOrder,
    illustrationKey: service.illustrationKey,
  };
};

const serializeHomeServiceDetail = (service) => {
  if (!service) {
    return null;
  }

  return {
    ...serializeHomeService(service),
    serviceId: service.serviceId,
    category: service.category,
    skillTags: service.skillTags,
    durationMins: service.durationMins,
    cancellationNote: service.cancellationNote,
    includedScope: service.includedScope,
    optionalAddons: service.optionalAddons,
    bookingSummary: service.bookingSummary,
  };
};

const serializePayment = (payment) => {
  if (!payment) {
    return null;
  }

  return {
    provider: payment.provider,
    orderId: payment.orderId,
    paymentId: payment.paymentId,
    signature: payment.signature,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paidAt: payment.paidAt,
    receipt: payment.receipt,
    method: payment.method,
    notes: payment.notes,
  };
};

const serializePaymentRecord = (payment) => {
  if (!payment) {
    return null;
  }

  return {
    _id: payment._id,
    bookingId: payment.bookingId?._id || payment.bookingId || null,
    amount: payment.amount,
    status: payment.status,
    razorpay_order_id: payment.razorpay_order_id,
    razorpay_payment_id: payment.razorpay_payment_id,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
};

const serializeTrackingPoint = (point) => {
  if (!point) {
    return null;
  }

  return {
    lat: point.lat,
    lng: point.lng,
    accuracy: point.accuracy,
    source: point.source,
    recordedAt: point.recordedAt,
  };
};

const serializeChatMessage = (message) => {
  if (!message) {
    return null;
  }

  return {
    senderType: message.senderType,
    sender: message.sender,
    senderModel: message.senderModel,
    message: message.message,
    createdAt: message.createdAt,
    deliveredAt: message.deliveredAt,
    readAt: message.readAt,
  };
};

const serializeTrackingSnapshot = (snapshot) => {
  if (!snapshot) {
    return null;
  }

  return {
    bookingId: snapshot.bookingId || null,
    workerId: snapshot.workerId || null,
    serviceId: snapshot.serviceId || null,
    status: snapshot.status || null,
    paymentStatus: snapshot.paymentStatus || null,
    stepIndex: snapshot.stepIndex ?? null,
    progress: snapshot.progress ?? null,
    label: snapshot.label || null,
    subtitle: snapshot.subtitle || null,
    zone: snapshot.zone || null,
    address: snapshot.address || null,
    etaMinutes: snapshot.etaMinutes ?? null,
    latitude: snapshot.latitude ?? null,
    longitude: snapshot.longitude ?? null,
    heading: snapshot.heading ?? null,
    speed: snapshot.speed ?? null,
    updatedAt: snapshot.updatedAt || null,
  };
};

const serializeBooking = (booking) => {
  if (!booking) {
    return null;
  }

  return {
    _id: booking._id,
    user: booking.user,
    worker: booking.worker,
    serviceId: booking.serviceId,
    serviceType: booking.serviceType,
    notes: booking.notes,
    estimatedAmount: booking.estimatedAmount,
    address: booking.address,
    date: booking.date,
    userLocation: booking.userLocation,
    distance: booking.distance,
    estimatedTime: booking.estimatedTime,
    broadcastHistory: booking.broadcastHistory,
    trackingHistory: Array.isArray(booking.trackingHistory)
      ? booking.trackingHistory.map(serializeTrackingPoint)
      : [],
    chatMessages: Array.isArray(booking.chatMessages)
      ? booking.chatMessages.map(serializeChatMessage)
      : [],
    payment: serializePayment(booking.payment),
    status: booking.status,
    bookingStatus: booking.status,
    paymentStatus: booking.paymentStatus,
    trackingSnapshot: serializeTrackingSnapshot(booking.trackingSnapshot),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
};

const serializePaymentOrder = (order, booking = null) => {
  if (!order) {
    return null;
  }

  return {
    id: order.id,
    entity: order.entity,
    amount: order.amount,
    amount_paid: order.amount_paid,
    amount_due: order.amount_due,
    currency: order.currency,
    receipt: order.receipt,
    status: order.status,
    attempts: order.attempts,
    notes: order.notes,
    created_at: order.created_at,
    order,
    bookingId: booking?._id || booking?.bookingId || null,
    payment: booking ? serializePayment(booking.payment) : null,
  };
};

module.exports = {
  serializeUser,
  serializeAddressBookEntry,
  serializeWorker,
  serializeWorkerSearchResult,
  serializeService,
  serializeHomeService,
  serializeHomeServiceDetail,
  serializeBooking,
  serializePayment,
  serializePaymentRecord,
  serializePaymentOrder,
  serializeTrackingSnapshot,
};
