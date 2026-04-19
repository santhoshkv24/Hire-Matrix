const mongoose = require("mongoose");
const env = require("./env");

const connectDatabase = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log(`[db] connected: ${mongoose.connection.name}`);
};

module.exports = {
  connectDatabase,
};