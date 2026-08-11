const PROPOSAL_ID = window.location.pathname.split('/').filter(Boolean).pop();
let PROPOSAL = null;

const BLOCK_TYPES = [
  { type: 'map_embed', label: 'Map Embed', icon: '🗺️' },
  { type: 'text', label: 'Text Block', icon: '📝' },
  { type: 'list', label: 'List', icon: '📋' },
  { type: 'cards', label: 'Cards', icon: '🗂️' },
  { type: 'gallery', label: 'Photo Gallery', icon: '🖼️' },
  { type: 'quote', label: 'Quote', icon: '❝' },
  { type: 'divider', label: 'Divider', icon: '—' }
];

function blockId(){
  return 'b' + Math.random().toString(36).slice(2, 10);
}

function defaultBlockData(type){
  switch(type){
    case 'map_embed': return { embedCode: '' };
    case 'text': return { heading: '', body: '', align: 'left', size: 'normal' };
    case 'list': return { style: 'bullet', items: [''] };
    case 'cards': return { cards: [{ title: '', body: '' }] };
    case 'gallery': return { urls: [] };
    case 'quote': return { text: '', attribution: '' };
    case 'divider': return {};
    default: return {};
  }
}

async function load(){
  try{
    PROPOSAL = await api('GET', '/api/proposals/' + PROPOSAL_ID);
    // One-time migration: proposals saved before content blocks existed
    // still have their map in the old single "mapEmbed" field. Seed it as
    // the first block so nothing is lost, without touching the server
    // until the user actually hits Save.
    if(!PROPOSAL.contentBlocks || !PROPOSAL.contentBlocks.length){
      PROPOSAL.contentBlocks = PROPOSAL.mapEmbed
        ? [{ id: blockId(), type: 'map_embed', data: { embedCode: PROPOSAL.mapEmbed } }]
        : [];
    }
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

    ${headerImageCardHtml(p)}

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
      <h2>Additional Content</h2>
      <div class="card-sub">Add and reorder rich content blocks — shown between the overview and the estimate on the client-facing proposal. Drag a block by its ⋮⋮ handle, or use the arrow buttons.</div>
      <div class="block-palette">
        ${BLOCK_TYPES.map(bt => `<button type="button" class="block-add-btn" data-type="${bt.type}">${bt.icon} ${esc(bt.label)}</button>`).join('')}
      </div>
      <div id="blocks-list" class="blocks-list"></div>
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
  bindHeaderImage();
  renderBlocksList();
  bindBlockPalette();
  bind();
}

/* ---------------- Line items (unchanged) ---------------- */

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

/* ---------------- Header image (dedicated hero field) ---------------- */

function headerImageCardHtml(p){
  return `
    <div class="card">
      <h2>Header Image</h2>
      <div class="card-sub">Shown at the top of the client-facing proposal, above the Overview.</div>
      <div id="header-image-preview">
        ${p.headerImage ? `
          <div class="header-img-preview">
            <img src="${esc(p.headerImage)}" alt="">
            <button class="btn btn-ghost btn-sm" id="remove-header-image">Remove image</button>
          </div>
        ` : `<div class="header-img-empty">No header image selected yet.</div>`}
      </div>
      <div class="btn-row" style="margin-top:14px;">
        <button class="btn btn-ghost btn-sm" id="upload-header-image">Upload new image</button>
        <button class="btn btn-ghost btn-sm" id="pick-header-image">Choose from library</button>
        <input type="file" id="header-image-file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none;">
      </div>
      <div id="header-image-status" style="font-size:12.5px;color:var(--slate);margin-top:8px;"></div>
    </div>
  `;
}

function bindHeaderImage(){
  const fileInput = document.getElementById('header-image-file');
  const statusEl = document.getElementById('header-image-status');

  document.getElementById('upload-header-image').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if(!file) return;
    try{
      const url = await uploadImageFile(file, statusEl);
      PROPOSAL.headerImage = url;
      refreshHeaderImageCard();
      showToast('Image uploaded');
    }catch(err){
      statusEl.textContent = err.message;
    }
    fileInput.value = '';
  });

  document.getElementById('pick-header-image').addEventListener('click', () => {
    pickFromLibrary(url => {
      PROPOSAL.headerImage = url;
      refreshHeaderImageCard();
    });
  });

  const removeBtn = document.getElementById('remove-header-image');
  if(removeBtn){
    removeBtn.addEventListener('click', () => {
      PROPOSAL.headerImage = '';
      refreshHeaderImageCard();
    });
  }
}

function refreshHeaderImageCard(){
  const card = document.getElementById('header-image-preview').closest('.card');
  card.outerHTML = headerImageCardHtml(PROPOSAL);
  bindHeaderImage();
}

/* ---------------- Shared image helpers (used by header image + gallery blocks) ---------------- */

async function uploadImageFile(file, statusEl){
  if(statusEl) statusEl.textContent = 'Uploading…';
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/api/images', { method: 'POST', credentials: 'same-origin', body: fd });
  const data = await res.json().catch(() => null);
  if(!res.ok) throw new Error((data && data.error) || 'Upload failed.');
  if(statusEl) statusEl.textContent = '';
  return data.url;
}

async function pickFromLibrary(onSelect){
  let images;
  try{
    images = await api('GET', '/api/images');
  }catch(err){
    showToast('Could not load image library');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <h2>Choose an image</h2>
        <button class="btn-text" id="modal-close">Close</button>
      </div>
      ${images.length ? `
        <div class="image-grid">
          ${images.map(img => `
            <button type="button" class="image-grid-item" data-url="${esc(img.url)}" title="${esc(img.originalName || '')}">
              <img src="${esc(img.url)}" alt="">
            </button>
          `).join('')}
        </div>
      ` : `<div class="empty-state">No images uploaded yet — use "Upload new image" first.</div>`}
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.remove(); });
  overlay.querySelectorAll('.image-grid-item').forEach(btn => {
    btn.addEventListener('click', () => {
      onSelect(btn.dataset.url);
      overlay.remove();
    });
  });
}

/* ---------------- Content blocks (drag-and-drop library) ---------------- */

function blockTypeMeta(type){
  return BLOCK_TYPES.find(b => b.type === type) || { icon: '', label: type };
}

function bindBlockPalette(){
  document.querySelectorAll('.block-add-btn').forEach(btn => {
    btn.addEventListener('click', () => addBlock(btn.dataset.type));
  });
}

function addBlock(type){
  PROPOSAL.contentBlocks.push({ id: blockId(), type, data: defaultBlockData(type) });
  renderBlocksList();
}

function removeBlock(idx){
  PROPOSAL.contentBlocks.splice(idx, 1);
  renderBlocksList();
}

function moveBlockUp(idx){
  if(idx <= 0) return;
  const blocks = PROPOSAL.contentBlocks;
  [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
  renderBlocksList();
}

function moveBlockDown(idx){
  const blocks = PROPOSAL.contentBlocks;
  if(idx >= blocks.length - 1) return;
  [blocks[idx + 1], blocks[idx]] = [blocks[idx], blocks[idx + 1]];
  renderBlocksList();
}

function renderBlocksList(){
  const container = document.getElementById('blocks-list');
  const blocks = PROPOSAL.contentBlocks;

  container.innerHTML = blocks.length
    ? blocks.map((b, i) => blockEditorHtml(b, i, blocks.length)).join('')
    : `<div class="blocks-empty">No content blocks yet — add one from the library above.</div>`;

  blocks.forEach((b, i) => {
    const el = container.querySelector(`.block-item[data-idx="${i}"]`);
    if(!el) return;
    bindBlockFieldInputs(el, b);
    bindBlockRepeaters(el, b);
    if(b.type === 'gallery') bindGalleryBlock(el, b);
    el.querySelector('.block-move-up').addEventListener('click', () => moveBlockUp(i));
    el.querySelector('.block-move-down').addEventListener('click', () => moveBlockDown(i));
    el.querySelector('.block-delete').addEventListener('click', () => removeBlock(i));
  });

  bindBlockDragEvents(container);
}

function blockEditorHtml(block, idx, total){
  const meta = blockTypeMeta(block.type);
  return `
    <div class="block-item" draggable="true" data-idx="${idx}" data-id="${block.id}">
      <div class="block-item-head">
        <span class="block-drag-handle" title="Drag to reorder">⋮⋮</span>
        <span class="block-type-label">${meta.icon} ${esc(meta.label)}</span>
        <div class="block-item-actions">
          <button type="button" class="block-move-up" title="Move up" ${idx===0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="block-move-down" title="Move down" ${idx===total-1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="block-delete" title="Remove block">✕</button>
        </div>
      </div>
      <div class="block-item-body">
        ${blockFieldsHtml(block)}
      </div>
    </div>
  `;
}

function blockFieldsHtml(block){
  const d = block.data;
  switch(block.type){
    case 'map_embed':
      return `
        <div class="field">
          <textarea data-field="embedCode" placeholder='&lt;iframe src="https://www.google.com/maps/embed?..."&gt;&lt;/iframe&gt;'>${esc(d.embedCode)}</textarea>
          <div class="hint">In Google Maps: Share → Embed a map → Copy HTML, then paste the whole thing here.</div>
        </div>
      `;
    case 'text':
      return `
        <div class="grid2">
          <div class="field"><label>Heading (optional)</label><input type="text" data-field="heading" value="${esc(d.heading)}"></div>
          <div class="field">
            <label>Style</label>
            <select data-field="size">
              <option value="normal" ${d.size==='normal'?'selected':''}>Normal</option>
              <option value="large" ${d.size==='large'?'selected':''}>Large / feature</option>
            </select>
          </div>
        </div>
        <div class="field"><label>Body text</label><textarea data-field="body" placeholder="Write your content…">${esc(d.body)}</textarea></div>
        <div class="field">
          <label>Alignment</label>
          <select data-field="align">
            <option value="left" ${d.align==='left'?'selected':''}>Left</option>
            <option value="center" ${d.align==='center'?'selected':''}>Center</option>
          </select>
        </div>
      `;
    case 'list':
      return `
        <div class="field">
          <label>Style</label>
          <select data-field="style">
            <option value="bullet" ${d.style==='bullet'?'selected':''}>Bulleted</option>
            <option value="number" ${d.style==='number'?'selected':''}>Numbered</option>
            <option value="check" ${d.style==='check'?'selected':''}>Checklist</option>
          </select>
        </div>
        <div class="repeater" data-repeater="items">
          ${d.items.map((item, i) => `
            <div class="repeater-row" data-idx="${i}">
              <input type="text" class="repeater-text" value="${esc(item)}" placeholder="List item">
              <button type="button" class="repeater-del">✕</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn btn-ghost btn-sm repeater-add" data-repeater-add="items">+ Add item</button>
      `;
    case 'cards':
      return `
        <div class="repeater" data-repeater="cards">
          ${d.cards.map((c, i) => `
            <div class="repeater-row repeater-row-card" data-idx="${i}">
              <input type="text" class="card-title-input" value="${esc(c.title)}" placeholder="Card title">
              <textarea class="card-body-input" placeholder="Card description">${esc(c.body)}</textarea>
              <button type="button" class="repeater-del">✕</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn btn-ghost btn-sm repeater-add" data-repeater-add="cards">+ Add card</button>
      `;
    case 'gallery':
      return `
        <div class="gallery-editor-grid">
          ${d.urls.map((url, i) => `
            <div class="gallery-editor-item" data-idx="${i}">
              <img src="${esc(url)}" alt="">
              <button type="button" class="gallery-item-del" title="Remove">✕</button>
            </div>
          `).join('')}
        </div>
        <div class="btn-row" style="margin-top:10px;">
          <button type="button" class="btn btn-ghost btn-sm gallery-upload-btn">Upload image</button>
          <button type="button" class="btn btn-ghost btn-sm gallery-pick-btn">Choose from library</button>
        </div>
      `;
    case 'quote':
      return `
        <div class="field"><label>Quote text</label><textarea data-field="text" placeholder="What a client or partner said…">${esc(d.text)}</textarea></div>
        <div class="field"><label>Attribution (optional)</label><input type="text" data-field="attribution" value="${esc(d.attribution)}" placeholder="— Jane D., Event Coordinator"></div>
      `;
    case 'divider':
      return `<div class="hint">A simple visual divider — no settings needed.</div>`;
    default:
      return '';
  }
}

function bindBlockFieldInputs(blockEl, block){
  blockEl.querySelectorAll('[data-field]').forEach(el => {
    const field = el.dataset.field;
    const evt = (el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(evt, () => { block.data[field] = el.value; });
  });
}

function bindBlockRepeaters(el, block){
  if(block.type === 'list'){
    const wrap = el.querySelector('[data-repeater="items"]');
    wrap.querySelectorAll('.repeater-row').forEach(row => {
      const idx = Number(row.dataset.idx);
      row.querySelector('.repeater-text').addEventListener('input', e => { block.data.items[idx] = e.target.value; });
      row.querySelector('.repeater-del').addEventListener('click', () => {
        block.data.items.splice(idx, 1);
        if(block.data.items.length === 0) block.data.items.push('');
        renderBlocksList();
      });
    });
    el.querySelector('[data-repeater-add="items"]').addEventListener('click', () => {
      block.data.items.push('');
      renderBlocksList();
    });
  }
  if(block.type === 'cards'){
    const wrap = el.querySelector('[data-repeater="cards"]');
    wrap.querySelectorAll('.repeater-row-card').forEach(row => {
      const idx = Number(row.dataset.idx);
      row.querySelector('.card-title-input').addEventListener('input', e => { block.data.cards[idx].title = e.target.value; });
      row.querySelector('.card-body-input').addEventListener('input', e => { block.data.cards[idx].body = e.target.value; });
      row.querySelector('.repeater-del').addEventListener('click', () => {
        block.data.cards.splice(idx, 1);
        if(block.data.cards.length === 0) block.data.cards.push({ title: '', body: '' });
        renderBlocksList();
      });
    });
    el.querySelector('[data-repeater-add="cards"]').addEventListener('click', () => {
      block.data.cards.push({ title: '', body: '' });
      renderBlocksList();
    });
  }
}

function bindGalleryBlock(el, block){
  el.querySelectorAll('.gallery-item-del').forEach(btn => {
    const idx = Number(btn.closest('.gallery-editor-item').dataset.idx);
    btn.addEventListener('click', () => {
      block.data.urls.splice(idx, 1);
      renderBlocksList();
    });
  });

  const uploadBtn = el.querySelector('.gallery-upload-btn');
  uploadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files[0];
      input.remove();
      if(!file) return;
      try{
        const url = await uploadImageFile(file);
        block.data.urls.push(url);
        renderBlocksList();
        showToast('Image uploaded');
      }catch(err){
        showToast(err.message);
      }
    });
    input.click();
  });

  el.querySelector('.gallery-pick-btn').addEventListener('click', () => {
    pickFromLibrary(url => {
      block.data.urls.push(url);
      renderBlocksList();
    });
  });
}

function bindBlockDragEvents(container){
  let dragSrcIdx = null;

  container.querySelectorAll('.block-item').forEach(el => {
    el.addEventListener('dragstart', () => {
      dragSrcIdx = Number(el.dataset.idx);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      container.querySelectorAll('.block-item').forEach(b => b.classList.remove('drag-over'));
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const targetIdx = Number(el.dataset.idx);
      if(dragSrcIdx === null || dragSrcIdx === targetIdx) return;
      const blocks = PROPOSAL.contentBlocks;
      const [moved] = blocks.splice(dragSrcIdx, 1);
      blocks.splice(targetIdx, 0, moved);
      dragSrcIdx = null;
      renderBlocksList();
    });
  });
}

/* ---------------- Field bindings + save (unchanged) ---------------- */

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
  bindField('f-notes','notes');

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
