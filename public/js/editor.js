const PROPOSAL_ID = window.location.pathname.split('/').filter(Boolean).pop();
let PROPOSAL = null;

async function load(){
  try{
    PROPOSAL = await api('GET', '/api/proposals/' + PROPOSAL_ID);
    paint();
  }catch(err){
    document.getElementById('editor-root').innerHTML = `<div class="card empty-state">Couldn't load proposal: ${esc(err.message)}</div>`;
  }
}

function paint(){
  const p = PROPOSAL;
  const totals = computeTotals(p.items, p.taxPercent);
  const root = document.getElementById('editor-root');

  root.innerHTML = `
    <div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;">
      <div>
        <div class="eyebrow">Proposal Editor</div>
        <h1 id="head-title">${esc(p.title || 'Untitled proposal')}</h1>
      </div>
      <div class="btn-row">
        <a href="/admin" class="btn btn-ghost btn-sm">← Dashboard</a>
      </div>
    </div>

    <div class="card">
      <h2>Client</h2>
      <div class="card-sub">Who this proposal is for.</div>
      <div class="grid2">
        <div class="field"><label>Client name</label><input type="text" id="f-clientName" value="${esc(p.clientName)}"></div>
        <div class="field"><label>Organization</label><input type="text" id="f-clientCompany" value="${esc(p.clientCompany)}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Email</label><input type="email" id="f-clientEmail" value="${esc(p.clientEmail)}"></div>
        <div class="field"><label>Phone</label><input type="tel" id="f-clientPhone" value="${esc(p.clientPhone)}"></div>
      </div>
    </div>

    <div class="card">
      <h2>Overview</h2>
      <div class="card-sub">Title and description shown at the top of the proposal.</div>
      <div class="field"><label>Proposal title</label><input type="text" id="f-title" value="${esc(p.title)}"></div>
      <div class="field"><label>Description</label><textarea id="f-description" placeholder="Describe the scope of the walking tour project…">${esc(p.description)}</textarea></div>
      <div class="grid3">
        <div class="field"><label>Tour / event date</label><input type="date" id="f-eventDate" value="${esc(p.eventDate)}"></div>
        <div class="field"><label>Destination / location</label><input type="text" id="f-location" value="${esc(p.location)}" placeholder="Downtown Salem, MA"></div>
        <div class="field"><label>Group size / scope</label><input type="text" id="f-groupSize" value="${esc(p.groupSize)}" placeholder="8 stops · citywide"></div>
      </div>
    </div>

    <div class="card">
      <h2>Map</h2>
      <div class="card-sub">Paste a Google Maps embed code (or the iframe's link) to show a route or location.</div>
      <div class="field">
        <textarea id="f-mapEmbed" placeholder='&lt;iframe src="https://www.google.com/maps/embed?..."&gt;&lt;/iframe&gt;'>${esc(p.mapEmbed)}</textarea>
        <div class="hint">In Google Maps: Share → Embed a map → Copy HTML, then paste the whole thing here.</div>
      </div>
    </div>

    <div class="card">
      <h2>Estimate</h2>
      <div class="card-sub">Line items for this proposal.</div>
      <div class="items-wrap">
        <div class="items-head"><div></div><div>Item</div><div>Qty</div><div>Unit price</div><div>Total</div><div></div></div>
        <div id="items-body"></div>
        <div class="items-add"><button class="btn btn-ghost btn-sm" id="add-item">+ Add line item</button></div>
        <div class="totals">
          <div class="totals-row"><div class="tlabel">Subtotal</div><div class="tval" id="t-subtotal">${fmtMoney(totals.subtotal)}</div></div>
          <div class="totals-row">
            <div class="tlabel">Tax %</div>
            <div class="tval"><input type="number" id="f-taxPercent" value="${p.taxPercent || 0}" min="0" step="0.1" style="text-align:right;padding:4px 8px;"></div>
          </div>
          <div class="totals-row"><div class="tlabel">Tax</div><div class="tval" id="t-tax">${fmtMoney(totals.tax)}</div></div>
          <div class="totals-row grand"><div class="tlabel">Total</div><div class="tval" id="t-total">${fmtMoney(totals.total)}</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Notes &amp; terms</h2>
      <div class="field"><textarea id="f-notes">${esc(p.notes)}</textarea></div>
      <div class="grid2">
        <div class="field">
          <label>Status</label>
          <select id="f-status" class="status-select" style="width:100%;">
            <option value="draft" ${p.status==='draft'?'selected':''}>Draft</option>
            <option value="sent" ${p.status==='sent'?'selected':''}>Sent</option>
            <option value="accepted" ${p.status==='accepted'?'selected':''}>Accepted</option>
            <option value="declined" ${p.status==='declined'?'selected':''}>Declined</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Share</h2>
      <div class="card-sub">This link opens the client-facing proposal page — no login required.</div>
      <div class="link-copy-box">${window.location.origin}/p/${p.id}</div>
      <div class="btn-row" style="margin-top:12px;">
        <button class="btn btn-ghost btn-sm" id="copy-link">Copy link</button>
        <a href="/p/${p.id}" target="_blank" class="btn btn-ghost btn-sm">Open client view</a>
      </div>
    </div>

    <div class="btn-row" style="position:sticky;bottom:20px;background:var(--paper);padding:14px 0;">
      <button class="btn btn-primary" id="save-proposal">Save proposal</button>
      <span id="save-status" style="font-size:12.5px;color:var(--slate);"></span>
    </div>
  `;

  renderItemsBody();
  bind();
}

function renderItemsBody(){
  const p = PROPOSAL;
  const wrap = document.getElementById('items-body');
  wrap.innerHTML = p.items.map((it, i) => `
    <div class="item-row" data-idx="${i}">
      <div class="item-num">${i+1}</div>
      <input type="text" class="it-desc" value="${esc(it.desc)}" placeholder="Item description">
      <input type="number" class="it-qty" value="${it.qty}" min="0" step="1">
      <input type="number" class="it-price" value="${it.price}" min="0" step="0.01">
      <div class="item-total">${fmtMoney((Number(it.qty)||0) * (Number(it.price)||0))}</div>
      <button class="row-del" title="Remove row">✕</button>
    </div>
  `).join('');

  wrap.querySelectorAll('.item-row').forEach(row => {
    const idx = Number(row.dataset.idx);
    row.querySelector('.it-desc').addEventListener('input', e => { p.items[idx].desc = e.target.value; });
    row.querySelector('.it-qty').addEventListener('input', e => { p.items[idx].qty = e.target.value; updateTotalsDisplay(); });
    row.querySelector('.it-price').addEventListener('input', e => { p.items[idx].price = e.target.value; updateTotalsDisplay(); });
    row.querySelector('.row-del').addEventListener('click', () => {
      p.items.splice(idx, 1);
      if(p.items.length === 0) p.items.push({desc:'', qty:1, price:0});
      renderItemsBody();
      updateTotalsDisplay();
    });
  });
}

function updateTotalsDisplay(){
  const p = PROPOSAL;
  const taxInput = document.getElementById('f-taxPercent');
  if(taxInput) p.taxPercent = taxInput.value;
  const totals = computeTotals(p.items, p.taxPercent);
  document.getElementById('t-subtotal').textContent = fmtMoney(totals.subtotal);
  document.getElementById('t-tax').textContent = fmtMoney(totals.tax);
  document.getElementById('t-total').textContent = fmtMoney(totals.total);
  document.querySelectorAll('.item-row').forEach((row, i) => {
    const it = p.items[i];
    row.querySelector('.item-total').textContent = fmtMoney((Number(it.qty)||0) * (Number(it.price)||0));
  });
}

function bind(){
  const p = PROPOSAL;
  const bindField = (elId, prop) => {
    const el = document.getElementById(elId);
    el.addEventListener('input', () => { p[prop] = el.value; });
  };
  bindField('f-clientName','clientName'); bindField('f-clientCompany','clientCompany');
  bindField('f-clientEmail','clientEmail'); bindField('f-clientPhone','clientPhone');
  bindField('f-title','title'); bindField('f-description','description');
  bindField('f-eventDate','eventDate'); bindField('f-location','location'); bindField('f-groupSize','groupSize');
  bindField('f-mapEmbed','mapEmbed'); bindField('f-notes','notes');

  document.getElementById('f-title').addEventListener('input', e => {
    document.getElementById('head-title').textContent = e.target.value || 'Untitled proposal';
  });
  document.getElementById('f-taxPercent').addEventListener('input', updateTotalsDisplay);
  document.getElementById('f-status').addEventListener('change', e => { p.status = e.target.value; });

  document.getElementById('add-item').addEventListener('click', () => {
    p.items.push({ desc:'', qty:1, price:0 });
    renderItemsBody();
    updateTotalsDisplay();
  });

  document.getElementById('copy-link').addEventListener('click', () => {
    const url = `${window.location.origin}/p/${p.id}`;
    navigator.clipboard.writeText(url).then(() => showToast('Link copied')).catch(() => showToast(url));
  });

  document.getElementById('save-proposal').addEventListener('click', async () => {
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = 'Saving…';
    try{
      const updated = await api('PUT', '/api/proposals/' + p.id, p);
      PROPOSAL = updated;
      statusEl.textContent = 'Saved just now';
      showToast('Proposal saved');
    }catch(err){
      statusEl.textContent = 'Save failed — ' + err.message;
    }
  });
}

load();
