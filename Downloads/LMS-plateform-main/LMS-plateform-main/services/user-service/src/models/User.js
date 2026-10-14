/**
 * User Mongoose Model
 *
 * Represents a platform user. Supports three roles: student (default),
 * instructor, and admin.
 *
 * Security features:
 *  - Passwords are hashed with bcrypt (cost factor 12) before persisting.
 *  - The 'password' field is stripped from all JSON serialisations via
 *    the custom toJSON method, so it is never accidentally sent to clients.
 *
 * Instance methods:x
 *  - comparePassword(candidate)  — Constant-time bcrypt comparison.
 *
 * Timestamps (createdAt / updatedAt) are managed automatically.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const learningPreferencesSchema = new mongoose.Schema({
  interests: {
    type: [String],
    default: [],
  },
  skill_level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  learning_goal: {
    type: String,
    default: '',
  },
  preferred_categories: {
    type: [String],
    default: [],
  },
  preferred_formats: {
    type: [String],
    default: [],
  },
  weekly_hours: {
    type: Number,
    default: 0,
    min: 0,
  },
  learning_style: {
    type: String,
    enum: ['hands_on', 'theory_first', 'short_lessons', 'mixed'],
    default: 'mixed',
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  /** Unique email address — used as the login identifier. */
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  /** Bcrypt-hashed password (plain text is never stored). */
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  /** Display name shown in the UI. */
  name: {
    type: String,
    required: true,
    trim: true,
  },
  /** Platform role that controls access to protected endpoints. */
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student',
  },
  /** URL of the user's profile picture. */
  avatar_url: {
    type: String,
    default: '',
  },
  /** Short biography visible on the user's profile page. */
  bio: {
    type: String,
    default: '',
  },
  learning_preferences: {
    type: learningPreferencesSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/**
 * Compares a plain-text candidate password against the stored hash.
 *
 * @param {string} candidatePassword - The password provided by the user.
 * @returns {Promise<boolean>} True when the passwords match.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
