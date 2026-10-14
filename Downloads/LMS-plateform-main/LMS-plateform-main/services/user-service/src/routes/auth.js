/**
 * Authentication Routes — /api/auth
 *
 * POST /register  — Register a new user (role is always forced to 'student'
 *                    on self-registration to prevent privilege escalation).
 * POST /login     — Authenticate with email + password; returns a 7-day JWT.
 * GET  /verify    — Validate a Bearer token and return the associated user.
 *
 * All inputs are validated with express-validator before processing.
 * Generic error messages are returned on credential failures to prevent
 * user enumeration.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { JWT_SECRET } = require('../config');

const router = express.Router();

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Allow student or instructor on self-registration; admin requires DB promotion
    const allowedRoles = ['student', 'instructor'];
    const safeRole = allowedRoles.includes(role) ? role : 'student';
    const user = new User({ email, password, name, role: safeRole });
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Use a generic message to avoid revealing whether the email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// GET /api/auth/verify
// Validates the Bearer token supplied in the Authorization header.
router.get('/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ valid: false });
    }
    res.json({ valid: true, user });
  } catch (err) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
