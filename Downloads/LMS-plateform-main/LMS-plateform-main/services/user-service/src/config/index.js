/**
 * Application Configuration
 *
 * Reads required environment variables at startup and throws immediately
 * if any mandatory value is absent, preventing the service from running
 * in an insecure state.
 *
 * Environment variables:
 *   JWT_SECRET  — Secret key used to sign and verify JWTs (required).
 */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

module.exports = { JWT_SECRET };
