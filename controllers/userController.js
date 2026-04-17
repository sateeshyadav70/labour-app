const mongoose = require("mongoose");
const User = require("../models/Users");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const {
  serializeAddressBookEntry,
  serializeUser,
} = require("../utils/serializers");
const { parseLocationInput } = require("../utils/coordinates");

const buildAddressBookEntry = (body = {}) => {
  const location = parseLocationInput(body.location || body);

  return {
    label: body.label || body.type || body.name || "Home",
    name: body.name || body.recipientName || body.contactName || "",
    phone: body.phone || "",
    addressLine1: body.addressLine1 || body.address || "",
    addressLine2: body.addressLine2 || "",
    landmark: body.landmark || "",
    city: body.city || "",
    state: body.state || "",
    pincode: body.pincode || "",
    lat: location?.lat,
    lng: location?.lng,
    isDefault: Boolean(body.isDefault),
    notes: body.notes || "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const buildPinnedLocation = (body = {}, fallbackAddress = null) => {
  const location = parseLocationInput(body.location || body);
  const address = fallbackAddress || {};
  const addressBookId = body.addressBookId && mongoose.Types.ObjectId.isValid(body.addressBookId)
    ? body.addressBookId
    : address._id && mongoose.Types.ObjectId.isValid(String(address._id))
    ? address._id
    : null;

  return {
    addressBookId,
    label: body.label || address.label || body.type || body.name || "Pinned location",
    addressLine1: body.addressLine1 || address.addressLine1 || body.address || "",
    addressLine2: body.addressLine2 || address.addressLine2 || "",
    landmark: body.landmark || address.landmark || "",
    city: body.city || address.city || "",
    state: body.state || address.state || "",
    pincode: body.pincode || address.pincode || "",
    lat: location?.lat ?? body.lat ?? address.lat ?? null,
    lng: location?.lng ?? body.lng ?? address.lng ?? null,
    source: body.source || "manual",
    updatedAt: new Date(),
  };
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    return sendSuccess(res, "Profile fetched successfully", {
      user: serializeUser(user),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updatePinnedLocation = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    let address = null;

    if (req.body?.addressBookId) {
      address = (user.addressBook || []).find(
        (entry) => String(entry._id) === String(req.body.addressBookId)
      );
    }

    const pinnedLocation = buildPinnedLocation(req.body || {}, address);

    if (!Number.isFinite(Number(pinnedLocation.lat)) || !Number.isFinite(Number(pinnedLocation.lng))) {
      return sendError(res, 400, "A valid location.lat and location.lng are required");
    }

    user.pinnedLocation = pinnedLocation;
    user.address = pinnedLocation.addressLine1 || user.address;
    await user.save();

    return sendSuccess(res, "Pinned location updated successfully", {
      user: serializeUser(user),
      pinnedLocation: serializeUser(user).pinnedLocation,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getAddressBook = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addressBook");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    return sendSuccess(res, "Address book fetched successfully", {
      addressBook: (user.addressBook || []).map(serializeAddressBookEntry),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.addAddressBookEntry = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    const entry = buildAddressBookEntry(req.body || {});

    if (!entry.addressLine1) {
      return sendError(res, 400, "addressLine1 or address is required");
    }

    const addressBook = Array.isArray(user.addressBook) ? user.addressBook : [];
    const shouldMakeDefault = entry.isDefault || addressBook.length === 0;

    if (shouldMakeDefault) {
      user.addressBook = addressBook.map((existing) => {
        const plain = typeof existing.toObject === "function" ? existing.toObject() : existing;
        return {
          ...plain,
          isDefault: false,
        };
      });
      entry.isDefault = true;
      user.pinnedLocation = buildPinnedLocation(entry, null);
      user.address = entry.addressLine1 || user.address;
    }

    user.addressBook.push(entry);
    user.markModified("addressBook");

    await user.save();

    const savedEntry = user.addressBook[user.addressBook.length - 1];

    return sendSuccess(res, "Address added successfully", {
      address: serializeAddressBookEntry(savedEntry),
      addressBook: (user.addressBook || []).map(serializeAddressBookEntry),
    }, 201);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
