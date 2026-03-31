const express = require("express");

const router = express.Router();
const user = require("../models/User");

// Create a new user
router.post("/users", async (req, res) => {
  try {
    const newUser = new user(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;    
