const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error("Unhandled application error:", err);

  return res.status(500).json({
    success: false,
    message: err?.message || "Internal server error",
  });
};

module.exports = errorHandler;
