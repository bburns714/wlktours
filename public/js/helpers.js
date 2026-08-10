function fmtMoney(n){
  const v = isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(v);
}
function fmtDate(d){
  if(!d) return '';
  try{ return new Date(d).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'}); }
  catch(e){ return d; }
}
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function showToast(msg){
  let t = document.getElementById('toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function mapSrcFromEmbed(raw){
  if(!raw) return '';
  raw = raw.trim();
  const m = raw.match(/src=["']([^"']+)["']/i);
  if(m) return m[1];
  if(/^https?:\/\//i.test(raw)) return raw;
  return '';
}
function computeTotals(items, taxPercent){
  const subtotal = (items || []).reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const tax = subtotal * ((Number(taxPercent) || 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

async function api(method, url, body){
  const res = await fetch(url, {
    method,
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try{ data = await res.json(); }catch(e){ /* no body */ }
  if(!res.ok){
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
