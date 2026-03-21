const GXAuth = (() => {
  let _sb = null;
  function getSB() {
    if (_sb) return _sb;
    if (!GX_CONFIG.IS_LIVE) return null;
    if (typeof supabase === 'undefined') return null;
    _sb = supabase.createClient(GX_CONFIG.SUPABASE_URL, GX_CONFIG.SUPABASE_KEY);
    return _sb;
  }

  const DEMO_USERS = [
    { email:'admin@giddiesexpress.com',    password:'admin123', role:'admin',        department:'Administration', name:'Chief Admin',      color:'#F59E0B' },
    { email:'manager1@giddiesexpress.com', password:'pass123',  role:'manager',      department:'Management',    name:'Manager One',      color:'#A78BFA' },
    { email:'manager2@giddiesexpress.com', password:'pass123',  role:'manager',      department:'Management',    name:'Manager Two',      color:'#818CF8' },
    { email:'hr@giddiesexpress.com',       password:'pass123',  role:'dept_manager', department:'HR',            name:'Sarah Chen',       color:'#F472B6' },
    { email:'finance@giddiesexpress.com',  password:'pass123',  role:'dept_manager', department:'Finance',       name:'Priya Patel',      color:'#4ADE80' },
    { email:'it@giddiesexpress.com',       password:'pass123',  role:'dept_manager', department:'IT Support',    name:'Derek Wilson',     color:'#60A5FA' },
    { email:'payroll@giddiesexpress.com',  password:'pass123',  role:'dept_manager', department:'Payroll',       name:'Ada Nwosu',        color:'#34D399' },
    { email:'recruit@giddiesexpress.com',  password:'pass123',  role:'dept_manager', department:'Recruitment',   name:'Kemi Oduola',      color:'#FB923C' },
    { email:'logistics@giddiesexpress.com',password:'pass123',  role:'dept_manager', department:'Logistics',     name:'Tunde Bakare',     color:'#FF6B00' },
    { email:'warehouse@giddiesexpress.com',password:'pass123',  role:'dept_manager', department:'Warehouse',     name:'Emeka Okafor',     color:'#A78BFA' },
    { email:'customer@giddiesexpress.com', password:'pass123',  role:'dept_manager', department:'Customer Svc',  name:'Ngozi Peters',     color:'#2DD4BF' },
    { email:'marketing@giddiesexpress.com',password:'pass123',  role:'dept_manager', department:'Marketing',     name:'Bayo Adeleke',     color:'#E879F9' },
    { email:'legal@giddiesexpress.com',    password:'pass123',  role:'dept_manager', department:'Legal',         name:'Chinyere Obi',     color:'#94A3B8' },
    { email:'john@giddiesexpress.com',     password:'pass123',  role:'employee',     department:'Logistics',     name:'John Okafor',      color:'#FF6B00' },
    { email:'amaka@giddiesexpress.com',    password:'pass123',  role:'employee',     department:'HR',            name:'Amaka Eze',        color:'#F472B6' },
    { email:'chidi@giddiesexpress.com',    password:'pass123',  role:'employee',     department:'Finance',       name:'Chidi Nwosu',      color:'#60A5FA' },
    { email:'funke@giddiesexpress.com',    password:'pass123',  role:'employee',     department:'Warehouse',     name:'Funke Adeleke',    color:'#A78BFA' },
    { email:'osas@giddiesexpress.com',     password:'pass123',  role:'employee',     department:'Customer Svc',  name:'Osas Ighalo',      color:'#2DD4BF' },
  ];

  const ROUTES = {
    admin:        'giddyexpress-admin.html',
    manager:      'giddyexpress-manager.html',
    dept_manager: 'giddyexpress-dept.html',
    employee:     'giddyexpress-employee.html',
  };
  const DEPT_ROUTES = {
    'HR':         'giddyexpress-hr.html',
    'Finance':    'giddyexpress-finance.html',
    'IT Support': 'giddyexpress-it.html',
    'Payroll':    'giddyexpress-payroll.html',
  };

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem('gx_session') || 'null'); }
    catch(e) { return null; }
  }

  function saveSession(user) {
    const sess = { ...user, loginTime: Date.now() };
    sessionStorage.setItem('gx_session', JSON.stringify(sess));
    _presenceSet(user);
    return sess;
  }

  function clearSession() {
    const s = getSession();
    if (s) _presenceDel(s.email);
    sessionStorage.removeItem('gx_session');
  }

  function requireAuth(allowedRoles) {
    const s = getSession();
    if (!s) { window.location.href = 'giddyexpress-login.html'; return null; }
    if (allowedRoles && !allowedRoles.includes(s.role)) {
      window.location.href = 'giddyexpress-login.html'; return null;
    }
    _presenceSet(s);
    return s;
  }

  async function login(email, password) {
    const em = email.toLowerCase().trim();
    if (!isPortalOpen()) {
      const demo = DEMO_USERS.find(u => u.email === em);
      if (!demo || !['admin','manager'].includes(demo.role)) {
        return { error: 'Portal is closed. Hours: ' + GX_CONFIG.WORK_START + '–' + GX_CONFIG.WORK_END + ' WAT.' };
      }
    }
    const sb = getSB();
    if (sb && !GX_CONFIG.DEMO_MODE) {
      try {
        const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email: em, password });
        if (!authError) {
          const { data: profile } = await sb.from('employees').select('*').eq('email', em).single();
          if (!profile) return { error: 'Account not found in employee records. Contact IT Support.' };
          const user = { ...profile, supabaseId: authData.user.id, mode: 'live' };
          saveSession(user);
          return { user };
        }
      } catch(e) {
        return { error: 'Connection error. Check your internet.' };
      }
    }
    const demoUser = DEMO_USERS.find(u => u.email === em && u.password === password);
    if (!demoUser) return { error: 'Invalid email or password.' };
    const user = { id: 'demo_' + demoUser.email, ...demoUser, mode: 'demo' };
    saveSession(user);
    return { user };
  }

  function logout() {
    clearSession();
    const sb = getSB();
    if (sb) sb.auth.signOut().catch(() => {});
    window.location.href = 'giddyexpress-login.html';
  }

  function routeUser(user) {
    if (user.role === 'dept_manager' && DEPT_ROUTES[user.department]) {
      window.location.href = DEPT_ROUTES[user.department];
    } else {
      window.location.href = ROUTES[user.role] || ROUTES.employee;
    }
  }

  function getNigeriaTime() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: GX_CONFIG.TIMEZONE }));
  }

  function isPortalOpen() {
    const n = getNigeriaTime();
    const day = n.getDay();
    if ((day === 0 || day === 6) && GX_CONFIG.WEEKEND_ACCESS === 'locked') return false;
    const [sh, sm] = GX_CONFIG.WORK_START.split(':').map(Number);
    const [eh, em] = GX_CONFIG.WORK_END.split(':').map(Number);
    const now = n.getHours() * 60 + n.getMinutes();
    return now >= sh * 60 + sm && now < eh * 60 + em;
  }

  function startWorkHoursCheck() {
    const s = getSession();
    if (!s || s.role === 'admin' || s.role === 'manager') return;
    const [eh, em] = GX_CONFIG.WORK_END.split(':').map(Number);
    setInterval(() => {
      const n = getNigeriaTime();
      const nowM = n.getHours() * 60 + n.getMinutes();
      const endM = eh * 60 + em;
      const left = endM - nowM;
      if ([30, 15, 5, 1].includes(left) && n.getSeconds() < 5) {
        toast('⏰ Portal closes in ' + left + ' min! Please save your work.', 'wa');
      }
      if (nowM >= endM && n.getSeconds() < 5) {
        toast('Portal has closed. Logging you out...', 'wa');
        setTimeout(() => logout(), 2000);
      }
    }, 5000);
  }

  function _presenceSet(u) {
    try {
      const p = JSON.parse(localStorage.getItem('gx_presence') || '{}');
      p[u.email] = { name: u.name, role: u.role, dept: u.department || '', ts: Date.now() };
      localStorage.setItem('gx_presence', JSON.stringify(p));
    } catch(e) {}
  }

  function _presenceDel(email) {
    try {
      const p = JSON.parse(localStorage.getItem('gx_presence') || '{}');
      delete p[email];
      localStorage.setItem('gx_presence', JSON.stringify(p));
    } catch(e) {}
  }

  function getOnlineUsers() {
    try {
      const p = JSON.parse(localStorage.getItem('gx_presence') || '{}');
      return Object.values(p).filter(v => Date.now() - v.ts < 45000);
    } catch(e) { return []; }
  }

  function startPresence() {
    const s = getSession();
    if (!s) return;
    _presenceSet(s);
    setInterval(() => {
      const ss = getSession();
      if (!ss) return;
      _presenceSet(ss);
      const el = document.getElementById('onlineCount');
      if (el) el.textContent = getOnlineUsers().length + ' online';
    }, 12000);
  }

  function startClock(elId) {
    const id = elId || 'tbClock';
    const tick = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const n = getNigeriaTime();
      el.textContent = String(n.getHours()).padStart(2,'0') + ':' +
                       String(n.getMinutes()).padStart(2,'0') + ':' +
                       String(n.getSeconds()).padStart(2,'0');
    };
    tick();
    setInterval(tick, 1000);
  }

  function initPage(opts) {
    opts = opts || {};
    if (opts.requireAuth !== false) {
      const s = requireAuth(opts.roles);
      if (!s) return null;
    }
    if (typeof buildNav === 'function') buildNav();
    if (typeof goToPage === 'function' && opts.page) goToPage(opts.page);
    startClock();
    startPresence();
    startWorkHoursCheck();
    const el = document.getElementById('onlineCount');
    if (el) el.textContent = getOnlineUsers().length + ' online';
    return getSession();
  }

  return {
    login, logout, routeUser,
    getSession, saveSession, clearSession, requireAuth,
    isPortalOpen, getNigeriaTime,
    getOnlineUsers, startPresence, startClock,
    startWorkHoursCheck, initPage, getSB, DEMO_USERS,
  };
})();

function goToLogin() { GXAuth.logout(); }
function getSession() { return GXAuth.getSession(); }
