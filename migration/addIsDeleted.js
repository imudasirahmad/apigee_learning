const mongoose = require("mongoose");
const User = require("../models/User");

async function migrateIsDeleted() {
  try {
    mongoose.connect("mongodb://localhost:27017/api-learning")
    const result = await User.updateMany(
      { isDeleted: { $exists: false } }, //Condition: Find docs missing 'isDeleted'
      { $set: { isDeleted: false } },
    );
    console.log("Migration completed successfully:", result);
    process.exit();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit();
  }
}

migrateIsDeleted();
