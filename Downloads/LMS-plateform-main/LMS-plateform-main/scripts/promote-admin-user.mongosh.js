const result = db.getSiblingDB("lms_users").users.updateOne(
  { email: "admin@example.com" },
  {
    $set: {
      role: "admin",
      updatedAt: new Date(),
    },
  }
);

printjson(result);
