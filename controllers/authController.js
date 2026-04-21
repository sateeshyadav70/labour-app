const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { serializeUser, serializeWorker } = require("../utils/serializers");
const { persistAuthSession } = require("../utils/authSession");

const buildAuthSuccess = (res, account, accountType, message = "Login successful") => {
  const isWorker = accountType === "worker";
  const isAdmin = accountType === "admin";
  const serializedAccount = isWorker ? serializeWorker(account) : serializeUser(account);
  const payloadKey = isWorker ? "worker" : isAdmin ? "admin" : "user";
  const token = generateToken(account._id);

  return sendSuccess(res, message, {
    _id: account._id,
    name: account.name,
    email: account.email,
    [payloadKey]: serializedAccount,
    token,
    accountType,
  });
};
exports.registerUser = async (req, res) => {
  const { name, email, password, phone } = req.body || {};

  try {
    if (!name || !email || !password) {
      return sendError(
        res,
        400,
        "Name, email, and password are required"
      );
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return sendError(res, 400, "User already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "user",
    });

    const token = generateToken(user._id);
    const userData = serializeUser(user);

    await persistAuthSession(req, {
      accountType: "user",
      accountId: user._id,
      email: user.email,
      name: user.name,
    });

    return sendSuccess(
      res,
      "User registered successfully",
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        user: userData,
        token,
        accountType: "user",
      },
      201
    );
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// Login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body || {};

  try {
    if (!email || !password) {
      return sendError(res, 400, "Email and password are required");
    }

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (user.role === "admin") {
        return sendError(res, 403, "Use admin login");
      }

      user.lastLoginAt = new Date();
      await user.save();
      await persistAuthSession(req, {
        accountType: "user",
        accountId: user._id,
        email: user.email,
        name: user.name,
      });

      return buildAuthSuccess(res, user, "user");
    }

    return sendError(res, 401, "Invalid credentials");
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
