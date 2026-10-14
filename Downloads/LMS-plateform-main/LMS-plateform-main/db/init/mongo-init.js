/**
 * MongoDB Initialization Script — LMS Platform (User Service)
 *
 * Executed automatically by the mongo Docker container on first startup
 * (file is mounted at /docker-entrypoint-initdb.d/init.js).
 *
 * Actions performed:
 *   1. Switches to (or creates) the "lms_users" database.
 *   2. Creates the "users" collection with JSON Schema validation to
 *      enforce required fields and allowed role values at the database level.
 *   3. Creates a unique index on email for fast lookups and duplicate prevention.
 *   4. Creates an index on role to support admin queries filtered by role.
 *   5. Creates an empty "feedback" collection for future use.
 *
 * Note: Password hashing is handled in the application layer (bcrypt, cost 12);
 * only the hash is stored here.
 */

// MongoDB initialization for LMS Platform - User Service

db = db.getSiblingDB('lms_users');

// Create users collection with schema validation
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['email', 'password', 'name', 'role'],
            properties: {
                email: {
                    bsonType: 'string',
                    description: 'User email address'
                },
                password: {
                    bsonType: 'string',
                    description: 'Hashed password'
                },
                name: {
                    bsonType: 'string',
                    description: 'User full name'
                },
                role: {
                    enum: ['student', 'instructor', 'admin'],
                    description: 'User role'
                },
                avatar_url: {
                    bsonType: 'string'
                },
                bio: {
                    bsonType: 'string'
                },
                created_at: {
                    bsonType: 'date'
                },
                updated_at: {
                    bsonType: 'date'
                }
            }
        }
    }
});

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// Create feedback collection
db.createCollection('feedback');
db.feedback.createIndex({ user_id: 1 });
db.feedback.createIndex({ course_id: 1 });
db.feedback.createIndex({ created_at: -1 });

print('MongoDB initialization complete');
