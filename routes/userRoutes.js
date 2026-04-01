const express = require("express");

const router = express.Router();
const User = require("../models/User");

// Create a new user
router.post("/users", async (req, res) => {
  try {
    if (!req.body.email || !req.body.password || !req.body.name) {
      return res.status(400).json({ error: "Required fields missing" });
    }
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser).select("-password");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    const { search } = req.query;

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

    const users = await User.find(query);
    if (users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }
    res.status(200).json(users).select("-password");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Get user by Id
router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await User.findById(id);
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(userData).select("-password");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user by Id
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
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
