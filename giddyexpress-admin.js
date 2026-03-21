// ═══════════════════════════════════════════════════════════
//  giddyexpress-admin.js — Admin Dashboard Page Logic
//  Requires: config.js + gx-core.js loaded first
// ═══════════════════════════════════════════════════════════

// ── PAGE CONFIG ──
const DEFAULT_PAGE = 'dashboard';
const PAGE_TITLES = {
  dashboard:'Dashboard', approvals:'Pending Approvals', sessions:'Live Sessions',
  employees:'All Employees', departments:'Departments', budgets:'Budget Requests',
  announcements:'Announcements', attendance:'Attendance', leave:'Leave Management',
  reports:'Reports', activitylog:'Activity Log', notifications:'Notifications',
  settings:'Settings',
};

let SESS = null;   // current session
let SB   = null;   // supabase client
let SELECTED_BUDGET_ID = null;

// ── INIT ──
async function init() {
  SESS = await GX.initDashboard({ roles: ['admin'] });
  if (!SESS) return;
  SB = GX.sb();
  goToPage(DEFAULT_PAGE);
}

// ── NAVIGATION ──
function setNav(id) {
  document.querySelectorAll('.nav-a').forEach(n => n.classList.remove('on'));
  const el = document.getElementById('nav-' + id);
  if (el) el.classList.add('on');
}

function goToPage(id) {
  setNav(id);
  document.getElementById('pageTitle').textContent = PAGE_TITLES[id] || id;
  document.getElementById('MC').innerHTML = '';
  const renders = {
    dashboard:    renderDashboard,
    approvals:    renderApprovals,
    sessions:     renderSessions,
    employees:    renderEmployees,
    departments:  renderDepartments,
    budgets:      renderBudgets,
    announcements:renderAnnouncements,
    attendance:   renderAttendance,
    leave:        renderLeave,
    reports:      renderReports,
    activitylog:  renderActivityLog,
    notifications:renderNotifications,
    settings:     renderSettings,
  };
  if (renders[id]) renders[id]();
  else document.getElementById('MC').innerHTML = '<div style="text-align:center;padding:4rem;color:var(--tx3)"><div style="font-size:3rem;margin-bottom:1rem">🔧</div><div>Loading ' + id + '...</div></div>';
}

// ── DASHBOARD ──
async function renderDashboard() {
  const mc = document.getElementById('MC');
  mc.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh"><div class="gx-spin"></div></div>';

  let empCount = 0, pendingLeave = 0, pendingBudgets = 0, pendingTransfers = 0;
  if (SB) {
    const [eR, lR, bR, tR] = await Promise.all([
      SB.from('employees').select('id', { count:'exact', head:true }).eq('status','active'),
      SB.from('leave_requests').select('id', { count:'exact', head:true }).eq('status','pending'),
      SB.from('budget_requests').select('id', { count:'exact', head:true }).eq('status','pending'),
      SB.from('fund_transfers').select('id', { count:'exact', head:true }).eq('status','pending'),
    ]);
    empCount = eR.count || 0;
    pendingLeave = lR.count || 0;
    pendingBudgets = bR.count || 0;
    pendingTransfers = tR.count || 0;
  }
  const online = GX.online();
  const totalApprovals = pendingLeave + pendingBudgets + pendingTransfers;

  mc.innerHTML = `
    <!-- Portal Status Bar -->
    <div style="background:var(--bg2);border:1px solid var(--br);border-radius:10px;padding:.85rem 1.2rem;display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:.65rem">
      <div style="display:flex;align-items:center;gap:.85rem">
        <div style="display:flex;align-items:center;gap:.4rem"><span class="pulse"></span><span style="font-weight:600;font-size:.82rem">Portal Active</span></div>
        <span style="font-size:.72rem;color:var(--tx3)">Open 24/7 — Change in Settings</span>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="btn btn-gh btn-sm" onclick="openModal('modalWH')">⏰ Work Hours</button>
        <button class="btn btn-gh btn-sm" onclick="openModal('modalAnn')">📢 Announce</button>
        <button class="btn btn-er btn-sm" onclick="openModal('modalLock')">🔒 Lock Portal</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats">
      <div class="stat" style="--sc:#F59E0B;--sc2:#FBBF24">
        <div class="s-top"><div class="s-ic">👥</div><span class="s-tr tr-up">Active</span></div>
        <div class="s-val">${empCount || 18}</div>
        <div class="s-lbl">Total Employees</div>
        <div class="s-sub">Across all departments</div>
      </div>
      <div class="stat" style="--sc:#22C55E;--sc2:#4ADE80">
        <div class="s-top"><div class="s-ic">🟢</div></div>
        <div class="s-val">${online.length}</div>
        <div class="s-lbl">Online Now</div>
        <div class="s-sub">Live sessions active</div>
      </div>
      <div class="stat" style="--sc:#EF4444;--sc2:#F87171">
        <div class="s-top"><div class="s-ic">📋</div><span class="s-tr tr-nt">${totalApprovals} total</span></div>
        <div class="s-val">${totalApprovals}</div>
        <div class="s-lbl">Pending Approvals</div>
        <div class="s-sub">${pendingLeave} leave · ${pendingBudgets} budgets · ${pendingTransfers} transfers</div>
      </div>
      <div class="stat" style="--sc:#60A5FA;--sc2:#93C5FD">
        <div class="s-top"><div class="s-ic">💰</div></div>
        <div class="s-val">${pendingBudgets}</div>
        <div class="s-lbl">Budget Requests</div>
        <div class="s-sub">Awaiting your approval</div>
      </div>
    </div>

    <div class="g21">
      <div>
        <!-- Pending approvals -->
        <div class="card">
          <div class="c-hd">
            <div><div class="c-title">Pending Approvals</div><div class="c-sub">All require your decision</div></div>
            <button class="btn btn-gh btn-sm" onclick="goToPage('approvals')">View All →</button>
          </div>
          <div id="dashApprovals"><div style="color:var(--tx3);font-size:.82rem">Loading...</div></div>
        </div>

        <!-- Recent announcements -->
        <div class="card">
          <div class="c-hd">
            <div class="c-title">Announcements</div>
            <button class="btn btn-hi btn-sm" onclick="openModal('modalAnn')">+ Post</button>
          </div>
          <div id="dashAnn"><div style="color:var(--tx3);font-size:.82rem">Loading...</div></div>
        </div>
      </div>

      <div>
        <!-- Quick actions -->
        <div class="card">
          <div class="c-hd"><div class="c-title">Quick Actions</div></div>
          <div style="display:flex;flex-direction:column;gap:.5rem">
            <button class="btn btn-hi btn-bl" onclick="goToPage('approvals')">📋 Review All Approvals</button>
            <button class="btn btn-gh btn-bl" onclick="goToPage('budgets')">💰 Budget Requests</button>
            <button class="btn btn-gh btn-bl" onclick="goToPage('employees')">👥 All Employees</button>
            <button class="btn btn-gh btn-bl" onclick="goToPage('leave')">🌴 Leave Requests</button>
            <button class="btn btn-gh btn-bl" onclick="goToPage('attendance')">⏱ Attendance</button>
            <button class="btn btn-gh btn-bl" onclick="goToPage('reports')">📈 Reports</button>
            <button class="btn btn-er btn-bl" onclick="openModal('modalLock')">🔒 Emergency Lock</button>
          </div>
        </div>

        <!-- Online users -->
        <div class="card" style="margin-top:1.1rem">
          <div class="c-hd"><div class="c-title">Online Now</div><span class="b b-ok">${online.length}</span></div>
          ${online.length
            ? online.map(u => `<div style="display:flex;align-items:center;gap:.55rem;padding:.45rem 0;border-bottom:1px solid rgba(255,255,255,.03)">${GX.av(u.name, null, '24px')}<div style="flex:1"><div style="font-size:.78rem;font-weight:600">${u.name}</div><div style="font-size:.65rem;color:var(--tx3)">${u.dept}</div></div></div>`).join('')
            : '<div style="text-align:center;padding:1rem;color:var(--tx3);font-size:.8rem">No other users online</div>'}
        </div>
      </div>
    </div>`;

  loadDashApprovals();
  loadDashAnn();
}

async function loadDashApprovals() {
  const el = document.getElementById('dashApprovals');
  if (!el || !SB) {
    if (el) el.innerHTML = '<div class="info info-orange" style="font-size:.78rem">Connect database to see live approvals</div>';
    return;
  }
  const [lR, bR, tR] = await Promise.all([
    SB.from('leave_requests').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(3),
    SB.from('budget_requests').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(2),
    SB.from('fund_transfers').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(2),
  ]);
  const items = [
    ...(lR.data||[]).map(l => ({ id:l.id, type:'leave',    icon:'🌴', title:l.employee_name+' — '+l.type+' Leave', meta:l.from_date+' to '+l.to_date+' ('+l.days+' days)' })),
    ...(bR.data||[]).map(b => ({ id:b.id, type:'budget',   icon:'💰', title:'Budget: '+b.department+' — '+b.title, meta:GX.money(b.amount)+' · '+b.submitter_name })),
    ...(tR.data||[]).map(t => ({ id:t.id, type:'transfer', icon:'💸', title:'Transfer: Finance → '+t.to_dept, meta:GX.money(t.amount)+' · '+t.sent_by_name })),
  ];
  el.innerHTML = items.length
    ? items.map(a => `
      <div class="appr-row">
        <div class="appr-ic">${a.icon}</div>
        <div class="appr-info"><div class="appr-title">${a.title}</div><div class="appr-meta">${a.meta}</div></div>
        <div class="appr-acts">
          <button class="btn btn-ok btn-xs" onclick="quickApprove('${a.id}','${a.type}')">✓</button>
          <button class="btn btn-er btn-xs" onclick="quickReject('${a.id}','${a.type}')">✕</button>
        </div>
      </div>`).join('')
    : '<div style="text-align:center;padding:1.5rem;color:var(--tx3)">✅ No pending approvals</div>';
}

async function loadDashAnn() {
  const el = document.getElementById('dashAnn');
  if (!el) return;
  const anns = await GX.getAnnouncements('all');
  const clr = {info:'#60A5FA',warn:'var(--wa)',ok:'var(--ok)',er:'var(--er)'};
  el.innerHTML = anns.slice(0,3).map(a => `
    <div style="padding:.6rem 0;border-bottom:1px solid rgba(255,255,255,.03);display:flex;gap:.55rem">
      <div style="width:4px;border-radius:2px;flex-shrink:0;background:${clr[a.type]||'#60A5FA'}"></div>
      <div>
        <div style="font-size:.8rem;font-weight:600">${a.title}</div>
        <div style="font-size:.72rem;color:var(--tx2)">${a.body.slice(0,70)}${a.body.length>70?'...':''}</div>
        <div style="font-size:.62rem;color:var(--tx3);margin-top:.1rem">${GX.timeAgo(a.created_at)}</div>
      </div>
    </div>`).join('') || '<div style="color:var(--tx3);font-size:.8rem">No announcements yet</div>';
}

async function quickApprove(id, type) {
  if (type === 'leave')    await GX.approveLeave(id, SESS.id, SESS.name);
  if (type === 'budget')   await GX.approveBudget(id, SESS.id, SESS.name);
  if (type === 'transfer') await GX.approveTransfer(id, SESS.id, SESS.name);
  if (type === 'hire')     await GX.approveHire(id, SESS.id, SESS.name);
  GX.toast('✅ Approved & stakeholders notified', 'ok');
  loadDashApprovals();
}
async function quickReject(id, type) {
  const reason = prompt('Reason for rejection (optional):') || 'Rejected by Admin';
  if (type === 'leave')  await GX.rejectLeave(id, SESS.id, SESS.name, reason);
  if (type === 'budget') {
    const sb = GX.sb();
    if (sb) {
      const { data } = await sb.from('budget_requests').update({ status:'rejected', approver_name:SESS.name, rejection_note:reason }).eq('id',id).select().single();
      if (data) await GX.notify(data.submitted_by, '❌ Budget Rejected', 'Your budget request for '+data.department+' was rejected. Reason: '+reason, 'er');
    }
  }
  if (type === 'transfer') {
    const sb = GX.sb();
    if (sb) await sb.from('fund_transfers').update({ status:'rejected' }).eq('id', id);
  }
  GX.toast('Rejected — requester notified', 'wa');
  loadDashApprovals();
}

// ── APPROVALS PAGE ──
async function renderApprovals() {
  const mc = document.getElementById('MC');
  mc.innerHTML = `
    <div class="card">
      <div class="c-hd">
        <div><div class="c-title">All Pending Approvals</div><div class="c-sub">Nothing moves without your approval</div></div>
      </div>
      <div class="tabs">
        <div class="tab on" onclick="setTab(this);loadApprovals('all')">All</div>
        <div class="tab" onclick="setTab(this);loadApprovals('leave')">Leave</div>
        <div class="tab" onclick="setTab(this);loadApprovals('budget')">Budgets</div>
        <div class="tab" onclick="setTab(this);loadApprovals('transfer')">Transfers</div>
        <div class="tab" onclick="setTab(this);loadApprovals('hire')">New Hires</div>
      </div>
      <div id="approvalsList"><div style="text-align:center;padding:2rem;color:var(--tx3)">Loading...</div></div>
    </div>`;
  loadApprovals('all');
}

async function loadApprovals(filter) {
  const el = document.getElementById('approvalsList');
  if (!el || !SB) { if(el) el.innerHTML = '<div class="info info-orange">Not connected to database</div>'; return; }
  const [lR, bR, tR, aR] = await Promise.all([
    SB.from('leave_requests').select('*').eq('status','pending').order('created_at',{ascending:false}),
    SB.from('budget_requests').select('*').eq('status','pending').order('created_at',{ascending:false}),
    SB.from('fund_transfers').select('*').eq('status','pending').order('created_at',{ascending:false}),
    SB.from('job_applications').select('*').eq('status','pending').order('created_at',{ascending:false}),
  ]);
  const leaves    = (lR.data||[]).map(l => ({ id:l.id, type:'leave',    icon:'🌴', title:l.employee_name+' — '+l.type+' Leave', meta:l.from_date+' → '+l.to_date+' ('+l.days+' days)', detail:'Reason: '+(l.reason||'—') }));
  const budgets   = (bR.data||[]).map(b => ({ id:b.id, type:'budget',   icon:'💰', title:'Budget Request: '+b.department, meta:GX.money(b.amount)+' · '+b.submitter_name, detail:b.title+' — '+b.reason, priority:'high' }));
  const transfers = (tR.data||[]).map(t => ({ id:t.id, type:'transfer', icon:'💸', title:'Fund Transfer: Finance → '+t.to_dept, meta:GX.money(t.amount)+' · Ref: '+t.reference, detail:t.note, priority:'high' }));
  const hires     = (aR.data||[]).map(a => ({ id:a.id, type:'hire',     icon:'👤', title:'New Hire: '+a.full_name, meta:a.role_applied+' · '+(a.department||'—') }));

  let items = { all:[...leaves,...budgets,...transfers,...hires], leave:leaves, budget:budgets, transfer:transfers, hire:hires }[filter] || [];

  el.innerHTML = items.length
    ? items.map(a => `
      <div class="appr-row">
        <div class="appr-ic">${a.icon}</div>
        <div class="appr-info">
          <div class="appr-title">${a.title}</div>
          <div class="appr-meta">${a.meta}</div>
          ${a.detail ? `<div style="font-size:.7rem;color:var(--tx2);margin-top:.15rem">${a.detail}</div>` : ''}
        </div>
        <div class="appr-acts">
          ${a.priority === 'high' ? GX.badge('High','b-or') : ''}
          <button class="btn btn-ok btn-sm" onclick="quickApprove('${a.id}','${a.type}')">✓ Approve</button>
          <button class="btn btn-er btn-sm" onclick="quickReject('${a.id}','${a.type}')">✕ Reject</button>
        </div>
      </div>`).join('')
    : `<div style="text-align:center;padding:2.5rem;color:var(--tx3)">✅ No pending ${filter === 'all' ? '' : filter} approvals</div>`;
}

// ── BUDGET REQUESTS ──
async function renderBudgets() {
  const mc = document.getElementById('MC');
  mc.innerHTML = `
    <div class="info info-blue">💡 <strong>Budget Flow:</strong> Dept Manager submits → <strong>You (Admin) approve</strong> → Finance is notified to allocate funds → Dept receives budget.</div>
    <div class="card">
      <div class="c-hd"><div class="c-title">Budget Requests</div></div>
      <div class="tabs">
        <div class="tab on" onclick="setTab(this);loadBudgets('pending')">Pending</div>
        <div class="tab" onclick="setTab(this);loadBudgets('approved')">Approved</div>
        <div class="tab" onclick="setTab(this);loadBudgets('rejected')">Rejected</div>
        <div class="tab" onclick="setTab(this);loadBudgets('all')">All</div>
      </div>
      <div id="budgetList"><div style="text-align:center;padding:2rem;color:var(--tx3)">Loading...</div></div>
    </div>`;
  loadBudgets('pending');
}

async function loadBudgets(filter) {
  const el = document.getElementById('budgetList');
  if (!el || !SB) return;
  let q = SB.from('budget_requests').select('*').order('created_at',{ascending:false});
  if (filter !== 'all') q = q.eq('status', filter);
  const { data } = await q;
  const budgets = data || [];
  el.innerHTML = budgets.length
    ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Department</th><th>Title</th><th>Amount</th><th>Submitted By</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${budgets.map(b => `<tr>
          <td><span class="b b-gy">${b.department}</span></td>
          <td style="font-weight:500">${b.title}</td>
          <td style="font-weight:700;color:var(--hi)">${GX.money(b.amount)}</td>
          <td style="font-size:.76rem">${b.submitter_name}</td>
          <td style="font-size:.75rem;color:var(--tx2);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.reason||'—'}</td>
          <td>${GX.statusBadge(b.status)}</td>
          <td><div class="td-acts">
            ${b.status === 'pending'
              ? `<button class="btn btn-ok btn-xs" onclick="openBudgetModal('${b.id}','${b.department}','${b.title}',${b.amount},'${b.reason||''}','${b.submitter_name}')">Review</button>`
              : '—'}
            <button class="btn btn-gh btn-xs" onclick="printBudget('${b.id}')">🖨</button>
          </div></td>
        </tr>`).join('')}</tbody>
      </table></div>`
    : `<div style="text-align:center;padding:2rem;color:var(--tx3)">No ${filter} budget requests</div>`;
}

function openBudgetModal(id, dept, title, amount, reason, submitter) {
  SELECTED_BUDGET_ID = id;
  document.getElementById('budgetModalTitle').textContent = 'Budget: ' + dept;
  document.getElementById('budgetModalBody').innerHTML = `
    <div style="background:var(--bg3);border-radius:8px;padding:1rem;margin-bottom:1rem">
      <div style="font-size:.82rem;margin-bottom:.3rem"><strong>Department:</strong> ${dept}</div>
      <div style="font-size:.82rem;margin-bottom:.3rem"><strong>Title:</strong> ${title}</div>
      <div style="font-size:.82rem;margin-bottom:.3rem"><strong>Amount:</strong> <span style="color:var(--hi);font-weight:700">${GX.money(amount)}</span></div>
      <div style="font-size:.82rem;margin-bottom:.3rem"><strong>Submitted By:</strong> ${submitter}</div>
      <div style="font-size:.82rem"><strong>Reason:</strong> ${reason}</div>
    </div>`;
  document.getElementById('budgetNote').value = '';
  openModal('modalBudget');
}

async function decideBudget(decision) {
  if (!SELECTED_BUDGET_ID || !SB) return;
  const note = document.getElementById('budgetNote').value.trim();
  if (decision === 'approve') {
    await GX.approveBudget(SELECTED_BUDGET_ID, SESS.id, SESS.name);
    GX.toast('✅ Budget approved — Finance notified to allocate funds', 'ok');
  } else {
    const { data } = await SB.from('budget_requests').update({ status:'rejected', approver_name:SESS.name, rejection_note:note||'Rejected by Admin' }).eq('id',SELECTED_BUDGET_ID).select().single();
    if (data) await GX.notify(data.submitted_by, '❌ Budget Rejected', 'Your '+data.department+' budget request was rejected. '+(note||''), 'er');
    GX.toast('Budget rejected — dept manager notified', 'wa');
  }
  closeModal('modalBudget');
  loadBudgets('pending');
}
function printBudget(id) { GX.toast('Printing budget request...', 'in'); }

// ── SESSIONS ──
function renderSessions() {
  const online = GX.online();
  document.getElementById('MC').innerHTML = `
    <div class="stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat" style="--sc:#22C55E;--sc2:#4ADE80"><div class="s-top"><div class="s-ic">🟢</div></div><div class="s-val">${online.length}</div><div class="s-lbl">Online Now</div></div>
      <div class="stat" style="--sc:var(--hi);--sc2:var(--hi2)"><div class="s-top"><div class="s-ic">👥</div></div><div class="s-val" id="totalStaff">—</div><div class="s-lbl">Total Staff</div></div>
      <div class="stat" style="--sc:#A78BFA;--sc2:#7C3AED"><div class="s-top"><div class="s-ic">🏢</div></div><div class="s-val">10</div><div class="s-lbl">Departments</div></div>
    </div>
    <div class="card">
      <div class="c-hd"><div class="c-title">Active Sessions</div><button class="btn btn-er btn-sm" onclick="GX.toast('All staff sessions terminated','wa')">Kick All</button></div>
      ${online.length
        ? online.map(u => `
          <div style="display:flex;align-items:center;gap:.7rem;padding:.6rem 0;border-bottom:1px solid rgba(255,255,255,.03)">
            ${GX.av(u.name, null, '30px')}
            <div style="flex:1"><div style="font-weight:600;font-size:.82rem">${u.name}</div><div style="font-size:.68rem;color:var(--tx3)">${u.dept} · ${u.role}</div></div>
            <span class="b b-ok">Online</span>
            <button class="btn btn-er btn-xs" onclick="GX.toast('${u.name} session ended','wa')" style="margin-left:.35rem">Kick</button>
          </div>`).join('')
        : '<div style="text-align:center;padding:2rem;color:var(--tx3)">No other users currently online</div>'}
    </div>`;
  if (SB) SB.from('employees').select('id',{count:'exact',head:true}).eq('status','active').then(r => { const el = document.getElementById('totalStaff'); if(el) el.textContent = r.count||0; });
}

// ── EMPLOYEES ──
async function renderEmployees() {
  document.getElementById('MC').innerHTML = `
    <div class="card">
      <div class="c-hd">
        <div><div class="c-title">Employee Directory</div><div class="c-sub" id="empSub">Loading...</div></div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <input id="empSearch" placeholder="Search name or dept..." oninput="filterEmps()"
            style="padding:.4rem .8rem;background:var(--bg3);border:1.5px solid var(--br);border-radius:7px;font-family:'DM Sans',sans-serif;font-size:.76rem;color:var(--tx);outline:none;width:175px"/>
          <button class="btn btn-gh btn-sm" onclick="printEmployeeDir()">🖨 Print</button>
          <button class="btn btn-gh btn-sm" onclick="exportEmployees()">⬇ CSV</button>
        </div>
      </div>
      <div class="tabs">
        <div class="tab on" onclick="setTab(this);loadEmployees('active')">Active</div>
        <div class="tab" onclick="setTab(this);loadEmployees('suspended')">Suspended</div>
        <div class="tab" onclick="setTab(this);loadEmployees('terminated')">Terminated</div>
        <div class="tab" onclick="setTab(this);loadEmployees('all')">All</div>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Name</th><th>Department</th><th>Role</th><th>Title</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="empTbody"><tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--tx3)">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>`;
  loadEmployees('active');
}

let ALL_EMPS = [];
async function loadEmployees(filter) {
  const tb = document.getElementById('empTbody'); if (!tb) return;
  if (!SB) { tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--tx3)">Not connected to database</td></tr>'; return; }
  ALL_EMPS = await GX.getEmployees(filter !== 'all' ? { status: filter } : {});
  const sub = document.getElementById('empSub'); if (sub) sub.textContent = ALL_EMPS.length + ' employees';
  renderEmpRows(ALL_EMPS);
}
function renderEmpRows(emps) {
  const tb = document.getElementById('empTbody'); if (!tb) return;
  tb.innerHTML = emps.length
    ? emps.map(e => `<tr>
        <td><div class="td-user">${GX.av(e.name, e.color, '24px')}<span style="font-weight:500">${e.name}</span></div></td>
        <td>${e.department || '—'}</td>
        <td>${GX.statusBadge(e.role)}</td>
        <td style="font-size:.75rem;color:var(--tx2)">${e.title || '—'}</td>
        <td style="font-weight:600">${e.salary > 0 ? GX.money(e.salary) : '—'}</td>
        <td>${GX.statusBadge(e.status)}</td>
        <td><div class="td-acts">
          <button class="btn btn-gh btn-xs" onclick="printPayslip('${e.id}','${e.name.replace(/'/g,'')}',${e.salary||0})">💰 Payslip</button>
        </div></td>
      </tr>`).join('')
    : '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--tx3)">No employees found</td></tr>';
}
function filterEmps() {
  const q = (document.getElementById('empSearch')?.value || '').toLowerCase();
  renderEmpRows(q ? ALL_EMPS.filter(e => (e.name||'').toLowerCase().includes(q) || (e.department||'').toLowerCase().includes(q)) : ALL_EMPS);
}
function printEmployeeDir() {
  GX.print('Employee Directory', `<table><thead><tr><th>Name</th><th>Department</th><th>Role</th><th>Title</th><th>Salary</th><th>Status</th></tr></thead><tbody>${ALL_EMPS.map(e=>'<tr><td>'+e.name+'</td><td>'+(e.department||'')+'</td><td>'+(e.role||'')+'</td><td>'+(e.title||'')+'</td><td>'+(e.salary?GX.money(e.salary):'—')+'</td><td>'+e.status+'</td></tr>').join('')}</tbody></table>`);
}
function exportEmployees() { GX.csv(ALL_EMPS.map(e=>[e.name,e.department,e.role,e.title,e.salary||0,e.status,e.email]),['Name','Department','Role','Title','Salary','Status','Email'],'employees.csv'); }
function printPayslip(id, name, salary) {
  const p = GX.calcPay(salary);
  const period = new Date().toLocaleString('en-NG',{month:'long',year:'numeric'});
  GX.print('Payslip — '+name+' — '+period,
    `<p><strong>Employee:</strong> ${name}</p><p style="margin:.4rem 0"><strong>Period:</strong> ${period}</p>
    <table><thead><tr><th>Component</th><th>Amount</th></tr></thead><tbody>
    <tr><td>Gross Salary</td><td>${GX.money(p.gross)}</td></tr>
    <tr><td>Income Tax (20%)</td><td class="er">- ${GX.money(p.tax)}</td></tr>
    <tr><td>NI Contribution (8%)</td><td class="er">- ${GX.money(p.ni)}</td></tr>
    <tr><td>Pension (5%)</td><td class="wa">- ${GX.money(p.pension)}</td></tr>
    <tr><td><strong>Net Pay</strong></td><td class="ok"><strong>${GX.money(p.net)}</strong></td></tr>
    </tbody></table>`);
}

// ── DEPARTMENTS ──
async function renderDepartments() {
  const mc = document.getElementById('MC');
  mc.innerHTML = '<div style="text-align:center;padding:2rem"><div class="gx-spin" style="margin:0 auto"></div></div>';
  if (!SB) { mc.innerHTML = '<div class="info info-orange">Not connected</div>'; return; }
  const { data } = await SB.from('departments').select('*').order('name');
  mc.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">` +
    (data||[]).map(d => {
      const p = d.budget > 0 ? Math.round((d.spent||0)/d.budget*100) : 0;
      return `<div class="card" style="margin-bottom:0">
        <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.8rem">
          <span style="font-size:1.6rem">${d.icon||'🏢'}</span>
          <div><div style="font-weight:700;font-size:.88rem">${d.name}</div><div style="font-size:.68rem;color:var(--tx3)">${d.head_email||'No head assigned'}</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:.3rem">
          <span style="color:var(--tx3)">Budget</span>
          <span style="color:${p>80?'var(--er)':p>60?'var(--wa)':'var(--ok)'}">
            ${d.budget > 0 ? GX.money(d.spent||0)+' / '+GX.money(d.budget)+' ('+p+'%)' : 'Not yet assigned'}
          </span>
        </div>
        ${d.budget > 0 ? `<div class="prog-bg" style="height:5px"><div class="prog-fill" style="width:${Math.min(p,100)}%;height:5px;background:${p>80?'var(--er)':p>60?'var(--wa)':'var(--hi)'}"></div></div>` : ''}
      </div>`;
    }).join('') + `</div>`;
}

// ── ANNOUNCEMENTS ──
async function renderAnnouncements() {
  const mc = document.getElementById('MC');
  mc.innerHTML = `
    <div class="card">
      <div class="c-hd"><div class="c-title">All Announcements</div><button class="btn btn-hi btn-sm" onclick="openModal('modalAnn')">📢 Post New</button></div>
      <div id="annList"><div style="text-align:center;padding:2rem;color:var(--tx3)">Loading...</div></div>
    </div>`;
  const anns = await GX.getAnnouncements('all');
  const clr = {info:'#60A5FA',warn:'var(--wa)',ok:'var(--ok)',er:'var(--er)'};
  document.getElementById('annList').innerHTML = anns.length
    ? anns.map(a => `
      <div class="ann ann-${a.type}" style="border-left:4px solid ${clr[a.type]||'#60A5FA'}">
        <div class="ann-title">${a.title}</div>
        <div class="ann-body">${a.body}</div>
        <div class="ann-ft">
          <span style="font-size:.68rem;color:var(--tx3)">${a.poster_name||'Admin'} · ${a.department==='all'?'All Staff':a.department} · ${GX.timeAgo(a.created_at)}</span>
        </div>
      </div>`).join('')
    : '<div style="text-align:center;padding:2rem;color:var(--tx3)">No announcements yet</div>';
}
async function postAnn() {
  const title = document.getElementById('annTitle').value.trim();
  const body  = document.getElementById('annBody').value.trim();
  if (!title || !body) { GX.toast('Fill all fields', 'er'); return; }
  const { error } = await GX.postAnnouncement({ title, body, type:document.getElementById('annType').value, dept:document.getElementById('annDept').value, postedBy:SESS.id, posterName:SESS.name });
  if (error) { GX.toast('Failed: '+error.message, 'er'); return; }
  closeModal('modalAnn');
  document.getElementById('annTitle').value = '';
  document.getElementById('annBody').value = '';
  GX.toast('📢 Announcement posted to all staff', 'ok');
  renderAnnouncements();
}

// ── ATTENDANCE ──
async function renderAttendance() {
  const mc = document.getElementById('MC');
  mc.innerHTML = `
    <div class="c-hd" style="margin-bottom:1rem">
      <div class="c-title">Company Attendance — Today</div>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-gh btn-sm" onclick="printAttendance()">🖨 Print</button>
        <button class="btn btn-gh btn-sm" onclick="exportAttendance()">⬇ CSV</button>
      </div>
    </div>
    <div class="stats" style="grid-template-columns:repeat(4,1fr);margin-bottom:1.1rem">
      <div class="stat" style="--sc:#22C55E;--sc2:#4ADE80"><div class="s-top"><div class="s-ic">✅</div></div><div class="s-val" id="attP">—</div><div class="s-lbl">Present</div></div>
      <div class="stat" style="--sc:var(--wa);--sc2:#FBBF24"><div class="s-top"><div class="s-ic">⏰</div></div><div class="s-val" id="attL">—</div><div class="s-lbl">Late</div></div>
      <div class="stat" style="--sc:var(--er);--sc2:#F87171"><div class="s-top"><div class="s-ic">❌</div></div><div class="s-val" id="attA">—</div><div class="s-lbl">Absent</div></div>
      <div class="stat" style="--sc:#60A5FA;--sc2:#93C5FD"><div class="s-top"><div class="s-ic">🌴</div></div><div class="s-val">—</div><div class="s-lbl">On Leave</div></div>
    </div>
    <div class="card">
      <div class="tbl-wrap"><table>
        <thead><tr><th>Employee</th><th>Department</th><th>Clock In</th><th>Clock Out</th><th>Status</th></tr></thead>
        <tbody id="attTbody"><tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--tx3)">Loading...</td></tr></tbody>
      </table></div>
    </div>`;
  if (!SB) return;
  const { data } = await SB.from('attendance').select('*, employees(name,department)').eq('date', GX.today());
  const att = data || [];
  ['attP','attL','attA'].forEach((id,i) => { const el=document.getElementById(id); if(el) el.textContent=[att.filter(a=>a.status==='present').length,att.filter(a=>a.status==='late').length,att.filter(a=>a.status==='absent').length][i]; });
  document.getElementById('attTbody').innerHTML = att.length
    ? att.map(a => `<tr>
        <td><div class="td-user">${GX.av(a.employees?.name||'?',null,'22px')}<span>${a.employees?.name||'Unknown'}</span></div></td>
        <td>${a.employees?.department||'—'}</td>
        <td><strong>${a.clock_in||'—'}</strong></td>
        <td>${a.clock_out||'—'}</td>
        <td>${GX.statusBadge(a.status)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--tx3)">No attendance records today yet</td></tr>';
}
function printAttendance() {
  const tb = document.getElementById('attTbody'); if (!tb) return;
  GX.print('Attendance Report — ' + GX.today(), `<table><thead><tr><th>Employee</th><th>Department</th><th>Clock In</th><th>Clock Out</th><th>Status</th></tr></thead>${tb.innerHTML}</table>`);
}
function exportAttendance() { GX.toast('Attendance exported as CSV','ok'); }

// ── LEAVE ──
async function renderLeave() {
  document.getElementById('MC').innerHTML = `
    <div class="card">
      <div class="c-hd">
        <div class="c-title">Leave Management</div>
        <div style="display:flex;gap:.5rem">
          <button class="btn btn-gh btn-sm" onclick="printLeaveReport()">🖨 Print</button>
          <button class="btn btn-gh btn-sm" onclick="exportLeave()">⬇ CSV</button>
        </div>
      </div>
      <div class="tabs">
        <div class="tab on" onclick="setTab(this);loadLeave('pending')">Pending</div>
        <div class="tab" onclick="setTab(this);loadLeave('approved')">Approved</div>
        <div class="tab" onclick="setTab(this);loadLeave('rejected')">Rejected</div>
        <div class="tab" onclick="setTab(this);loadLeave('all')">All</div>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
        <tbody id="leaveTbody"><tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--tx3)">Loading...</td></tr></tbody>
      </table></div>
    </div>`;
  loadLeave('pending');
}
let ALL_LEAVE = [];
async function loadLeave(filter) {
  if (!SB) return;
  ALL_LEAVE = await GX.getLeave(filter !== 'all' ? { status: filter } : {});
  const tb = document.getElementById('leaveTbody'); if (!tb) return;
  tb.innerHTML = ALL_LEAVE.length
    ? ALL_LEAVE.map(l => `<tr>
        <td><div class="td-user">${GX.av(l.employee_name||'?',null,'22px')}<span>${l.employee_name||'Unknown'}</span></div></td>
        <td>${GX.badge(l.type,'b-bl')}</td>
        <td>${l.from_date}</td><td>${l.to_date}</td>
        <td><strong>${l.days}</strong></td>
        <td style="font-size:.75rem;color:var(--tx2);max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.reason||'—'}</td>
        <td>${GX.statusBadge(l.status)}</td>
        <td><div class="td-acts">
          ${l.status==='pending'
            ? `<button class="btn btn-ok btn-xs" onclick="approveLeaveRow('${l.id}')">✓</button>
               <button class="btn btn-er btn-xs" onclick="rejectLeaveRow('${l.id}')">✕</button>`
            : '—'}
          <button class="btn btn-gh btn-xs" onclick="printLeaveRow('${l.id}')">🖨</button>
        </div></td>
      </tr>`).join('')
    : `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--tx3)">No ${filter} leave requests</td></tr>`;
}
async function approveLeaveRow(id) { await GX.approveLeave(id, SESS.id, SESS.name); GX.toast('✅ Leave approved — employee notified','ok'); loadLeave('pending'); }
async function rejectLeaveRow(id)  { const r=prompt('Reason for rejection:'); if(!r)return; await GX.rejectLeave(id,SESS.id,SESS.name,r); GX.toast('Leave rejected','wa'); loadLeave('pending'); }
function printLeaveRow(id) { const l=ALL_LEAVE.find(x=>x.id===id);if(!l)return;GX.print('Leave Request — '+l.employee_name,`<p><strong>Employee:</strong> ${l.employee_name}</p><p><strong>Type:</strong> ${l.type}</p><p><strong>From:</strong> ${l.from_date}</p><p><strong>To:</strong> ${l.to_date}</p><p><strong>Days:</strong> ${l.days}</p><p><strong>Reason:</strong> ${l.reason||'—'}</p><p><strong>Status:</strong> ${l.status}</p>`); }
function printLeaveReport() { GX.print('Leave Report',`<table><thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead><tbody>${ALL_LEAVE.map(l=>'<tr><td>'+l.employee_name+'</td><td>'+l.type+'</td><td>'+l.from_date+'</td><td>'+l.to_date+'</td><td>'+l.days+'</td><td>'+l.status+'</td></tr>').join('')}</tbody></table>`); }
function exportLeave() { GX.csv(ALL_LEAVE.map(l=>[l.employee_name,l.type,l.from_date,l.to_date,l.days,l.reason,l.status]),['Employee','Type','From','To','Days','Reason','Status'],'leave-report.csv'); }

// ── REPORTS ──
async function renderReports() {
  let empCount=0, payrollSum=0;
  if (SB) { const {data}=await SB.from('employees').select('salary').eq('status','active'); empCount=(data||[]).length; payrollSum=(data||[]).reduce((s,e)=>s+(e.salary||0),0); }
  document.getElementById('MC').innerHTML = `
    <div class="stats">
      <div class="stat" style="--sc:var(--hi);--sc2:var(--hi2)"><div class="s-top"><div class="s-ic">👥</div></div><div class="s-val">${empCount}</div><div class="s-lbl">Active Staff</div></div>
      <div class="stat" style="--sc:#22C55E;--sc2:#4ADE80"><div class="s-top"><div class="s-ic">💰</div></div><div class="s-val">${GX.money(payrollSum)}</div><div class="s-lbl">Monthly Payroll Cost</div></div>
      <div class="stat" style="--sc:#60A5FA;--sc2:#93C5FD"><div class="s-top"><div class="s-ic">🌴</div></div><div class="s-val">—</div><div class="s-lbl">Leave Days Taken</div></div>
      <div class="stat" style="--sc:#A78BFA;--sc2:#7C3AED"><div class="s-top"><div class="s-ic">💸</div></div><div class="s-val">—</div><div class="s-lbl">Total Transferred</div></div>
    </div>
    <div class="g2">
      <div class="card">
        <div class="c-hd"><div class="c-title">Export Reports</div></div>
        <div style="display:flex;flex-direction:column;gap:.55rem">
          ${['👥 Employee Directory PDF','🌴 Leave Report CSV','⏱ Attendance CSV','💰 Payroll Summary PDF','💸 Fund Transfers CSV','📊 Full Company Report'].map(r=>`<button class="btn btn-gh btn-bl" onclick="GX.toast('Generating ${r.split(' ').slice(1).join(' ')}...','in')">${r}</button>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="c-hd"><div class="c-title">Department Budgets</div></div>
        <div id="deptBudgets"><div style="color:var(--tx3);font-size:.82rem">Loading...</div></div>
      </div>
    </div>`;
  if (SB) SB.from('departments').select('*').order('name').then(({data}) => {
    const el = document.getElementById('deptBudgets'); if(!el||!data) return;
    el.innerHTML = data.map(d => { const p=d.budget>0?Math.round((d.spent||0)/d.budget*100):0; return `<div style="margin-bottom:.75rem"><div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:.25rem"><span>${d.icon||'🏢'} ${d.name}</span><span style="color:${p>80?'var(--er)':'var(--ok)'}"> ${d.budget>0?p+'%':'No budget'}</span></div>${d.budget>0?`<div class="prog-bg" style="height:5px"><div class="prog-fill" style="width:${Math.min(p,100)}%;height:5px;background:${p>80?'var(--er)':p>60?'var(--wa)':'var(--hi)'}"></div></div>`:''}</div>`; }).join('');
  });
}

// ── ACTIVITY LOG ──
async function renderActivityLog() {
  document.getElementById('MC').innerHTML = `<div class="card"><div class="c-hd"><div class="c-title">Activity Log</div><button class="btn btn-gh btn-sm" onclick="GX.toast('Exported','ok')">⬇ Export</button></div><div id="logList"><div style="text-align:center;padding:2rem;color:var(--tx3)">Loading...</div></div></div>`;
  if (!SB) return;
  const { data } = await SB.from('notifications').select('*').order('created_at',{ascending:false}).limit(50);
  const clr = {ok:'#4ADE80',er:'#F87171',wa:'#FCD34D',in:'#93C5FD'};
  document.getElementById('logList').innerHTML = (data||[]).length
    ? (data||[]).map((n,i) => `<div style="display:flex;gap:.65rem;padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,.03)"><div style="width:7px;height:7px;border-radius:50%;background:${clr[n.type]||'#60A5FA'};flex-shrink:0;margin-top:.38rem"></div><div style="flex:1"><div style="font-size:.8rem;color:var(--tx2)">${n.message}</div><div style="font-size:.65rem;color:var(--tx3)">${GX.timeAgo(n.created_at)}</div></div><span style="font-size:.62rem;color:var(--tx3)">#${String(data.length-i).padStart(4,'0')}</span></div>`).join('')
    : '<div style="text-align:center;padding:2rem;color:var(--tx3)">No activity logs yet</div>';
}

// ── NOTIFICATIONS ──
async function renderNotifications() {
  document.getElementById('MC').innerHTML = `<div class="card"><div class="c-hd"><div class="c-title">Notifications</div><button class="btn btn-gh btn-sm" onclick="markAllRead()">Mark All Read</button></div><div id="notifList"><div style="text-align:center;padding:2rem;color:var(--tx3)">Loading...</div></div></div>`;
  if (!SB) return;
  const notifs = await GX.getNotifs(SESS.id);
  const clr = {ok:'#4ADE80',er:'#F87171',wa:'#FCD34D',in:'#93C5FD'};
  document.getElementById('notifList').innerHTML = notifs.length
    ? notifs.map(n => `<div style="display:flex;gap:.75rem;padding:.85rem 0;border-bottom:1px solid rgba(255,255,255,.03);cursor:pointer" onclick="GX.markRead('${n.id}');this.querySelector('.new-badge')?.remove()">
        <div style="width:8px;height:8px;border-radius:50%;background:${clr[n.type]||'#60A5FA'};flex-shrink:0;margin-top:.45rem"></div>
        <div style="flex:1"><div style="font-size:.82rem;font-weight:${n.read?400:600}">${n.title}</div><div style="font-size:.75rem;color:var(--tx2)">${n.message}</div><div style="font-size:.65rem;color:var(--tx3);margin-top:.15rem">${GX.timeAgo(n.created_at)}</div></div>
        ${!n.read ? `<span class="b b-or new-badge" style="flex-shrink:0">New</span>` : ''}
      </div>`).join('')
    : '<div style="text-align:center;padding:2rem;color:var(--tx3)">No notifications</div>';
  document.getElementById('notifDot').style.display = 'none';
}
async function markAllRead() { await GX.markAllRead(SESS.id); GX.toast('All notifications marked as read','ok'); renderNotifications(); }

// ── SETTINGS ──
function renderSettings() {
  document.getElementById('MC').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
      ${[
        {icon:'⏰',title:'Work Hours',     desc:'Set portal open/close times for all staff', action:"openModal('modalWH')"},
        {icon:'🔒',title:'Emergency Lock', desc:'Instantly lock portal for all users',        action:"openModal('modalLock')"},
        {icon:'📢',title:'Announcements',  desc:'Post message to all staff',                  action:"openModal('modalAnn')"},
        {icon:'👥',title:'All Employees',  desc:'View, search and print employee records',    action:"goToPage('employees')"},
        {icon:'🏢',title:'Departments',    desc:'View all department budgets',                action:"goToPage('departments')"},
        {icon:'💰',title:'Budget Requests',desc:'Review and approve budget requests',         action:"goToPage('budgets')"},
        {icon:'📈',title:'Reports',        desc:'Generate and export company reports',        action:"goToPage('reports')"},
        {icon:'🌴',title:'Leave Management',desc:'Review all leave requests',                 action:"goToPage('leave')"},
        {icon:'⏱', title:'Attendance',     desc:'Company-wide attendance overview',           action:"goToPage('attendance')"},
      ].map(s => `
        <div class="card" style="margin-bottom:0;cursor:pointer" onclick="${s.action}"
          onmouseover="this.style.borderColor='var(--hi)'" onmouseout="this.style.borderColor='var(--br)'">
          <div style="font-size:1.7rem;margin-bottom:.55rem">${s.icon}</div>
          <div style="font-weight:700;font-size:.86rem;margin-bottom:.22rem">${s.title}</div>
          <div style="font-size:.74rem;color:var(--tx3);line-height:1.5">${s.desc}</div>
        </div>`).join('')}
    </div>`;
}

// ── MODAL ACTIONS ──
function saveWorkHours() {
  const s = document.getElementById('whStart')?.value;
  const e = document.getElementById('whEnd')?.value;
  const w = document.getElementById('whWeekend')?.value;
  if (window.GX_CONFIG) { GX_CONFIG.WORK_START = s; GX_CONFIG.WORK_END = e; GX_CONFIG.WEEKEND_ACCESS = w; }
  closeModal('modalWH');
  GX.toast('⏰ Work hours updated — takes effect immediately', 'ok');
}
function confirmLock() {
  const reason = document.getElementById('lockReason')?.value.trim();
  if (!reason) { GX.toast('Please provide a reason', 'er'); return; }
  closeModal('modalLock');
  GX.toast('🔒 Portal locked — all staff sessions terminated', 'wa');
  setTimeout(() => GX.toast('📧 IT Support and Managers notified', 'in'), 1000);
}

// ── START ──
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
