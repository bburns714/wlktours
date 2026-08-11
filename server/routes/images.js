const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { nanoid } = require('nanoid');
const db = require('../db');
const { requireAuth } = require('../auth-middleware');
const { UPLOADS_DIR } = require('../uploads-dir');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname) || '';
    cb(null, `${nanoid(16)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed.'));
    }
    cb(null, true);
  }
});

const router = express.Router();

// Upload a new image into the shared library. Field name: "image".
router.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const id = nanoid(12);
    db.prepare(`
      INSERT INTO images (id, filename, original_name, mime_type, size)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);

    res.json({
      id,
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname
    });
  });
});

// List the shared image library, newest first, for the "choose existing" picker.
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM images ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({
    id: r.id,
    url: `/uploads/${r.filename}`,
    originalName: r.original_name,
    createdAt: r.created_at
  })));
});

// Remove an image from the library (proposals that already reference its URL
// keep the reference — this only affects the picker and frees disk space).
router.delete('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Image not found.' });
  db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id);
  fs.unlink(path.join(UPLOADS_DIR, row.filename), () => {});
  res.json({ ok: true });
});

module.exports = router;
