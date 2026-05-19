const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'chatty-secret-key';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, faceData, FaceData } = req.body;
    const userFaceData = faceData ?? FaceData ?? null;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    const user = await User.create({
      userId,
      name,
      email,
      password: hashedPassword,
      ...(userFaceData != null && { faceData: userFaceData }),
    });

    const token = jwt.sign({ userId: user.userId, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        faceData: user.faceData,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error while creating user.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ userId: user.userId, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error while logging in.' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findOne({ userId }).select('-password -_id -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ error: 'Server error while fetching user details.' });
  }
});

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { userId: currentUserId } = req.user;
    const users = await User.find({ userId: { $ne: currentUserId } }).select('-password -_id -__v');

    res.json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Server error while fetching users.' });
  }
});

module.exports = router;
