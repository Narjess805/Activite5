/**
 * User Profile Routes — /api/users
 *
 * All routes require a valid Bearer JWT (authenticate middleware).
 *
 * GET  /me       — Return the currently authenticated user's profile.
 * PUT  /me       — Partially update name, bio, or avatar_url for the
 *                   authenticated user (password changes not supported here).
 * GET  /         — Paginated list of all users (admin role required).
 * GET  /:id      — Fetch any user by their MongoDB ObjectId.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_SKILL_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);
const ALLOWED_LEARNING_STYLES = new Set(['hands_on', 'theory_first', 'short_lessons', 'mixed']);

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function sanitizeLearningPreferences(input = {}) {
  const preferences = {};

  if (input.interests !== undefined) {
    preferences.interests = normalizeStringArray(input.interests);
  }
  if (input.skill_level !== undefined) {
    const skillLevel = String(input.skill_level || '').trim().toLowerCase();
    if (!ALLOWED_SKILL_LEVELS.has(skillLevel)) {
      throw new Error('Invalid skill_level.');
    }
    preferences.skill_level = skillLevel;
  }
  if (input.learning_goal !== undefined) {
    preferences.learning_goal = String(input.learning_goal || '').trim();
  }
  if (input.preferred_categories !== undefined) {
    preferences.preferred_categories = normalizeStringArray(input.preferred_categories);
  }
  if (input.preferred_formats !== undefined) {
    preferences.preferred_formats = normalizeStringArray(input.preferred_formats);
  }
  if (input.weekly_hours !== undefined) {
    const weeklyHours = Number(input.weekly_hours);
    if (!Number.isFinite(weeklyHours) || weeklyHours < 0) {
      throw new Error('Invalid weekly_hours.');
    }
    preferences.weekly_hours = weeklyHours;
  }
  if (input.learning_style !== undefined) {
    const learningStyle = String(input.learning_style || '').trim().toLowerCase();
    if (!ALLOWED_LEARNING_STYLES.has(learningStyle)) {
      throw new Error('Invalid learning_style.');
    }
    preferences.learning_style = learningStyle;
  }

  return preferences;
}

// GET /api/users/me — Fetch the authenticated user's own profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/users/me — Update the authenticated user's editable fields
router.put('/me', authenticate, [
  body('name').optional().trim().notEmpty(),
  body('bio').optional().trim(),
  body('avatar_url').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only allow updating whitelisted fields
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.body.avatar_url !== undefined) updates.avatar_url = req.body.avatar_url;
    if (req.body.learning_preferences !== undefined) {
      updates.learning_preferences = sanitizeLearningPreferences(req.body.learning_preferences);
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (err) {
    if (err.message && err.message.startsWith('Invalid ')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/users — Paginated user list (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find().skip(skip).limit(limit);
    const total = await User.countDocuments();

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/users/:id — Fetch a specific user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
