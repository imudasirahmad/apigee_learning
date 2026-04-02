const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  age: {
    type: Number,
    required: false,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
  type: String,
  enum: ["user", "admin"],
  default: "user"
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
},{ timestamps: true });

const User = mongoose.model("User", userSchema);

module.exports = User;