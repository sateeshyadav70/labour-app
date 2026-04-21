const sendSuccess = (res, message, data = {}, status = 200, meta = {}) => {
  const payload = {
    success: true,
    message,
  };

  if (data !== undefined) {
    payload.data = data;

    if (data && typeof data === "object" && !Array.isArray(data)) {
      Object.assign(payload, data);
    }
  }

  if (meta && typeof meta === "object" && Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  return res.status(status).json(payload);
};

const sendError = (res, status, message, details = undefined) => {
  const payload = {
    success: false,
    message,
  };

  if (details !== undefined) {
    payload.details = details;
  }

  return res.status(status).json(payload);
};

module.exports = {
  sendSuccess,
  sendError,
};
