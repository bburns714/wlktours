const PROPOSAL_ID = window.location.pathname.split('/').filter(Boolean).pop();
let PROPOSAL = null;

async function load(){
  const root = document.getElementById('view-root');
  try{
    PROPOSAL = await api('GET', '/api/proposals/public/' + PROPOSAL_ID);
    paint();
  }catch(err){
    root.innerHTML = `
      <div class="container narrow">
        <div class="card empty-state">
          <div class="em-icon">🔎</div>
          We couldn't find this proposal. The link may be incorrect or the proposal may have been removed.
        </div>
      </div>`;
  }
}

function paint(){
  const p = PROPOSAL;
  const totals = computeTotals(p.items, p.taxPercent);
  const mapSrc = mapSrcFromEmbed(p.mapEmbed);
  const root = document.getElementById('view-root');

  root.innerHTML = `
    <div class="prop-header">
      <div class="prop-header-inner">
        <div class="brand-mark">WLK<span>TOURS</span></div>
        <div class="prop-meta-row">
          <div class="prop-title">${esc(p.title || 'Walking Tour Proposal')}</div>
          <div class="prop-for">
            Prepared for
            <strong>${esc(p.clientName || p.clientCompany || 'you')}</strong>
            ${p.clientCompany ? esc(p.clientCompany) : ''}
            <br>${fmtDate(p.updatedAt || p.createdAt)}
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      ${p.description ? `<div class="card"><h2 style="margin-bottom:10px;">Overview</h2><p style="color:var(--ink);white-space:pre-wrap;">${esc(p.description)}</p></div>` : ''}

      ${(p.eventDate || p.location || p.groupSize) ? `
        <div class="chips">
          ${p.eventDate ? `<div class="chip"><b>Date</b>${fmtDate(p.eventDate)}</div>` : ''}
          ${p.location ? `<div class="chip"><b>Location</b>${esc(p.location)}</div>` : ''}
          ${p.groupSize ? `<div class="chip"><b>Scope</b>${esc(p.groupSize)}</div>` : ''}
        </div>
      ` : ''}

      ${mapSrc ? `<div class="map-embed"><iframe src="${esc(mapSrc)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>` : ''}

      <div class="card">
        <h2 style="margin-bottom:4px;">Estimate</h2>
        <div class="card-sub">Itemized project cost.</div>
        <div class="items-wrap">
          <div class="items-head" style="grid-template-columns:34px 1fr 70px 110px 110px;">
            <div></div><div>Item</div><div>Qty</div><div>Unit price</div><div>Total</div>
          </div>
          ${p.items.map((it, i) => `
            <div class="item-row" style="grid-template-columns:34px 1fr 70px 110px 110px;">
              <div class="item-num">${i+1}</div>
              <div>${esc(it.desc || '—')}</div>
              <div style="font-family:var(--font-mono);">${esc(it.qty)}</div>
              <div style="font-family:var(--font-mono);">${fmtMoney(Number(it.price)||0)}</div>
              <div class="item-total">${fmtMoney((Number(it.qty)||0)*(Number(it.price)||0))}</div>
            </div>
          `).join('')}
          <div class="totals">
            <div class="totals-row"><div class="tlabel">Subtotal</div><div class="tval">${fmtMoney(totals.subtotal)}</div></div>
            ${Number(p.taxPercent) > 0 ? `<div class="totals-row"><div class="tlabel">Tax (${p.taxPercent}%)</div><div class="tval">${fmtMoney(totals.tax)}</div></div>` : ''}
            <div class="totals-row grand"><div class="tlabel">Total</div><div class="tval">${fmtMoney(totals.total)}</div></div>
          </div>
        </div>
      </div>

      ${p.notes ? `<div class="card"><h2 style="font-size:15px;margin-bottom:8px;">Notes</h2><p style="color:var(--slate);font-size:13.5px;white-space:pre-wrap;">${esc(p.notes)}</p></div>` : ''}

      <div class="accept-box no-print">
        <div id="accept-status-text">
          ${p.status === 'accepted' ? `<span class="accept-status">&check; Proposal accepted</span>` :
            p.status === 'declined' ? `<span style="color:var(--danger);font-weight:700;">Proposal declined</span>` :
            `<span style="color:var(--slate);">Ready to move forward?</span>`}
        </div>
        <div class="btn-row" id="accept-actions">
          <button class="btn btn-ghost" id="btn-print">Download PDF</button>
          ${p.status !== 'accepted' && p.status !== 'declined' ? `
            <button class="btn btn-ghost btn-danger" id="btn-decline">Decline</button>
            <button class="btn btn-primary" id="btn-accept">Accept proposal</button>
          ` : ''}
        </div>
      </div>

      <div class="prop-footer">WLK Tours® · sales@wlktours.com · 855-WLKTOUR (855-955-8687)</div>
    </div>
  `;

  document.getElementById('btn-print').addEventListener('click', () => window.print());
  const acceptBtn = document.getElementById('btn-accept');
  const declineBtn = document.getElementById('btn-decline');
  if(acceptBtn) acceptBtn.addEventListener('click', () => respond('accepted'));
  if(declineBtn) declineBtn.addEventListener('click', () => respond('declined'));
}

async function respond(status){
  try{
    await api('POST', '/api/proposals/public/' + PROPOSAL_ID + '/respond', { status });
    PROPOSAL.status = status;
    showToast(status === 'accepted' ? 'Thanks — proposal accepted!' : 'Response recorded.');
    paint();
  }catch(err){
    showToast(err.message);
  }
}

load();
