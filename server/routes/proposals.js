const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { requireAuth } = require('../auth-middleware');

const router = express.Router();

function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    leadId: row.lead_id,
    title: row.title,
    description: row.description,
    clientName: row.client_name,
    clientCompany: row.client_company,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    eventDate: row.event_date,
    location: row.location,
    groupSize: row.group_size,
    mapEmbed: row.map_embed,
    headerImage: row.header_image,
    contentBlocks: JSON.parse(row.content_blocks || '[]'),
    items: JSON.parse(row.items_json || '[]'),
    taxPercent: row.tax_percent,
    notes: row.notes,
    status: row.status,
    acceptedByName: row.accepted_by_name,
    acceptedByEmail: row.accepted_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function computeTotal(items, taxPercent) {
  const subtotal = (items || []).reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
    0
  );
  return subtotal + subtotal * ((Number(taxPercent) || 0) / 100);
}

// ---------- Protected: admin management ----------

// List proposals with a small client summary, newest first.
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM proposals ORDER BY updated_at DESC').all();
  const out = rows.map(r => {
    const p = serialize(r);
    return {
      id: p.id,
      title: p.title,
      client: p.clientName || p.clientCompany || '',
      total: computeTotal(p.items, p.taxPercent),
      status: p.status,
      updatedAt: p.updatedAt,
      leadId: p.leadId
    };
  });
  res.json(out);
});

// Create a new proposal, optionally pre-filled from a lead.
router.post('/', requireAuth, (req, res) => {
  const { leadId } = req.body;
  let lead = null;
  if (leadId) {
    lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  }

  const id = nanoid(12);
  const defaultItems = JSON.stringify([
    { desc: 'Custom-curated walking tour build (up to 8 stops)', qty: 1, price: 0 }
  ]);

  db.prepare(`
    INSERT INTO proposals (
      id, lead_id, title, description, client_name, client_company, client_email, client_phone,
      event_date, location, group_size, map_embed, items_json, tax_percent, notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
  `).run(
    id,
    lead ? lead.id : null,
    'Walking Tour Proposal',
    lead ? lead.message || '' : '',
    lead ? lead.name : '',
    lead ? lead.company : '',
    lead ? lead.email : '',
    lead ? lead.phone : '',
    lead ? lead.target_date || '' : '',
    '',
    '',
    '',
    defaultItems,
    0,
    'This estimate is valid for 30 days. A signed agreement and 50% deposit confirm your project timeline.'
  );

  const row = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  res.json(serialize(row));
});

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Proposal not found.' });
  res.json(serialize(row));
});

router.put('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id FROM proposals WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Proposal not found.' });

  const b = req.body;
  db.prepare(`
    UPDATE proposals SET
      title = ?, description = ?, client_name = ?, client_company = ?, client_email = ?, client_phone = ?,
      event_date = ?, location = ?, group_size = ?, map_embed = ?, header_image = ?, content_blocks = ?, items_json = ?, tax_percent = ?,
      notes = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    b.title || 'Untitled proposal',
    b.description || '',
    b.clientName || '',
    b.clientCompany || '',
    b.clientEmail || '',
    b.clientPhone || '',
    b.eventDate || '',
    b.location || '',
    b.groupSize || '',
    b.mapEmbed || '',
    b.headerImage || '',
    JSON.stringify(b.contentBlocks || []),
    JSON.stringify(b.items || []),
    Number(b.taxPercent) || 0,
    b.notes || '',
    b.status || 'draft',
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  res.json(serialize(updated));
});

router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM proposals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Public: client-facing view + response ----------
// Not behind requireAuth — the unguessable nanoid(12) id is the access token.

router.get('/public/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Proposal not found.' });
  res.json(serialize(row));
});

router.post('/public/:id/respond', (req, res) => {
  const { status, name, email } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  if (status === 'accepted' && (!name || !name.trim() || !email || !email.trim())) {
    return res.status(400).json({ error: 'Please enter your name and email to accept.' });
  }
  const row = db.prepare('SELECT id FROM proposals WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Proposal not found.' });
  db.prepare(`
    UPDATE proposals SET status = ?, accepted_by_name = ?, accepted_by_email = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, status === 'accepted' ? name.trim() : null, status === 'accepted' ? email.trim() : null, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
