const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_ration_key_2026';

// Register a new user (for initial setup)
router.post('/register', async (req, res) => {
  const { username, password, role, name } = req.body;
  
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const db = await getDb('admin_users');
    
    // Check if user already exists
    try {
      await db.get(username);
      return res.status(400).json({ success: false, message: 'User already exists' });
    } catch (e) {
      // Missing is good! (404)
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userDoc = {
      _id: username, // Using username as document ID for easy lookup
      name,
      password_hash,
      role, // e.g. 'DISTRIBUTOR', 'STATE_ADMIN', 'DISTRICT_ADMIN'
      created_at: new Date().toISOString()
    };

    await db.insert(userDoc);
    res.json({ success: true, message: 'User registered successfully' });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  try {
    const db = await getDb('admin_users');
    
    let user;
    try {
      user = await db.get(username);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT — include location so distributor can scope their data
    const payload = {
      user: {
        username: user._id,
        role: user.role,
        name: user.name,
        assignedLocation: user.assignedLocation || null,
        assignedVillage: user.assignedVillage || null,
        district: user.district || null,
      }
    };

    jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
      if (err) throw err;
      res.json({ 
        success: true, 
        token,
        user: payload.user
      });
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

module.exports = router;
