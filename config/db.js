const mongoose = require("mongoose");

const connectDB = () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;

  if (!mongoUri) {
    return Promise.reject(new Error("Missing MONGO_URI in environment"));
  }

  return mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("MongoDB is connected");
    });
};

module.exports = connectDB;
