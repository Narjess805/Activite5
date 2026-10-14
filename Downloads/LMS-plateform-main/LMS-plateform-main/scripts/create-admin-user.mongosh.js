const email = "admin@example.com";
const name = "Admin User";
const role = "admin";
const passwordHash = "$2a$12$0kpdPk4.4SCcjQ7lE5s.beR2Z4jJP8IT6yIuQWfcoZ5EkUD7dG0.G";

const result = db.getSiblingDB("lms_users").users.updateOne(
  { email },
  {
    $set: {
      name,
      role,
      password: passwordHash,
      updatedAt: new Date(),
    },
    $setOnInsert: {
      email,
      createdAt: new Date(),
      __v: 0,
    },
  },
  { upsert: true }
);

printjson({
  email,
  role,
  matchedCount: result.matchedCount,
  modifiedCount: result.modifiedCount,
  upsertedId: result.upsertedId,
});
