const express = require("express");

const router = express.Router();
const User = require("../models/User");
const BlacklistedToken = require("../models/BlacklistedToken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  try {
    // Check if token is blacklisted
    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted) {
      return res.status(403).json({ error: "Token expired" });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      req.user = user;
      next();
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
router.get("/users", authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    if (search && typeof search !== "string") {
      return res.status(400).json({ error: "Search query must be a string" });
    }
    if (search && search.length < 3) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 3 characters long" });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let query = { isDeleted: false };
    if (search) {
      query.$or = [
        {
          name: { $regex: search, $options: "i" },
        },
        {
          email: { $regex: search, $options: "i" },
        },
      ];
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
router.get("/users/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const userData = await User.findOne({ _id: id, isDeleted: false }).select(
      "-password",
    );
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user by Id
// router.put("/users/:id", authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ error: "Invalid user ID" });
//     }

//     if (Object.keys(req.body).length === 0) {
//       return res.status(400).json({ error: "No data provided" });
//     }

//     if (req.body.password) {
//       return res
//         .status(400)
//         .json({ error: "Use dedicated endpoint to update password" });
//     }
//     const updatedUser = await User.findOneAndUpdate(
//       { _id: id, isDeleted: false },
//       req.body,
//       {
//         new: true,
//       },
//     ).select("-password");
//     if (!updatedUser) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     res.status(200).json(updatedUser);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
router.patch("/users/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "No data provided" });
    }

    if (req.body.password) {
      return res
        .status(400)
        .json({ error: "Use dedicated endpoint to update password" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: req.body }, // partial update
      {
        new: true,
      },
    ).select("-password");
     if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//delete a user
router.delete("/users/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const deletedUser = await User.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true },
    );
    if (!deletedUser) {
      return res
        .status(404)
        .json({ error: "User not found or already deleted" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//login API
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid password" });
    }
    const userResponse = user.toObject();
    delete userResponse.password;
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({ user: userResponse, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//change password API
router.post(
  "/users/:id/change-password",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { oldPassword, newPassword } = req.body;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      if (!oldPassword || !newPassword) {
        return res
          .status(400)
          .json({ error: "Old password and new password are required" });
      }
      const user = await User.findOne({ _id: id, isDeleted: false });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const isOldPasswordValid = await bcrypt.compare(
        oldPassword,
        user.password,
      );
      if (!isOldPasswordValid) {
        return res.status(400).json({ error: "Old password is incorrect" });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const updatedUser = await User.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { password: hashedNewPassword },
        { new: true },
      ).select("-password");
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Get current user profile
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user.userId,
      isDeleted: false,
    }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


//logout API
router.post("/logout", authenticateToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    try {
      const expiresAt = new Date(req.user.exp * 1000);
      await BlacklistedToken.create({ token, expiresAt });
      res.status(200).json({ message: "Logged out successfully." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(400).json({ error: "No token provided" });
  }
});
module.exports = router;
