const buckets = new Map();

const createRateLimit = ({
  key = "default",
  windowMs = 15 * 60 * 1000,
  limit = 10,
  message = "Too many requests, please try again later.",
} = {}) => {
  return (req, res, next) => {
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown";

    const bucketKey = `${key}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(bucketKey) || {
      count: 0,
      resetAt: now + windowMs,
    };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(bucketKey, bucket);

    if (bucket.count > limit) {
      return res.status(429).json({
        success: false,
        message,
      });
    }

    return next();
  };
};

module.exports = createRateLimit;
