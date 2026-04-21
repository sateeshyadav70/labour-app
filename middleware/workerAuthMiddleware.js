const jwt = require("jsonwebtoken");
const Worker = require("../models/Workers");
const { getSessionAuth } = require("../utils/authSession");

const extractToken = (req) => {
  if (req.headers.authorization) {
    return req.headers.authorization.startsWith("Bearer")
      ? req.headers.authorization.split(" ")[1]
      : req.headers.authorization;
  }

  return req.headers["x-auth-token"] || null;
};

const protectWorker = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    const sessionAuth = getSessionAuth(req);

    if (!sessionAuth || sessionAuth.accountType !== "worker" || !sessionAuth.accountId) {
      return res.status(401).json({ message: "No token" });
    }

    const worker = await Worker.findById(sessionAuth.accountId).select("-password");

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    if (worker.isApproved === false || worker.isVerified === false) {
      return res.status(403).json({ message: "Admin approval required" });
    }

    req.auth = { id: worker._id };
    req.user = worker;
    req.worker = worker;
    req.accountType = "worker";
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const worker = await Worker.findById(decoded.id).select("-password");

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    if (worker.isApproved === false || worker.isVerified === false) {
      return res.status(403).json({ message: "Admin approval required" });
    }

    req.auth = decoded;
    req.user = worker;
    req.worker = worker;

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = protectWorker;
