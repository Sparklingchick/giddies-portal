const GXUtils = (() => {
  function toast(msg, type) {
    type = type || 'in';
    let w = document.getElementById('toastWrap');
    if (!w) {
      w = document.createElement('div');
      w.id = 'toastWrap';
      w.className = 'toast-wrap';
      document.body.appendChild(w);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    w.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
  }
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }
  document.addEventListener('click', e => {
    if (e.target && e.target.classList.contains('overlay')) {
      e.target.classList.remove('open');
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
    }
  });
  function setTab(btn, groupSelector) {
    const parent = btn.closest(groupSelector || '.tabs');
    if (!parent) return;
    parent.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    btn.classList.add('on');
  }
  function formatCurrency(n, symbol) {
    return (symbol || '₦') + (n || 0).toLocaleString();
  }
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch(e) { return dateStr; }
  }
  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' hr' + (hrs > 1 ? 's' : '') + ' ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + ' day' + (days > 1 ? 's' : '') + ' ago';
    return formatDate(dateStr);
  }
  function initials(name) {
    return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }
  function today() {
    return new Date().toISOString().slice(0, 10);
  }
  function statusBadge(status) {
    const map = {
      active: ['b-ok','active'], pending: ['b-wa','pending'],
      approved: ['b-ok','approved'], rejected: ['b-er','rejected'],
      open: ['b-or','open'], resolved: ['b-ok','resolved'],
      suspended: ['b-er','suspended'], done: ['b-ok','done'],
      overdue: ['b-er','overdue'], 'in-progress': ['b-bl','in progress'],
      present: ['b-ok','present'], late: ['b-wa','late'],
      absent: ['b-er','absent'], high: ['b-or','high'],
      urgent: ['b-er','urgent'], medium: ['b-wa','medium'], low: ['b-gy','low'],
    };
    const [cls, label] = map[status] || ['b-gy', status];
    return '<span class="b ' + cls + '">' + label + '</span>';
  }
  function printSection(title, contentHtml) {
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write('<!DOCTYPE html><html><head><title>' + title + '</title>' +
      '<style>body{font-family:Arial,sans-serif;padding:2rem;color:#111}' +
      'h1{color:#FF6B00}table{width:100%;border-collapse:collapse}' +
      'th,td{padding:.5rem .75rem;border:1px solid #ddd;text-align:left}' +
      'th{background:#f5f5f5}</style></head><body>' +
      '<h1>Giddies Express — ' + title + '</h1>' +
      '<p style="color:#888;font-size:.8rem">Generated: ' + new Date().toLocaleString('en-NG') + '</p><hr/>' +
      contentHtml +
      '<script>window.onload=function(){window.print();}<\/script></body></html>');
    win.document.close();
  }
  function exportCSV(rows, headers, filename) {
    const csv = [headers.join(','), ...rows.map(r => r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('⬇ Exported: ' + (filename || 'export.csv'), 'ok');
  }
  return {
    toast, openModal, closeModal, setTab,
    formatCurrency, formatDate, timeAgo, initials, today,
    statusBadge, printSection, exportCSV,
  };
})();

function toast(msg, type)  { GXUtils.toast(msg, type); }
function openModal(id)     { GXUtils.openModal(id); }
function closeModal(id)    { GXUtils.closeModal(id); }
function setTab(btn, sel)  { GXUtils.setTab(btn, sel); }
