// Creates the single admin account from environment variables.
// Run with: npm run seed-admin
//
// IMPORTANT: this normalizes the email (trim + lowercase) exactly the same
// way server/routes/auth.js does when looking it up at login time. Without
// that, a stray trailing space/newline in the ADMIN_EMAIL env var (easy to
// introduce by pasting into a host's dashboard) creates a row that the
// login route can never match, since `admins.email` is a UNIQUE column
// compared with exact string equality.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const rawEmail = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!rawEmail || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file first.');
  process.exit(1);
}

const email = rawEmail.trim().toLowerCase();
const hash = bcrypt.hashSync(password, 10);

// This app supports exactly one admin account. Rather than trying to find
// and update a matching row (which is exactly what silently failed before),
// wipe any existing admin rows — including stale/duplicate ones left over
// from un-normalized inserts — and create a single clean one. This
// guarantees the row this script creates is byte-for-byte what the login
// route's WHERE clause will look for.
db.prepare('DELETE FROM admins').run();
db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)').run(email, hash);
console.log(`Admin account ready: ${email}`);
