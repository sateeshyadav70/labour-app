const jwt = require("jsonwebtoken");
const User = require("../models/Users");
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

const protectAny = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    const sessionAuth = getSessionAuth(req);

    if (!sessionAuth || !sessionAuth.accountId) {
      return res.status(401).json({ message: "No token" });
    }

    try {
      if (sessionAuth.accountType === "worker") {
        const worker = await Worker.findById(sessionAuth.accountId).select("-password");

        if (worker) {
          req.auth = { id: worker._id };
          req.user = worker;
          req.account = worker;
          req.accountType = "worker";
          return next();
        }
      }

      const user = await User.findById(sessionAuth.accountId).select("-password");
      if (user) {
        req.auth = { id: user._id };
        req.user = user;
        req.account = user;
        req.accountType = sessionAuth.accountType || "user";
        return next();
      }

      return res.status(401).json({ message: "Not authorized" });
    } catch (error) {
      return res.status(401).json({ message: "Not authorized" });
    }
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (user) {
      req.auth = decoded;
      req.user = user;
      req.account = user;
      req.accountType = "user";
      return next();
    }

    const worker = await Worker.findById(decoded.id).select("-password");
    if (worker) {
      req.auth = decoded;
      req.user = worker;
      req.account = worker;
      req.accountType = "worker";
      return next();
    }

    return res.status(401).json({ message: "Not authorized" });
  } catch (error) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = protectAny;
