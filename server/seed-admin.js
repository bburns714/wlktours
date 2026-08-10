// Creates or updates the single admin account from environment variables.
// Run with: npm run seed-admin
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file first.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
if (existing) {
  db.prepare('UPDATE admins SET password_hash = ? WHERE email = ?').run(hash, email);
  console.log(`Updated password for admin: ${email}`);
} else {
  db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)').run(email, hash);
  console.log(`Created admin: ${email}`);
}
