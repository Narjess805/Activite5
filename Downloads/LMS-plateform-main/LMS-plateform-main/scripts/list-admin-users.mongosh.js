const users = db
  .getSiblingDB("lms_users")
  .users.find(
    { email: "admin@example.com" },
    { email: 1, name: 1, role: 1, password: 1, createdAt: 1, updatedAt: 1 }
  )
  .toArray();

printjson(users);
