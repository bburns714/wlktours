const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email.trim().toLowerCase());
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  req.session.adminId = admin.id;
  req.session.adminEmail = admin.email;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.json({ email: req.session.adminEmail });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

module.exports = router;
