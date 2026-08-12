const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'wlktours.db');

// Make sure the data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    org_type TEXT,
    target_date TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    source TEXT DEFAULT 'website',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Walking Tour Proposal',
    description TEXT,
    client_name TEXT,
    client_company TEXT,
    client_email TEXT,
    client_phone TEXT,
    event_date TEXT,
    location TEXT,
    group_size TEXT,
    map_embed TEXT,
    items_json TEXT NOT NULL DEFAULT '[]',
    tax_percent REAL NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT,
    size INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: add header_image to proposals if this DB predates the column.
const proposalCols = db.prepare("PRAGMA table_info(proposals)").all().map(c => c.name);
if (!proposalCols.includes('header_image')) {
  db.exec('ALTER TABLE proposals ADD COLUMN header_image TEXT');
}
// Migration: add content_blocks — an ordered JSON array of flexible content
// blocks (map embed, text, list, cards, gallery, quote, divider) shown
// between Overview and the Estimate on the client-facing proposal.
if (!proposalCols.includes('content_blocks')) {
  db.exec("ALTER TABLE proposals ADD COLUMN content_blocks TEXT NOT NULL DEFAULT '[]'");
}
// Migration: capture who actually clicked Accept, for the client-facing
// accept form (name + email fields), separate from the original clientName/
// clientEmail on the proposal (which may have been filled in by staff).
if (!proposalCols.includes('accepted_by_name')) {
  db.exec('ALTER TABLE proposals ADD COLUMN accepted_by_name TEXT');
}
if (!proposalCols.includes('accepted_by_email')) {
  db.exec('ALTER TABLE proposals ADD COLUMN accepted_by_email TEXT');
}

module.exports = db;
