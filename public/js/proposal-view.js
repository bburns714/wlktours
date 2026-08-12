const PROPOSAL_ID = window.location.pathname.split('/').filter(Boolean).pop();
let PROPOSAL = null;

async function load(){
  const root = document.getElementById('view-root');
  try{
    PROPOSAL = await api('GET', '/api/proposals/public/' + PROPOSAL_ID);
    paint();
  }catch(err){
    root.innerHTML = `
      <div class="prop-notfound">
        <div class="brand-mark">WLK<span>TOURS</span></div>
        <p>We couldn't find this proposal. The link may be incorrect or the proposal may have been removed.</p>
      </div>`;
  }
}

function renderBlock(block){
  const d = block.data || {};
  switch(block.type){
    case 'map_embed': {
      const src = mapSrcFromEmbed(d.embedCode);
      if(!src) return '';
      return `
        <section class="prop-section">
          <div class="section-head">
            <div class="eyebrow">The Route</div>
            <h2>Mapped for Your Group</h2>
          </div>
          <div class="map-embed"><iframe src="${esc(src)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
        </section>
      `;
    }
    case 'text': {
      if(!d.heading && !d.body) return '';
      const alignStyle = d.align === 'center' ? 'text-align:center;' : '';
      const sizeClass = d.size === 'large' ? ' block-text-large' : '';
      return `
        <div class="card block-text${sizeClass}" style="${alignStyle}">
          ${d.heading ? `<h2 style="margin-bottom:10px;">${esc(d.heading)}</h2>` : ''}
          ${d.body ? `<p style="white-space:pre-wrap;color:var(--ink);">${esc(d.body)}</p>` : ''}
        </div>
      `;
    }
    case 'list': {
      const items = (d.items || []).filter(Boolean);
      if(!items.length) return '';
      const tag = d.style === 'number' ? 'ol' : 'ul';
      const cls = d.style === 'check' ? 'prop-list prop-list-check' : 'prop-list';
      return `
        <div class="card">
          <${tag} class="${cls}">
            ${items.map(it => `<li>${esc(it)}</li>`).join('')}
          </${tag}>
        </div>
      `;
    }
    case 'cards': {
      const cards = (d.cards || []).filter(c => c.title || c.body);
      if(!cards.length) return '';
      return `
        <div class="prop-cards-grid">
          ${cards.map(c => `
            <div class="prop-card">
              ${c.title ? `<h3>${esc(c.title)}</h3>` : ''}
              ${c.body ? `<p>${esc(c.body)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }
    case 'gallery': {
      const urls = d.urls || [];
      if(!urls.length) return '';
      return `<div class="prop-gallery">${urls.map(u => `<img src="${esc(u)}" alt="">`).join('')}</div>`;
    }
    case 'quote': {
      if(!d.text) return '';
      return `
        <div class="prop-quote">
          <p>&ldquo;${esc(d.text)}&rdquo;</p>
          ${d.attribution ? `<div class="prop-quote-attr">${esc(d.attribution)}</div>` : ''}
        </div>
      `;
    }
    case 'divider':
      return `<div class="prop-divider"></div>`;
    default:
      return '';
  }
}

function paint(){
  const p = PROPOSAL;
  const totals = computeTotals(p.items, p.taxPercent);
  const mapSrc = mapSrcFromEmbed(p.mapEmbed);
  const root = document.getElementById('view-root');

  // Blocks are the source of truth once a proposal has been saved in the
  // current editor. For older proposals that haven't been reopened yet,
  // fall back to the legacy single map field so nothing disappears.
  const blocks = (p.contentBlocks && p.contentBlocks.length)
    ? p.contentBlocks
    : (mapSrc ? [{ type: 'map_embed', data: { embedCode: p.mapEmbed } }] : []);

  // Pull the map block out to render in its own full-width "Route" section
  // (matching the reference layout); everything else renders inline in order.
  const mapBlock = blocks.find(b => b.type === 'map_embed' && mapSrcFromEmbed((b.data||{}).embedCode));
  const otherBlocksHtml = blocks.filter(b => b !== mapBlock).map(renderBlock).join('');
  const mapBlockHtml = mapBlock ? renderBlock(mapBlock) : '';

  const isDecided = p.status === 'accepted' || p.status === 'declined';
  const heroBg = p.headerImage ? `background-image:linear-gradient(180deg, rgba(15,39,51,0.55), rgba(15,39,51,0.92)), url('${esc(p.headerImage)}');` : '';

  root.innerHTML = `
    <header class="prop-hero" style="${heroBg}">
      <div class="prop-hero-inner">
        <div class="brand-mark">WLK<span>TOURS</span></div>
        <div class="prop-hero-eyebrow">A Proposal for ${esc(p.clientCompany || p.clientName || 'You')}</div>
        <h1 class="prop-hero-title">${esc(p.title || 'Walking Tour Proposal')}</h1>
        ${p.description ? `<p class="prop-hero-sub">${esc(truncate(p.description, 180))}</p>` : ''}
        <a href="#accept" class="btn btn-hero">Review &amp; Accept</a>
      </div>
    </header>

    <div class="container narrow">

      <div class="prop-prepared-card">
        <div class="prop-prepared-label">Proposal Prepared For</div>
        <div class="prop-prepared-name">${esc(p.clientName || '—')}</div>
        ${p.clientCompany ? `<div class="prop-prepared-org">${esc(p.clientCompany)}${p.location ? ' · ' + esc(p.location) : ''}</div>` : ''}
        <div class="prop-prepared-grid">
          ${p.clientEmail ? `<div><b>Email</b>${esc(p.clientEmail)}</div>` : ''}
          ${p.clientPhone ? `<div><b>Phone</b>${esc(p.clientPhone)}</div>` : ''}
          ${p.eventDate ? `<div><b>Date</b>${fmtDate(p.eventDate)}</div>` : ''}
          ${p.groupSize ? `<div><b>Scope</b>${esc(p.groupSize)}</div>` : ''}
        </div>
      </div>

      ${p.description ? `
        <section class="prop-section">
          <div class="section-head">
            <div class="eyebrow">The Experience</div>
            <h2>Overview</h2>
          </div>
          <p class="prop-overview-text">${esc(p.description)}</p>
        </section>
      ` : ''}

      ${otherBlocksHtml}
      ${mapBlockHtml}

      <section class="prop-section" id="pricing">
        <div class="section-head">
          <div class="eyebrow">Pricing</div>
          <h2>Investment Summary</h2>
        </div>
        <div class="pricing-table">
          <div class="pricing-head">
            <div>#</div><div>Item</div><div>Qty</div><div>Unit Price</div><div>Amount</div>
          </div>
          ${p.items.map((it, i) => `
            <div class="pricing-row">
              <div class="pricing-num">${i+1}</div>
              <div class="pricing-desc">${esc(it.desc || '—')}</div>
              <div class="pricing-qty">${esc(it.qty)}</div>
              <div class="pricing-unit">${fmtMoney(Number(it.price)||0)}</div>
              <div class="pricing-amt">${fmtMoney((Number(it.qty)||0)*(Number(it.price)||0))}</div>
            </div>
          `).join('')}
          <div class="pricing-totals">
            <div class="pricing-totals-row"><span>Subtotal</span><span>${fmtMoney(totals.subtotal)}</span></div>
            ${Number(p.taxPercent) > 0 ? `<div class="pricing-totals-row"><span>Tax (${p.taxPercent}%)</span><span>${fmtMoney(totals.tax)}</span></div>` : ''}
            <div class="pricing-totals-row grand"><span>Total</span><span>${fmtMoney(totals.total)}</span></div>
          </div>
        </div>
        ${p.notes ? `<p class="prop-notes">${esc(p.notes)}</p>` : ''}
      </section>

      <section class="prop-section prop-accept-section no-print" id="accept">
        <div class="section-head">
          <div class="eyebrow">Final Step</div>
          <h2>${isDecided ? (p.status === 'accepted' ? 'Proposal Accepted' : 'Proposal Declined') : 'Accept the Proposal'}</h2>
        </div>

        ${isDecided ? `
          <div class="accept-decided ${p.status}">
            ${p.status === 'accepted'
              ? `&check; Accepted${p.acceptedByName ? ' by ' + esc(p.acceptedByName) : ''}${p.acceptedByEmail ? ' (' + esc(p.acceptedByEmail) + ')' : ''}`
              : 'This proposal was declined.'}
          </div>
        ` : `
          <p class="accept-intro">Enter your name and email, then click Accept to confirm this proposal${p.clientCompany ? ' for ' + esc(p.clientCompany) : ''}. Our team will follow up within one business day.</p>
          <div class="accept-form">
            <div class="grid2">
              <div class="field"><label>Your name</label><input type="text" id="accept-name" placeholder="Jane Doe"></div>
              <div class="field"><label>Your email</label><input type="email" id="accept-email" placeholder="jane@example.com"></div>
            </div>
            <div id="accept-error" class="error-note" style="display:none;"></div>
            <div class="btn-row" style="margin-top:6px;">
              <button class="btn btn-primary" id="btn-accept">Accept Proposal</button>
              <button class="btn btn-ghost btn-danger" id="btn-decline">Decline</button>
              <button class="btn btn-ghost" id="btn-print">Download PDF</button>
            </div>
          </div>
        `}

        <div class="prop-contact-row">
          <div><b>Questions?</b> sales@wlktours.com</div>
          <div><b>Telephone</b> 855-WLKTOUR (855-955-8687)</div>
        </div>
      </section>
    </div>

    <footer class="prop-footer">
      <div class="brand-mark">WLK<span>TOURS</span></div>
      <div>© ${new Date().getFullYear()} WLK Tours. All rights reserved.</div>
    </footer>
  `;

  const printBtn = document.getElementById('btn-print');
  if(printBtn) printBtn.addEventListener('click', () => window.print());

  const acceptBtn = document.getElementById('btn-accept');
  const declineBtn = document.getElementById('btn-decline');
  if(acceptBtn) acceptBtn.addEventListener('click', () => respond('accepted'));
  if(declineBtn) declineBtn.addEventListener('click', () => respond('declined'));
}

function truncate(str, len){
  if(!str) return '';
  return str.length > len ? str.slice(0, len).trim() + '…' : str;
}

async function respond(status){
  const errEl = document.getElementById('accept-error');
  let payload = { status };
  if(status === 'accepted'){
    const name = document.getElementById('accept-name').value.trim();
    const email = document.getElementById('accept-email').value.trim();
    if(!name || !email){
      errEl.textContent = 'Please enter your name and email to accept.';
      errEl.style.display = 'block';
      return;
    }
    payload.name = name;
    payload.email = email;
  }
  try{
    await api('POST', '/api/proposals/public/' + PROPOSAL_ID + '/respond', payload);
    const updated = await api('GET', '/api/proposals/public/' + PROPOSAL_ID);
    PROPOSAL = updated;
    showToast(status === 'accepted' ? 'Thanks — proposal accepted!' : 'Response recorded.');
    paint();
    document.getElementById('accept').scrollIntoView({ behavior: 'smooth' });
  }catch(err){
    if(errEl){ errEl.textContent = err.message; errEl.style.display = 'block'; }
    else showToast(err.message);
  }
}

load();
