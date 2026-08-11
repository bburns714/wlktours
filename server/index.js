require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const { requireAuth } = require('./auth-middleware');
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const proposalRoutes = require('./routes/proposals');
const imageRoutes = require('./routes/images');
const { UPLOADS_DIR } = require('./uploads-dir');

const app = express();
const PORT = process.env.PORT || 3000;

// Railway (like Heroku/Render) terminates HTTPS at its edge and forwards
// requests to this app over plain HTTP, adding an X-Forwarded-Proto header.
// Without this, Express sees every request as insecure, and express-session
// silently refuses to ever set our secure:true session cookie in production
// — login succeeds but no Set-Cookie header is ever sent.
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 14, // 2 weeks
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

// ---------- API ----------
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/images', imageRoutes);

// ---------- Uploaded images (header images etc.) ----------
// Public (no auth) — proposal pages that embed these are themselves public.
app.use('/uploads', express.static(UPLOADS_DIR));

// ---------- Static assets (css/js shared across pages) ----------
app.use('/assets', express.static(path.join(__dirname, '..', 'public')));

// ---------- Pages ----------
const pages = path.join(__dirname, '..', 'public');

// Public intake form — designed to be embedded in an <iframe> on wlktours.com landing pages.
app.get('/embed/intake', (req, res) => res.sendFile(path.join(pages, 'embed-intake.html')));

// Standalone full-page version of the intake form (not embedded).
app.get('/request', (req, res) => res.sendFile(path.join(pages, 'request.html')));

// Admin login
app.get('/admin/login', (req, res) => res.sendFile(path.join(pages, 'login.html')));

// Admin dashboard + proposal editor (protected — server checks session, then serves the page;
// the page's own JS also calls protected APIs which double-check auth).
app.get('/admin', requireAuth, (req, res) => res.sendFile(path.join(pages, 'dashboard.html')));
app.get('/admin/proposals/:id', requireAuth, (req, res) => res.sendFile(path.join(pages, 'editor.html')));

// Public client-facing proposal view — link is the unguessable proposal id.
app.get('/p/:id', (req, res) => res.sendFile(path.join(pages, 'proposal-view.html')));

app.get('/', (req, res) => res.redirect('/admin'));

app.listen(PORT, () => {
  console.log(`WLK Tours Proposal Studio running at http://localhost:${PORT}`);
});
