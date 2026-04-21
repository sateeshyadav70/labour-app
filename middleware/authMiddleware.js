const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const { getSessionAuth } = require("../utils/authSession");

const loadUserFromSession = async (req) => {
  const sessionAuth = getSessionAuth(req);

  if (!sessionAuth || !sessionAuth.accountId) {
    return null;
  }

  return User.findById(sessionAuth.accountId).select("-password");
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization) {
    token = req.headers.authorization.startsWith("Bearer")
      ? req.headers.authorization.split(" ")[1]
      : req.headers.authorization;
  } else if (req.headers["x-auth-token"]) {
    token = req.headers["x-auth-token"];
  }

  if (!token) {
    const sessionUser = await loadUserFromSession(req);

    if (!sessionUser) {
      return res.status(401).json({ message: "No token" });
    }

    req.auth = { id: sessionUser._id };
    req.user = sessionUser;
    req.userId = sessionUser._id;
    req.accountType = getSessionAuth(req)?.accountType || "user";
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    req.user = user;
    req.userId = decoded.id;

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = protect;
