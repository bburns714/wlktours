let DASH_TAB = 'leads';
let LEADS = [];
let PROPOSALS = [];

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('POST', '/api/auth/logout');
  window.location.href = '/admin/login';
});

document.getElementById('tab-leads').addEventListener('click', () => switchTab('leads'));
document.getElementById('tab-proposals').addEventListener('click', () => switchTab('proposals'));

function switchTab(tab){
  DASH_TAB = tab;
  document.getElementById('tab-leads').classList.toggle('active', tab === 'leads');
  document.getElementById('tab-proposals').classList.toggle('active', tab === 'proposals');
  paint();
}

function statusBadge(status){
  const map = {
    draft:['Draft','badge-draft'], sent:['Sent','badge-sent'],
    accepted:['Accepted','badge-accepted'], declined:['Declined','badge-declined']
  };
  const [label, cls] = map[status] || ['Draft','badge-draft'];
  return `<span class="badge ${cls}">${label}</span>`;
}

async function load(){
  try{
    [LEADS, PROPOSALS] = await Promise.all([
      api('GET', '/api/leads'),
      api('GET', '/api/proposals')
    ]);
    paint();
  }catch(err){
    document.getElementById('dash-body').innerHTML = `<div class="card empty-state">Couldn't load data: ${esc(err.message)}</div>`;
  }
}

function paint(){
  const body = document.getElementById('dash-body');
  body.innerHTML = DASH_TAB === 'leads' ? renderLeads() : renderProposals();
  if(DASH_TAB === 'leads') bindLeads(); else bindProposals();
}

function renderLeads(){
  const active = LEADS.filter(l => l.status !== 'archived');
  if(active.length === 0){
    return `<div class="card empty-state"><div class="em-icon">📭</div>No leads yet. New submissions from the lead form will appear here.</div>`;
  }
  return `
    <div class="card" style="padding:0;overflow-x:auto;">
      <table class="list">
        <thead><tr><th>Name</th><th>Organization</th><th>Type</th><th>Received</th><th></th></tr></thead>
        <tbody>
          ${active.map(l => `
            <tr>
              <td><strong>${esc(l.name)}</strong><br><span style="color:var(--slate);font-size:12px;">${esc(l.email)}</span></td>
              <td>${esc(l.company || '—')}</td>
              <td>${esc(l.org_type || '—')}</td>
              <td>${fmtDate(l.created_at)}</td>
              <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary btn-sm" data-create="${l.id}">Create proposal</button>
                <button class="btn btn-text btn-sm" data-archive="${l.id}">Archive</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function bindLeads(){
  document.querySelectorAll('[data-create]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try{
        const proposal = await api('POST', '/api/proposals', { leadId: btn.dataset.create });
        window.location.href = '/admin/proposals/' + proposal.id;
      }catch(err){
        showToast(err.message);
        btn.disabled = false;
      }
    });
  });
  document.querySelectorAll('[data-archive]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('PATCH', '/api/leads/' + btn.dataset.archive, { status: 'archived' });
      await load();
    });
  });
}

function renderProposals(){
  const listHtml = PROPOSALS.length === 0 ? `
    <div class="card empty-state"><div class="em-icon">📄</div>No proposals yet. Create one from a lead, or start blank.</div>
  ` : `
    <div class="card" style="padding:0;overflow-x:auto;">
      <table class="list">
        <thead><tr><th>Title</th><th>Client</th><th>Total</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          ${PROPOSALS.map(p => `
            <tr>
              <td><strong>${esc(p.title || 'Untitled proposal')}</strong></td>
              <td>${esc(p.client || '—')}</td>
              <td style="font-family:var(--font-mono);">${fmtMoney(p.total)}</td>
              <td>${statusBadge(p.status)}</td>
              <td>${fmtDate(p.updatedAt)}</td>
              <td style="text-align:right;white-space:nowrap;">
                <a href="/admin/proposals/${p.id}" class="btn btn-ghost btn-sm">Edit</a>
                <a href="/p/${p.id}" target="_blank" class="btn btn-text btn-sm">View</a>
                <button class="btn btn-danger btn-sm" data-del="${p.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  return `
    <div class="btn-row" style="margin-bottom:14px;justify-content:flex-end;">
      <button class="btn btn-ghost btn-sm" id="new-blank">+ New blank proposal</button>
    </div>
    ${listHtml}
  `;
}

function bindProposals(){
  document.getElementById('new-blank').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try{
      const proposal = await api('POST', '/api/proposals', {});
      window.location.href = '/admin/proposals/' + proposal.id;
    }catch(err){
      showToast(err.message);
      e.target.disabled = false;
    }
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm('Delete this proposal? This cannot be undone.')) return;
      await api('DELETE', '/api/proposals/' + btn.dataset.del);
      await load();
    });
  });
}

load();
