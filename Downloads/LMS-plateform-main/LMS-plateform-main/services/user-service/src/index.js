/**
 * User Service — Entry Point
 *
 * Microservice responsible for user authentication and profile management.
 * Runs on port 8002 (default) and connects to MongoDB to store user data.
 *
 * Routes mounted:
 *   POST /api/auth/register  — Create a new user account
 *   POST /api/auth/login     — Authenticate and receive a JWT
 *   GET  /api/auth/verify    — Validate a Bearer token
 *   GET  /api/users/me       — Get the authenticated user's profile
 *   PUT  /api/users/me       — Update the authenticated user's profile
 *   GET  /api/users/         — List all users (admin only)
 *   GET  /api/users/:id      — Get any user by ID
 *   GET  /health             — Liveness probe
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 8002;

// Security, logging, and body-parsing middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Route handlers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check — used by Docker / nginx for liveness probes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

// Connect to MongoDB, then start the HTTP server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_users';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`User Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
