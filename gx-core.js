// ═══════════════════════════════════════════════════════════
//  GX-CORE.JS — Giddies Express Core Engine
//  Handles: Auth, Session, UI, DB helpers, Realtime
//  Include AFTER: supabase CDN and config.js
// ═══════════════════════════════════════════════════════════

const GX = {

  // ── INTERNAL ──
  _sb: null,
  _chatCh: null,

  // ── SUPABASE ──
  sb() {
    if (this._sb) return this._sb;
    if (!window.GX_CONFIG?.IS_LIVE || typeof supabase === 'undefined') return null;
    this._sb = supabase.createClient(GX_CONFIG.SUPABASE_URL, GX_CONFIG.SUPABASE_KEY);
    return this._sb;
  },

  // ── SESSION — uses localStorage so it persists across pages ──
  getSess() {
    try {
      const d = JSON.parse(localStorage.getItem('gx_v3') || 'null');
      if (d && Date.now() - d.loginTime < 28800000) return d; // 8 hours
      localStorage.removeItem('gx_v3');
      return null;
    } catch(e) { return null; }
  },
  saveSess(user) {
    const s = { ...user, loginTime: Date.now() };
    localStorage.setItem('gx_v3', JSON.stringify(s));
    this.presenceSet(s);
    return s;
  },
  clearSess() {
    const s = this.getSess();
    if (s) this.presenceDel(s.email);
    localStorage.removeItem('gx_v3');
  },
  logout() {
    this.clearSess();
    const sb = this.sb();
    if (sb) sb.auth.signOut().catch(() => {});
    window.location.href = 'giddyexpress-login.html';
  },
  requireAuth(roles) {
    const s = this.getSess();
    if (!s) { window.location.href = 'giddyexpress-login.html'; return null; }
    if (roles?.length && !roles.includes(s.role)) { window.location.href = 'giddyexpress-login.html'; return null; }
    this.presenceSet(s);
    return s;
  },

  // ── LOGIN ──
  async login(email, password) {
    const sb = this.sb();
    if (!sb) return { error: 'Portal not connected. Contact IT Support.' };
    const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
    if (authErr) return { error: 'Invalid email or password.' };
    const { data: profile, error: profErr } = await sb.from('employees').select('*').eq('email', email.toLowerCase().trim()).single();
    if (profErr || !profile) return { error: 'Account not found in employee records. Contact HR or IT.' };
    if (profile.status === 'terminated') return { error: 'Your account has been terminated. Contact HR.' };
    if (profile.status === 'suspended')  return { error: 'Your account is suspended. Contact your manager.' };
    const user = { ...profile, supabaseId: auth.user.id };
    this.saveSess(user);
    return { user };
  },

  // ── ROUTING ──
  routeUser(user) {
    const ROUTES = { admin:'giddyexpress-admin.html', manager:'giddyexpress-manager.html', dept_manager:'giddyexpress-dept.html', employee:'giddyexpress-employee.html' };
    const DEPT = { 'HR':'giddyexpress-hr.html', 'Finance':'giddyexpress-finance.html', 'IT Support':'giddyexpress-it.html', 'Payroll':'giddyexpress-payroll.html' };
    window.location.href = (user.role === 'dept_manager' && DEPT[user.department]) ? DEPT[user.department] : (ROUTES[user.role] || ROUTES.employee);
  },

  // ── NIGERIA TIME ──
  now() { return new Date(new Date().toLocaleString('en-US', { timeZone: GX_CONFIG?.TIMEZONE || 'Africa/Lagos' })); },
  today() { return new Date().toISOString().slice(0, 10); },
  timeStr() { const n = this.now(); return String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0'); },

  // ── CLOCK ──
  startClock() {
    const tick = () => {
      const el = document.getElementById('tbClock'); if (!el) return;
      const n = this.now();
      el.textContent = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0') + ':' + String(n.getSeconds()).padStart(2,'0');
    };
    tick(); setInterval(tick, 1000);
  },

  // ── WORK HOURS WARNING ──
  watchHours() {
    const s = this.getSess();
    if (!s || ['admin','manager'].includes(s.role)) return;
    const [eh, em] = (GX_CONFIG?.WORK_END || '17:00').split(':').map(Number);
    setInterval(() => {
      const n = this.now();
      const nowM = n.getHours() * 60 + n.getMinutes(), endM = eh * 60 + em, left = endM - nowM;
      if ([30,15,5,1].includes(left) && n.getSeconds() < 5) this.toast('⏰ Portal closes in ' + left + ' min! Save your work.', 'wa');
      if (nowM >= endM && n.getSeconds() < 5) { this.toast('Portal closed. Logging out...', 'wa'); setTimeout(() => this.logout(), 2000); }
    }, 5000);
  },

  // ── PRESENCE ──
  presenceSet(u) {
    try { const p = JSON.parse(localStorage.getItem('gx_pr') || '{}'); p[u.email] = { name:u.name, role:u.role, dept:u.department||'', ts:Date.now() }; localStorage.setItem('gx_pr', JSON.stringify(p)); } catch(e) {}
  },
  presenceDel(email) {
    try { const p = JSON.parse(localStorage.getItem('gx_pr') || '{}'); delete p[email]; localStorage.setItem('gx_pr', JSON.stringify(p)); } catch(e) {}
  },
  online() {
    try { return Object.values(JSON.parse(localStorage.getItem('gx_pr') || '{}')).filter(v => Date.now() - v.ts < 45000); } catch(e) { return []; }
  },
  startPresence() {
    const s = this.getSess(); if (!s) return;
    this.presenceSet(s);
    setInterval(() => {
      const ss = this.getSess(); if (!ss) return;
      this.presenceSet(ss);
      const el = document.getElementById('onlineCount');
      if (el) el.textContent = this.online().length + ' online';
    }, 12000);
  },

  // ── TOAST ──
  toast(msg, type) {
    type = type || 'in';
    let w = document.getElementById('gx-toasts');
    if (!w) { w = document.createElement('div'); w.id = 'gx-toasts'; w.className = 'toast-wrap'; document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
    w.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3800);
  },

  // ── MODALS ──
  openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); else console.warn('Modal not found:', id); },
  closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); },

  // ── TABS ──
  setTab(btn, sel) {
    const p = btn.closest(sel || '.tabs'); if (!p) return;
    p.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    btn.classList.add('on');
  },

  // ── HELPERS ──
  money: n => '₦' + (n || 0).toLocaleString(),
  initials: n => (n || '?').split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase(),
  timeAgo(d) {
    if (!d) return '';
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  },
  badge: (t, c) => `<span class="b ${c || 'b-gy'}">${t}</span>`,
  statusBadge(s) {
    const m = { active:'b-ok',pending:'b-wa',approved:'b-ok',rejected:'b-er',open:'b-or',resolved:'b-ok',done:'b-ok',overdue:'b-er','in-progress':'b-bl',present:'b-ok',late:'b-wa',absent:'b-er',high:'b-or',urgent:'b-er',medium:'b-wa',low:'b-gy',suspended:'b-er',terminated:'b-er' };
    return `<span class="b ${m[s] || 'b-gy'}">${s}</span>`;
  },
  avColor(n) {
    const c = ['#FF6B00','#F472B6','#60A5FA','#4ADE80','#A78BFA','#FB923C','#34D399','#2DD4BF','#E879F9'];
    let h = 0; for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
    return c[Math.abs(h) % c.length];
  },
  av(name, color, size) {
    const s = size || '28px', c = color || this.avColor(name);
    return `<div class="av" style="width:${s};height:${s};background:${c};font-size:calc(${s} * 0.36)">${this.initials(name)}</div>`;
  },

  // ── PRINT ──
  print(title, html) {
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(`<!DOCTYPE html><html><head><title>${title} — Giddies Express</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:2rem;color:#111;font-size:12px}
      .ph{display:flex;justify-content:space-between;border-bottom:3px solid #FF6B00;padding-bottom:1rem;margin-bottom:1.5rem}
      .ph h1{font-size:1.3rem;color:#FF6B00;font-family:Arial,sans-serif}
      table{width:100%;border-collapse:collapse;margin:1rem 0}
      th{background:#FF6B00;color:#fff;padding:.4rem .7rem;text-align:left;font-size:.7rem;text-transform:uppercase}
      td{padding:.45rem .7rem;border-bottom:1px solid #eee}
      tr:nth-child(even) td{background:#f9f9f9}
      .pf{margin-top:1.5rem;padding-top:.75rem;border-top:1px solid #ddd;font-size:.7rem;color:#888;display:flex;justify-content:space-between}
      .ok{color:#166534} .er{color:#991b1b} .wa{color:#854d0e}
    </style></head><body>
    <div class="ph">
      <div><h1>Giddies Express</h1><p style="margin-top:.2rem;font-size:.8rem">${title}</p></div>
      <div style="text-align:right;font-size:.75rem;color:#888">
        Generated: ${new Date().toLocaleString('en-NG')}<br>
        <strong>Strictly Confidential</strong>
      </div>
    </div>
    ${html}
    <div class="pf"><span>Giddies Express Staff Portal</span><span>${new Date().toLocaleDateString('en-NG')}</span></div>
    <script>window.onload = () => window.print();<\/script>
    </body></html>`);
    w.document.close();
  },

  // ── CSV EXPORT ──
  csv(rows, headers, filename) {
    const csv = [headers.join(','), ...rows.map(r => r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = filename || 'export.csv';
    a.click();
    this.toast('Exported: ' + filename, 'ok');
  },

  // ── DB: EMPLOYEES ──
  async getEmployees(filters) {
    const sb = this.sb(); if (!sb) return [];
    let q = sb.from('employees').select('*').order('name');
    if (filters?.dept)   q = q.eq('department', filters.dept);
    if (filters?.role)   q = q.eq('role', filters.role);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data } = await q; return data || [];
  },
  async updateEmployee(id, updates) {
    const sb = this.sb(); if (!sb) return { error: 'Not connected' };
    return await sb.from('employees').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  },

  // ── DB: ATTENDANCE ──
  async clockIn(empId) {
    const sb = this.sb();
    const n = this.now();
    const time = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
    const status = n.getHours() * 60 + n.getMinutes() > 8 * 60 + 10 ? 'late' : 'present';
    if (sb) await sb.from('attendance').upsert({ employee_id:empId, date:this.today(), clock_in:time, status }, { onConflict:'employee_id,date' });
    return { time, status };
  },
  async clockOut(empId) {
    const sb = this.sb();
    const n = this.now();
    const time = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
    if (sb) await sb.from('attendance').update({ clock_out:time }).eq('employee_id', empId).eq('date', this.today());
    return { time };
  },
  async getAttendance(filters) {
    const sb = this.sb(); if (!sb) return [];
    let q = sb.from('attendance').select('*, employees(name,department,color)').order('date', { ascending:false });
    if (filters?.empId) q = q.eq('employee_id', filters.empId);
    if (filters?.date)  q = q.eq('date', filters.date);
    if (filters?.limit) q = q.limit(filters.limit);
    const { data } = await q; return data || [];
  },

  // ── DB: NOTIFICATIONS ──
  async notify(empId, title, msg, type) {
    const sb = this.sb(); if (!sb || !empId) return;
    await sb.from('notifications').insert({ employee_id:empId, title, message:msg, type:type||'in' });
  },
  async getNotifs(empId) {
    const sb = this.sb(); if (!sb) return [];
    const { data } = await sb.from('notifications').select('*').eq('employee_id', empId).order('created_at', { ascending:false }).limit(30);
    return data || [];
  },
  async markRead(id) { const sb = this.sb(); if (!sb) return; await sb.from('notifications').update({ read:true }).eq('id', id); },
  async markAllRead(empId) { const sb = this.sb(); if (!sb) return; await sb.from('notifications').update({ read:true }).eq('employee_id', empId).eq('read', false); },
  subscribeNotifs(empId, cb) {
    const sb = this.sb(); if (!sb) return null;
    return sb.channel('ntf:'+empId).on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:'employee_id=eq.'+empId }, p => cb(p.new)).subscribe();
  },

  // ── DB: ANNOUNCEMENTS ──
  async getAnnouncements(dept) {
    const sb = this.sb(); if (!sb) return [];
    let q = sb.from('announcements').select('*').order('created_at', { ascending:false }).limit(20);
    if (dept && dept !== 'all') q = q.or('department.eq.all,department.eq.' + dept);
    const { data } = await q; return data || [];
  },
  async postAnnouncement(a) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    return await sb.from('announcements').insert({ title:a.title, body:a.body, type:a.type||'info', department:a.dept||'all', posted_by:a.postedBy, poster_name:a.posterName }).select().single();
  },

  // ── DB: MESSAGES / CHAT ──
  async getMessages(roomId, limit) {
    const sb = this.sb(); if (!sb) return [];
    const { data } = await sb.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending:true }).limit(limit || 60);
    return data || [];
  },
  async sendMessage(roomId, content, senderId, senderName) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    return await sb.from('messages').insert({ room_id:roomId, content, sender_id:senderId, sender_name:senderName, sender_avatar:this.initials(senderName) }).select().single();
  },
  subscribeRoom(roomId, cb) {
    const sb = this.sb(); if (!sb) return null;
    if (this._chatCh) this._chatCh.unsubscribe();
    this._chatCh = sb.channel('rm:'+roomId).on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:'room_id=eq.'+roomId }, p => cb(p.new)).subscribe();
    return this._chatCh;
  },

  // ── DB: LEAVE ──
  async submitLeave(l) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    const { data, error } = await sb.from('leave_requests').insert({ employee_id:l.empId, employee_name:l.name, type:l.type, from_date:l.from, to_date:l.to, days:l.days, reason:l.reason, status:'pending' }).select().single();
    if (!error) {
      // Notify dept manager
      const { data:mgr } = await sb.from('employees').select('id').eq('department', l.dept).eq('role', 'dept_manager').single();
      if (mgr) await this.notify(mgr.id, '🌴 Leave Request', l.name + ' submitted ' + l.type + ' leave for ' + l.days + ' day(s)', 'in');
    }
    return { data, error };
  },
  async getLeave(filters) {
    const sb = this.sb(); if (!sb) return [];
    let q = sb.from('leave_requests').select('*').order('created_at', { ascending:false });
    if (filters?.empId)  q = q.eq('employee_id', filters.empId);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.dept)   q = q.eq('employee_dept', filters.dept);
    const { data } = await q; return data || [];
  },
  async approveLeave(id, appId, appName) {
    const sb = this.sb(); if (!sb) return;
    const { data } = await sb.from('leave_requests').update({ status:'approved', approved_by:appId, approver_name:appName }).eq('id', id).select().single();
    if (data) await this.notify(data.employee_id, '✅ Leave Approved', 'Your leave was approved by ' + appName, 'ok');
  },
  async rejectLeave(id, appId, appName, reason) {
    const sb = this.sb(); if (!sb) return;
    const { data } = await sb.from('leave_requests').update({ status:'rejected', approved_by:appId, approver_name:appName, rejected_reason:reason }).eq('id', id).select().single();
    if (data) await this.notify(data.employee_id, '❌ Leave Rejected', 'Reason: ' + (reason || 'See your manager'), 'er');
  },

  // ── DB: TASKS ──
  async getTasks(filters) {
    const sb = this.sb(); if (!sb) return [];
    let q = sb.from('tasks').select('*').order('created_at', { ascending:false });
    if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo);
    if (filters?.dept)       q = q.eq('department', filters.dept);
    if (filters?.status)     q = q.eq('status', filters.status);
    const { data } = await q; return data || [];
  },
  async createTask(t) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    const { data, error } = await sb.from('tasks').insert({ title:t.title, description:t.desc||'', assigned_to:t.assignedTo, assigned_to_name:t.assignedToName, assigned_by:t.assignedBy, assigned_by_name:t.assignedByName, department:t.dept, due_date:t.due, priority:t.priority||'medium', status:'pending' }).select().single();
    if (!error) await this.notify(t.assignedTo, '📋 New Task', t.assignedByName + ' assigned: ' + t.title, 'in');
    return { data, error };
  },
  async updateTask(id, status, note) {
    const sb = this.sb(); if (!sb) return;
    await sb.from('tasks').update({ status, progress_note:note||'', updated_at:new Date().toISOString() }).eq('id', id);
  },

  // ── DB: BUDGET REQUESTS (new — manager submits, admin approves) ──
  async submitBudgetRequest(req) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    const { data, error } = await sb.from('budget_requests').insert({
      department: req.dept, title: req.title, amount: req.amount,
      reason: req.reason, submitted_by: req.submittedBy,
      submitter_name: req.submitterName, status: 'pending'
    }).select().single();
    if (!error) {
      // Notify admin
      const { data: admin } = await sb.from('employees').select('id').eq('role', 'admin').single();
      if (admin) await this.notify(admin.id, '💰 Budget Request', req.submitterName + ' requested ₦' + (req.amount||0).toLocaleString() + ' for ' + req.dept, 'wa');
    }
    return { data, error };
  },
  async approveBudget(id, appId, appName) {
    const sb = this.sb(); if (!sb) return;
    const { data } = await sb.from('budget_requests').update({ status:'approved', approved_by:appId, approver_name:appName }).eq('id', id).select().single();
    if (data) {
      await this.notify(data.submitted_by, '✅ Budget Approved', 'Your budget request of ₦' + (data.amount||0).toLocaleString() + ' for ' + data.department + ' was approved by ' + appName, 'ok');
      // Notify finance to process
      const { data: fin } = await sb.from('employees').select('id').eq('department', 'Finance').eq('role', 'dept_manager').single();
      if (fin) await this.notify(fin.id, '💰 Budget Approved', appName + ' approved ₦' + (data.amount||0).toLocaleString() + ' budget for ' + data.department + '. Please process.', 'in');
    }
  },

  // ── DB: SPENDING REQUESTS (dept submits request before spending) ──
  async submitSpendingRequest(req) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    const { data, error } = await sb.from('spending_requests').insert({
      department: req.dept, title: req.title, amount: req.amount,
      vendor: req.vendor, reason: req.reason,
      submitted_by: req.submittedBy, submitter_name: req.submitterName, status: 'pending'
    }).select().single();
    if (!error) {
      // Notify dept manager and company manager
      const { data: mgrs } = await sb.from('employees').select('id').eq('role', 'manager');
      for (const m of (mgrs || [])) await this.notify(m.id, '💸 Spending Request', req.submitterName + ' requests ₦' + (req.amount||0).toLocaleString() + ' — ' + req.title, 'wa');
    }
    return { data, error };
  },

  // ── DB: FUND TRANSFERS (Finance sends to depts incl. Payroll) ──
  async sendFunds(amount, toDept, fromId, fromName, note, type) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    const ref = 'TRF-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
    const { data, error } = await sb.from('fund_transfers').insert({
      amount, from_dept:'Finance', to_dept:toDept, sent_by:fromId,
      sent_by_name:fromName, note, reference:ref, status:'pending', type:type||'budget_funding'
    }).select().single();
    if (!error) {
      // Notify receiving dept manager
      const { data: recv } = await sb.from('employees').select('id').eq('department', toDept).eq('role', 'dept_manager').single();
      if (recv) await this.notify(recv.id, '💰 Funds Incoming', 'Finance is sending ₦' + (amount||0).toLocaleString() + ' to ' + toDept + '. Ref: ' + ref, 'ok');
      // Notify managers for approval
      const { data: mgrs } = await sb.from('employees').select('id').eq('role', 'manager');
      for (const m of (mgrs || [])) await this.notify(m.id, '💸 Transfer Needs Approval', 'Finance → ' + toDept + ': ₦' + (amount||0).toLocaleString() + '. Approve it.', 'wa');
    }
    return { data, error, ref };
  },
  async approveTransfer(id, appId, appName) {
    const sb = this.sb(); if (!sb) return;
    const { data } = await sb.from('fund_transfers').update({ status:'approved', approved_by:appId, approver_name:appName }).eq('id', id).select().single();
    if (data) {
      const { data: recv } = await sb.from('employees').select('id').eq('department', data.to_dept).eq('role', 'dept_manager').single();
      if (recv) await this.notify(recv.id, '✅ Transfer Approved', appName + ' approved ₦' + (data.amount||0).toLocaleString() + ' transfer. Funds available.', 'ok');
    }
  },

  // ── DB: PAYROLL (Payroll processes salaries per employee) ──
  calcPay(gross) {
    const tax = Math.round(gross * 0.20), ni = Math.round(gross * 0.08), pension = Math.round(gross * 0.05), net = gross - tax - ni - pension;
    return { gross, tax, ni, pension, net };
  },
  async processPayroll(empId, empName, gross, period, payrollMgrId) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    const p = this.calcPay(gross);
    const { data, error } = await sb.from('payroll_records').upsert({ employee_id:empId, period, ...p, status:'processing' }, { onConflict:'employee_id,period' }).select().single();
    // Notify employee
    if (!error) await this.notify(empId, '💰 Payslip Ready', 'Your ' + period + ' payslip is ready. Net: ₦' + p.net.toLocaleString(), 'ok');
    return { data, error };
  },

  // ── DB: HR HIRE FLOW ──
  async approveHire(appId, approverId, approverName) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    const { data, error } = await sb.from('job_applications').update({ status:'approved', approved_by:approverId, approver_name:approverName }).eq('id', appId).select().single();
    if (!error && data) {
      // 1. Notify HR to onboard
      const { data: hrs } = await sb.from('employees').select('id').eq('department','HR').eq('role','dept_manager');
      for (const h of (hrs || [])) await this.notify(h.id, '✅ Hire Approved', approverName + ' approved ' + data.full_name + ' for ' + data.role_applied + '. Begin onboarding.', 'ok');
      // 2. Notify destination dept head
      if (data.department) {
        const { data: dh } = await sb.from('employees').select('id').eq('department', data.department).eq('role','dept_manager').single();
        if (dh) await this.notify(dh.id, '👤 New Member Approved', data.full_name + ' (' + data.role_applied + ') will be joining your team. HR is onboarding them.', 'in');
      }
      // 3. Notify Finance about new payroll
      const { data: fin } = await sb.from('employees').select('id').eq('department','Finance').eq('role','dept_manager').single();
      if (fin) await this.notify(fin.id, '👤 New Employee', 'New hire approved: ' + data.full_name + '. Ensure payroll budget is updated for ' + data.department + '.', 'wa');
    }
    return { data, error };
  },

  // ── DB: TICKETS & SUPPLIES ──
  async submitTicket(t) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    const { data, error } = await sb.from('it_tickets').insert({ subject:t.subject, description:t.desc, submitted_by:t.submittedBy, submitter_name:t.submitterName, priority:t.priority||'medium', status:'open' }).select().single();
    if (!error) {
      const { data: it } = await sb.from('employees').select('id').eq('department','IT Support').eq('role','dept_manager').single();
      if (it) await this.notify(it.id, '🎫 New Ticket', t.submitterName + ': ' + t.subject, 'in');
    }
    return { data, error };
  },
  async submitSupply(r) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    return await sb.from('supply_requests').insert({ item_name:r.item, quantity:r.qty||1, reason:r.reason, department:r.dept, requested_by:r.reqBy, requester_name:r.reqName, urgency:r.urgency||'Normal', status:'pending' }).select().single();
  },

  // ── DB: JOB APPLICATIONS ──
  async submitApplication(app) {
    const sb = this.sb(); if (!sb) return { error:'Not connected' };
    const ref = 'GX-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const { data, error } = await sb.from('job_applications').insert({ ...app, reference_no:ref, status:'pending' }).select().single();
    if (!error) {
      const { data: hrs } = await sb.from('employees').select('id').eq('department','HR').eq('role','dept_manager');
      for (const h of (hrs || [])) await this.notify(h.id, '📋 New Application', app.full_name + ' applied for ' + app.role_applied, 'in');
    }
    return { data, error, ref };
  },

  // ── PAGE INIT ──
  async initDashboard(opts) {
    opts = opts || {};
    const sess = this.requireAuth(opts.roles);
    if (!sess) return null;
    // Update sidebar
    const av = document.getElementById('sbAv');
    const nm = document.getElementById('sbName');
    const rl = document.getElementById('sbRole');
    if (av) av.textContent = this.initials(sess.name);
    if (nm) nm.textContent = sess.name;
    if (rl) rl.textContent = (sess.role || '').replace(/_/g, ' ');
    // Start utils
    this.startClock();
    this.startPresence();
    this.watchHours();
    const el = document.getElementById('onlineCount');
    if (el) el.textContent = this.online().length + ' online';
    // Notification badge
    const sb = this.sb();
    if (sb) {
      const { data } = await sb.from('notifications').select('id').eq('employee_id', sess.id).eq('read', false);
      if (data?.length) { const dot = document.getElementById('notifDot'); if (dot) dot.style.display = 'block'; }
      this.subscribeNotifs(sess.id, n => {
        const dot = document.getElementById('notifDot'); if (dot) dot.style.display = 'block';
        this.toast(n.title + ': ' + n.message, n.type || 'in');
      });
    }
    return sess;
  },
};

// ── GLOBAL SHORTCUTS ──
function toast(m, t)    { GX.toast(m, t); }
function openModal(id)  { GX.openModal(id); }
function closeModal(id) { GX.closeModal(id); }
function setTab(b, s)   { GX.setTab(b, s); }
document.addEventListener('click', e => { if (e.target?.classList.contains('overlay')) e.target.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')); });
