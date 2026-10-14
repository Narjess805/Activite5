const result = db.getSiblingDB("lms_users").users.deleteMany({
  email: "admin@example.com",
});

printjson(result);
