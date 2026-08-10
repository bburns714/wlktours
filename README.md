# WLK Tours — Proposal Studio

A small, self-contained web app for WLK Tours:

1. A lead-intake form you can embed directly on your wlktours.com landing pages.
2. An internal dashboard (password-protected) listing every lead.
3. A proposal builder — title, description, tour details, a Google Maps embed, and a
   line-item estimate table with auto-calculated totals.
4. A branded, shareable client-facing proposal page with **Accept / Decline** buttons
   and a **Download PDF** button.

It's a real Node.js app with its own database — nothing depends on Claude or any
third-party service, so it will keep working exactly the same after you deploy it.

---

## 1. Run it locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
cp .env.example .env
```

Open `.env` and set:

- `SESSION_SECRET` — any long random string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your login for the dashboard

Then create your admin account and start the server:

```bash
npm run seed-admin
npm start
```

Visit `http://localhost:3000/admin` and sign in.

- **Lead form:** `http://localhost:3000/request` (full page) or `http://localhost:3000/embed/intake` (bare form, meant for an iframe)
- **Dashboard:** `http://localhost:3000/admin`
- **Client proposal link:** shown in the editor once you create a proposal, e.g. `http://localhost:3000/p/abc123`

Data is stored in a SQLite file at `data/wlktours.db` — it persists between restarts automatically. No separate database server needed.

---

## 2. Embedding the form on wlktours.com

Once this app is deployed (see below) at, for example, `https://proposals.wlktours.com`,
drop this on any landing page:

```html
<iframe
  src="https://proposals.wlktours.com/embed/intake"
  style="width:100%; border:0; min-height:640px;"
  title="Request a Proposal">
</iframe>
```

The embed page has no navigation bar — it's just the form, styled to match the main
site, ready to sit inside a page section. Submissions show up in your dashboard immediately.

---

## 3. Deploying it for real

This is a standard Node/Express app, so it runs on almost any host. Two easy options:

### Option A — Railway / Render (simplest)
1. Push this folder to a GitHub repo.
2. Create a new Web Service on [Railway](https://railway.app) or [Render](https://render.com), point it at the repo.
3. Set the environment variables from `.env.example` in the host's dashboard (use a strong `SESSION_SECRET`, and `NODE_ENV=production`).
4. Set the start command to `npm start` (and a one-time build/init step to run `npm run seed-admin` — most hosts let you run this from a shell).
5. Point a subdomain like `proposals.wlktours.com` at the service (your host will give you a CNAME target).

### Option B — Your own server / VPS
1. Copy this folder to the server, run `npm install --production`.
2. Set up `.env` as above (`NODE_ENV=production`).
3. Run `npm run seed-admin` once.
4. Run the app with a process manager so it restarts automatically, e.g.:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name wlktours-proposals
   pm2 save
   ```
5. Put Nginx (or your existing web server) in front of it as a reverse proxy on
   `proposals.wlktours.com`, forwarding to `http://127.0.0.1:3000`, with a free
   SSL cert (Let's Encrypt / Certbot).

Either way, back up the `data/` folder regularly (or point `DB_PATH` at a persistent volume) — it's the only thing holding your leads and proposals.

---

## 4. How it's organized

```
server/
  index.js          Express app + all routes
  db.js             SQLite schema (leads, proposals tables)
  auth-middleware.js Session-based auth guard for /admin and protected APIs
  seed-admin.js      One-time script to create/update your login
  routes/
    auth.js          Login / logout
    leads.js         Lead intake (public) + list/manage (protected)
    proposals.js      Proposal CRUD (protected) + public view/respond
public/
  css/styles.css     Shared brand styling (navy/teal, Fraunces + Inter)
  js/                Page logic (dashboard, editor, proposal view, shared helpers)
  embed-intake.html  Bare intake form for iframe embedding
  request.html       Full-page version of the intake form
  login.html         Admin sign-in
  dashboard.html     Leads + proposals list
  editor.html        Proposal builder
  proposal-view.html Client-facing proposal (shareable link, printable)
```

## 5. Notes on security

- There's a single admin account (yours). Sessions are cookie-based and expire after 2 weeks.
- Proposal links (`/p/<id>`) use an unguessable random ID as the access token — anyone
  with the link can view and accept/decline that one proposal, but can't browse others
  or reach the dashboard.
- Before going live, make sure `NODE_ENV=production` is set (this makes session cookies
  HTTPS-only) and that the site is served over HTTPS.
