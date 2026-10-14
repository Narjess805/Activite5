const user = db.getSiblingDB("lms_users").users.findOne(
  { email: "admin@example.com" },
  { email: 1, name: 1, role: 1, password: 1, createdAt: 1, updatedAt: 1 }
);

printjson(user);
