const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { username } = req.body;

  if (!username || username.trim() === "") {
    return res.status(400).json({ success: false, message: "نام کاربری الزامی است" });
  }

  // می‌تونی اینجا چک کنی که مثلاً فقط "admin" اجازه ورود داشته باشه
  return res.status(200).json({ success: true, username });
});

module.exports = router;
