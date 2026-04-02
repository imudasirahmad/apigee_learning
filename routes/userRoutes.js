const express = require("express");

const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

// Create a new user
router.post("/users", async (req, res) => {
  try {
    if (!req.body.email || !req.body.password || !req.body.name) {
      return res.status(400).json({ error: "Required fields missing" });
    }
    const email = req.body.email.toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    req.body.password = hashedPassword;
    req.body.email = email;
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    const userResponse = savedUser.toObject();
    delete userResponse.password;
    res.status(201).json(userResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    const { search } = req.query;
    if (search && typeof search !== "string") {
      return res.status(400).json({ error: "Search query must be a string" });
    }
    if (search.length < 3) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 3 characters long" });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let query = {};
    if (search) {
      query = {
        $or: [
          {
            name: { $regex: search, $options: "i" },
          },
          {
            email: { $regex: search, $options: "i" },
          },
        ],
      };
    }

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-password");

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Get user by Id
router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const userData = await User.findById(id).select("-password");
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user by Id
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if(Object.keys(req.body).length ===0){
        return res.status(400).json({ error: "No data provided" });
    }

    if (req.body.password) {
      return res
        .status(400)
        .json({ error: "Use dedicated endpoint to update password" });
    }
    const updatedUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
    }).select("-password");
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//delete a user
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
