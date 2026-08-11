const path = require('path');

// Store uploaded images next to the SQLite DB file, so both live on the same
// persistent Railway volume (DB_PATH's directory) and survive redeploys.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'wlktours.db');
const UPLOADS_DIR = path.join(path.dirname(DB_PATH), 'uploads');

module.exports = { UPLOADS_DIR };
