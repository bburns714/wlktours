const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { requireAuth } = require('../auth-middleware');

const router = express.Router();

// Public: create a lead from the landing page intake form.
router.post('/', (req, res) => {
  const { name, email, phone, company, orgType, targetDate, message, source } = req.body;

  if (!name || !name.trim() || !email || !email.trim()) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const id = nanoid(10);
  db.prepare(`
    INSERT INTO leads (id, name, email, phone, company, org_type, target_date, message, status, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
  `).run(
    id,
    name.trim(),
    email.trim(),
    (phone || '').trim(),
    (company || '').trim(),
    orgType || '',
    targetDate || '',
    (message || '').trim(),
    source || 'website'
  );

  res.json({ ok: true, id });
});

// Protected: list leads (dashboard).
router.get('/', requireAuth, (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.json(leads);
});

// Protected: update lead status (e.g. archive).
router.patch('/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
