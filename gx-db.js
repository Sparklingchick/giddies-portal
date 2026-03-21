const GXDb = (() => {
  function sb() { return GXAuth.getSB(); }
  async function getEmployees(filters) {
    filters = filters || {};
    if (!sb()) return [];
    let q = sb().from('employees').select('*').order('name');
    if (filters.department) q = q.eq('department', filters.department);
    if (filters.role) q = q.eq('role', filters.role);
    if (filters.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  }
  async function getEmployee(id) {
    if (!sb()) return null;
    const { data } = await sb().from('employees').select('*').eq('id', id).single();
    return data;
  }
  async function getEmployeeByEmail(email) {
    if (!sb()) return null;
    const { data } = await sb().from('employees').select('*').eq('email', email.toLowerCase()).single();
    return data;
  }
  async function createEmployee(emp) {
    if (!sb()) return { error: 'No database connection' };
    const { data, error } = await sb().from('employees').insert({
      name: emp.name, email: emp.email.toLowerCase(),
      role: emp.role || 'employee', department: emp.department,
      title: emp.title, salary: emp.salary || 0,
      contract_type: emp.contract_type || 'Permanent',
      join_date: emp.join_date || new Date().toISOString().slice(0,10),
      status: 'active', color: emp.color || '#60A5FA',
      avatar: emp.avatar || emp.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(),
    }).select().single();
    return { data, error };
  }
  async function updateEmployee(id, updates) {
    if (!sb()) return { error: 'No database connection' };
    const { data, error } = await sb().from('employees').update({...updates, updated_at: new Date().toISOString()}).eq('id', id).select().single();
    return { data, error };
  }
  async function terminateEmployee(id, reason) {
    if (!sb()) return { error: 'No database connection' };
    const { data, error } = await sb().from('employees').update({ status: 'terminated', termination_reason: reason }).eq('id', id);
    return { data, error };
  }
  async function clockIn(employeeId) {
    if (!sb()) {
      const t = GXAuth.getNigeriaTime().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return { data: null, error: null, time: t, status: 'present' };
    }
    const today = new Date().toISOString().slice(0,10);
    const n = GXAuth.getNigeriaTime();
    const time = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
    const [sh, sm] = GX_CONFIG.WORK_START.split(':').map(Number);
    const nowM = n.getHours() * 60 + n.getMinutes();
    const status = nowM > sh * 60 + sm + 10 ? 'late' : 'present';
    const { data, error } = await sb().from('attendance').upsert({
      employee_id: employeeId, date: today, clock_in: time, status
    }, { onConflict: 'employee_id,date' }).select().single();
    return { data, error, time, status };
  }
  async function clockOut(employeeId) {
    if (!sb()) {
      const t = GXAuth.getNigeriaTime().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return { data: null, error: null, time: t };
    }
    const today = new Date().toISOString().slice(0,10);
    const n = GXAuth.getNigeriaTime();
    const time = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
    const { data, error } = await sb().from('attendance').update({ clock_out: time }).eq('employee_id', employeeId).eq('date', today).select().single();
    return { data, error, time };
  }
  async function getAttendance(filters) {
    filters = filters || {};
    if (!sb()) return [];
    let q = sb().from('attendance').select('*, employees(name, department, color, avatar)').order('date', { ascending: false });
    if (filters.employeeId) q = q.eq('employee_id', filters.employeeId);
    if (filters.date) q = q.eq('date', filters.date);
    if (filters.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  }
  async function submitLeave(leave) {
    if (!sb()) return { data: { ...leave, id: 'demo_' + Date.now(), status: 'pending' }, error: null };
    const { data, error } = await sb().from('leave_requests').insert({
      employee_id: leave.employeeId, employee_name: leave.employeeName,
      type: leave.type, from_date: leave.from, to_date: leave.to,
      days: leave.days, reason: leave.reason, status: 'pending',
    }).select().single();
    if (!error) await notifyDeptManager(leave.employeeId, leave.employeeName, 'New Leave Request', leave.employeeName + ' submitted a ' + leave.type + ' leave for ' + leave.days + ' day(s).');
    return { data, error };
  }
  async function getLeaveRequests(filters) {
    filters = filters || {};
    if (!sb()) return [];
    let q = sb().from('leave_requests').select('*, employees(name, department, color, avatar)').order('created_at', { ascending: false });
    if (filters.employeeId) q = q.eq('employee_id', filters.employeeId);
    if (filters.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  }
  async function updateLeaveStatus(id, status, approverId, approverName, rejectedReason) {
    rejectedReason = rejectedReason || '';
    if (!sb()) return { data: { id, status }, error: null };
    const { data, error } = await sb().from('leave_requests')
      .update({ status, approved_by: approverId, approver_name: approverName, rejected_reason: rejectedReason })
      .eq('id', id).select('*, employees(name, email)').single();
    if (!error && data) {
      const msg = status === 'approved'
        ? 'Your leave has been approved by ' + approverName + '.'
        : 'Your leave was rejected. ' + (rejectedReason || '');
      await createNotification(data.employee_id, status === 'approved' ? 'Leave Approved' : 'Leave Rejected', msg, status === 'approved' ? 'ok' : 'er');
    }
    return { data, error };
  }
  async function createTask(task) {
    if (!sb()) return { data: { ...task, id: 'demo_' + Date.now(), status: 'pending' }, error: null };
    const { data, error } = await sb().from('tasks').insert({
      title: task.title, description: task.description || '',
      assigned_to: task.assignedTo, assigned_to_name: task.assignedToName,
      assigned_by: task.assignedBy, assigned_by_name: task.assignedByName,
      department: task.department, due_date: task.dueDate,
      priority: task.priority || 'medium', status: 'pending',
    }).select().single();
    if (!error) await createNotification(task.assignedTo, 'New Task Assigned', task.assignedByName + ' assigned you: ' + task.title, 'in');
    return { data, error };
  }
  async function getTasks(filters) {
    filters = filters || {};
    if (!sb()) return [];
    let q = sb().from('tasks').select('*').order('created_at', { ascending: false });
    if (filters.assignedTo) q = q.eq('assigned_to', filters.assignedTo);
    if (filters.department) q = q.eq('department', filters.department);
    if (filters.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  }
  async function updateTaskStatus(id, status, progressNote) {
    progressNote = progressNote || '';
    if (!sb()) return { data: { id, status }, error: null };
    const { data, error } = await sb().from('tasks').update({ status, progress_note: progressNote, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    return { data, error };
    async function getMessages(roomId, limit) {
    if (!sb()) return [];
    const { data } = await sb().from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(limit || 50);
    return data || [];
  }
  async function sendMessage(roomId, content, senderId, senderName, senderAvatar) {
    if (!sb()) return { data: { room_id: roomId, content, sender_name: senderName, created_at: new Date().toISOString() }, error: null };
    const { data, error } = await sb().from('messages').insert({
      room_id: roomId, content, sender_id: senderId, sender_name: senderName, sender_avatar: senderAvatar || senderName.split(' ').map(n=>n[0]).join('').slice(0,2),
    }).select().single();
    return { data, error };
  }
  function subscribeToMessages(roomId, callback) {
    const s = GXAuth.getSB();
    if (!s) return null;
    return s.channel('chat:' + roomId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'room_id=eq.' + roomId }, payload => { callback(payload.new); }).subscribe();
  }
  async function getAnnouncements(department) {
    if (!sb()) return [];
    let q = sb().from('announcements').select('*').order('created_at', { ascending: false }).limit(20);
    if (department && department !== 'all') q = q.or('department.eq.all,department.eq.' + department);
    const { data } = await q;
    return data || [];
  }
  async function postAnnouncement(ann) {
    if (!sb()) return { data: { ...ann, id: 'demo_' + Date.now() }, error: null };
    const { data, error } = await sb().from('announcements').insert({
      title: ann.title, body: ann.body, type: ann.type || 'info',
      department: ann.department || 'all', posted_by: ann.postedBy, poster_name: ann.posterName,
    }).select().single();
    return { data, error };
  }
  async function reactToAnnouncement(id, reaction) {
    if (!sb()) return { error: null };
    const { data: ann } = await sb().from('announcements').select('reactions').eq('id', id).single();
    if (!ann) return { error: 'Not found' };
    const reactions = ann.reactions || { like: 0, check: 0, seen: 0 };
    reactions[reaction] = (reactions[reaction] || 0) + 1;
    return await sb().from('announcements').update({ reactions }).eq('id', id);
  }
  async function createNotification(employeeId, title, message, type) {
    if (!sb() || !employeeId) return;
    await sb().from('notifications').insert({ employee_id: employeeId, title, message, type: type || 'in' });
  }
  async function getNotifications(employeeId, unreadOnly) {
    if (!sb()) return [];
    let q = sb().from('notifications').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false }).limit(25);
    if (unreadOnly) q = q.eq('read', false);
    const { data } = await q;
    return data || [];
  }
  async function markRead(id) {
    if (!sb()) return;
    await sb().from('notifications').update({ read: true }).eq('id', id);
  }
  async function markAllRead(employeeId) {
    if (!sb()) return;
    await sb().from('notifications').update({ read: true }).eq('employee_id', employeeId).eq('read', false);
  }
  function subscribeToNotifications(employeeId, callback) {
    const s = GXAuth.getSB();
    if (!s) return null;
    return s.channel('notifs:' + employeeId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'employee_id=eq.' + employeeId }, payload => { callback(payload.new); }).subscribe();
  }
  async function fileComplaint(complaint) {
    if (!sb()) return { data: { ...complaint, id: 'demo_' + Date.now(), status: 'open' }, error: null };
    const { data, error } = await sb().from('complaints').insert({
      filed_by: complaint.filedBy, filer_name: complaint.filerName,
      against_employee: complaint.against, against_name: complaint.againstName,
      subject: complaint.subject, detail: complaint.detail, severity: complaint.severity || 'medium', status: 'open',
    }).select().single();
    return { data, error };
  }
  async function getComplaints(filters) {
    filters = filters || {};
    if (!sb()) return [];
    let q = sb().from('complaints').select('*').order('created_at', { ascending: false });
    if (filters.filedBy) q = q.eq('filed_by', filters.filedBy);
    const { data } = await q;
    return data || [];
  }
  async function submitSupplyRequest(req) {
    if (!sb()) return { data: { ...req, id: 'demo_' + Date.now(), status: 'pending' }, error: null };
    const { data, error } = await sb().from('supply_requests').insert({
      item_name: req.item, quantity: req.quantity || 1, reason: req.reason,
      department: req.department, requested_by: req.requestedBy,
      requester_name: req.requesterName, urgency: req.urgency || 'Normal', status: 'pending',
    }).select().single();
    return { data, error };
  }
  async function submitITTicket(ticket) {
    if (!sb()) return { data: { ...ticket, id: 'demo_' + Date.now(), status: 'open' }, error: null };
    const { data, error } = await sb().from('it_tickets').insert({
      subject: ticket.subject, description: ticket.description,
      submitted_by: ticket.submittedBy, submitter_name: ticket.submitterName,
      priority: ticket.priority || 'medium', status: 'open',
    }).select().single();
    return { data, error };
  }
  async function getITTickets(filters) {
    filters = filters || {};
    if (!sb()) return [];
    let q = sb().from('it_tickets').select('*').order('created_at', { ascending: false });
    if (filters.submittedBy) q = q.eq('submitted_by', filters.submittedBy);
    if (filters.status) q = q.eq('status', filters.status);
    const { data } = await q;
    return data || [];
  }
  async function resolveTicket(id, resolution, resolvedBy) {
    if (!sb()) return { error: null };
    const { data, error } = await sb().from('it_tickets').update({ status: 'resolved', resolution, resolved_by: resolvedBy }).eq('id', id).select().single();
    if (!error && data) await createNotification(data.submitted_by, 'IT Ticket Resolved', 'Your ticket "' + data.subject + '" has been resolved.', 'ok');
    return { data, error };
  }
  function calcPayslip(gross) {
    const tax = Math.round(gross * 0.20);
    const ni = Math.round(gross * 0.08);
    const pension = Math.round(gross * 0.05);
    return { gross, tax, ni, pension, net: gross - tax - ni - pension };
  }
  async function getPayslips(employeeId) {
    if (!sb()) return [];
    const { data } = await sb().from('payroll_records').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false });
    return data || [];
  }
  async function getSiteConfig(key) {
    if (!sb()) return null;
    const { data } = await sb().from('site_config').select('value').eq('key', key).single();
    return data ? JSON.parse(data.value) : null;
  }
  async function setSiteConfig(key, value) {
    if (!sb()) { localStorage.setItem('gx_cfg_' + key, JSON.stringify(value)); return; }
    await sb().from('site_config').upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }
  async function notifyDeptManager(employeeId, employeeName, title, message) {
    if (!sb()) return;
    const emp = await getEmployee(employeeId);
    if (!emp) return;
    const { data: mgr } = await sb().from('employees').select('id').eq('department', emp.department).eq('role', 'dept_manager').single();
    if (mgr) await createNotification(mgr.id, title, message, 'in');
  }
  return {
    getEmployees, getEmployee, getEmployeeByEmail, createEmployee, updateEmployee, terminateEmployee,
    clockIn, clockOut, getAttendance,
    submitLeave, getLeaveRequests, updateLeaveStatus,
    createTask, getTasks, updateTaskStatus,
    getMessages, sendMessage, subscribeToMessages,
    getAnnouncements, postAnnouncement, reactToAnnouncement,
    createNotification, getNotifications, markRead, markAllRead, subscribeToNotifications,
    fileComplaint, getComplaints,
    submitSupplyRequest,
    submitITTicket, getITTickets, resolveTicket,
    calcPayslip, getPayslips,
    getSiteConfig, setSiteConfig,
  };
})();
