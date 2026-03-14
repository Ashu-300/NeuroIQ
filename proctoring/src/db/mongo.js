const { config } = require("dotenv");
const mongoose = require("mongoose");
const settings = require('../config/config');

const connectDB = async () => {
  try {
    mongouri = settings.MONGO_URI  
    await mongoose.connect(mongouri);

    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error(" ❌MongoDB Connection Error:", error);
    process.exit(1);
  }
};

module.exports = {connectDB};