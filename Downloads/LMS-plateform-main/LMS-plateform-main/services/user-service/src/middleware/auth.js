/**
 * Authentication & Authorization Middleware
 *
 * authenticate — Verifies the Bearer JWT in the Authorization header.
 *   Attaches the decoded payload ({ id, email, role }) to req.user.
 *   Returns 401 when the token is missing, malformed, or expired.
 *
 * authorize(...roles) — Role-based access control guard.
 *   Must be used AFTER authenticate. Returns 403 when req.user.role
 *   is not included in the allowed roles list.
 *
 * Usage:
 *   router.get('/admin', authenticate, authorize('admin'), handler);
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

/**
 * Express middleware that validates a JWT Bearer token.
 * On success it populates req.user with the token payload.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * Returns an Express middleware that restricts access to users whose
 * role matches one of the provided allowed roles.
 *
 * @param {...string} roles - Allowed role names (e.g. 'admin', 'instructor').
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
