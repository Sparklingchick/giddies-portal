/* Giddies Express Portal - Shared JS Engine */
var SUPA_URL='https://dcgdlfwbfdwzojuhifwc.supabase.co';
var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZ2RsZndiZmR3em9qdWhpZndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjg0ODMsImV4cCI6MjA4OTYwNDQ4M30.51MGgZIwJqh1ICo4m5Xps-4DvYvSivanuRgH8x9tB6g';
var _SB=null, _ME=null;

/* ── Supabase init ── */
function getSB(){
  if(_SB) return _SB;
  if(window.supabase){_SB=window.supabase.createClient(SUPA_URL,SUPA_KEY);}
  return _SB;
}

/* ── Session ── */
function getMe(){
  try{
    var d=JSON.parse(localStorage.getItem('gx_v3')||'null');
    if(d&&(Date.now()-d.loginTime)<28800000) return d;
    localStorage.removeItem('gx_v3'); return null;
  }catch(e){return null;}
}
function requireRole(roles){
  var me=getMe();
  if(!me){window.location.href='giddyexpress-login.html';return null;}
  if(roles&&roles.indexOf(me.role)===-1){window.location.href='giddyexpress-login.html';return null;}
  return me;
}
function gxLogout(){
  localStorage.removeItem('gx_v3');
  var sb=getSB(); if(sb) sb.auth.signOut();
  window.location.href='giddyexpress-login.html';
}

/* ── DOM helpers ── */
function $(id){return document.getElementById(id);}
function setHTML(id,html){var e=$(id);if(e)e.innerHTML=html;}
function getVal(id){var e=$(id);return e?e.value.trim():'';}
function qs(sel){return document.querySelector(sel);}
function qsa(sel){return document.querySelectorAll(sel);}

/* ── Toast ── */
function gxToast(msg,type){
  var w=$('gx-toasts');
  if(!w){w=document.createElement('div');w.id='gx-toasts';w.style.cssText='position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:.45rem;pointer-events:none';document.body.appendChild(w);}
  var c={ok:'#4ADE80',er:'#FCA5A5',wa:'#FCD34D',in:'#93C5FD'};
  var b={ok:'rgba(34,197,94,.3)',er:'rgba(239,68,68,.3)',wa:'rgba(245,158,11,.3)',in:'rgba(96,165,250,.3)'};
  var t=document.createElement('div');
  t.style.cssText='background:#1A1D24;border:1px solid '+(b[type]||b.in)+';color:'+(c[type]||c.in)+';padding:.62rem 1rem;border-radius:100px;font-size:.76rem;font-weight:500;box-shadow:0 8px 28px rgba(0,0,0,.4);transform:translateX(110%);transition:transform .28s;font-family:DM Sans,sans-serif;max-width:320px';
  t.textContent=msg; w.appendChild(t);
  setTimeout(function(){t.style.transform='translateX(0)';},10);
  setTimeout(function(){t.style.transform='translateX(110%)';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},3800);
}

/* ── Modals ── */
function gxOpen(id){var e=$(id);if(e)e.classList.add('open');}
function gxClose(id){var e=$(id);if(e)e.classList.remove('open');}

/* ── Clock ── */
function gxClock(){
  function tick(){
    var el=$('tbClock');if(!el)return;
    try{var n=new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Lagos'}));el.textContent=pad(n.getHours())+':'+pad(n.getMinutes())+':'+pad(n.getSeconds());}
    catch(e){var n=new Date();el.textContent=pad(n.getHours())+':'+pad(n.getMinutes())+':'+pad(n.getSeconds());}
  }
  tick(); setInterval(tick,1000);
}
function pad(n){return String(n).padStart(2,'0');}

/* ── Presence ── */
function gxPresence(me){
  function set(){try{var p=JSON.parse(localStorage.getItem('gx_pr')||'{}');p[me.email]={name:me.name,role:me.role,dept:me.department||'',ts:Date.now()};localStorage.setItem('gx_pr',JSON.stringify(p));}catch(e){}}
  set(); setInterval(function(){set();var oc=$('onlineCnt');if(oc)oc.textContent=gxOnline().length+' online';},15000);
}
function gxOnline(){
  try{var p=JSON.parse(localStorage.getItem('gx_pr')||'{}'),r=[];Object.keys(p).forEach(function(k){if(Date.now()-p[k].ts<45000)r.push(p[k]);});return r;}catch(e){return[];}
}

/* ── Nav ── */
function gxNav(id){
  qsa('.nav-a').forEach(function(n){n.classList.remove('on');});
  var e=$('nav-'+id);if(e)e.classList.add('on');
}

/* ── Tabs ── */
function gxTab(btn){
  var p=btn.closest('.tabs');if(!p)return;
  p.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');});
  btn.classList.add('on');
}

/* ── Helpers ── */
function gxMoney(n){return '\u20a6'+Number(n||0).toLocaleString();}
function gxInits(name){return(name||'?').split(' ').map(function(c){return c[0];}).join('').slice(0,2).toUpperCase();}
function gxAgo(d){if(!d)return'';var m=Math.floor((Date.now()-new Date(d))/60000);if(m<1)return'just now';if(m<60)return m+'m ago';var h=Math.floor(m/60);if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago';}
function gxToday(){return new Date().toISOString().slice(0,10);}
function gxAvc(name){var c=['#FF6B00','#F472B6','#60A5FA','#4ADE80','#A78BFA','#FB923C'];var h=0;for(var i=0;i<(name||'').length;i++)h=(name.charCodeAt(i)+((h<<5)-h));return c[Math.abs(h)%c.length];}
function gxAv(name,sz){var s=sz||'28px';return '<div style="width:'+s+';height:'+s+';border-radius:50%;background:'+gxAvc(name)+';display:flex;align-items:center;justify-content:center;font-size:calc('+s+' * 0.35);font-weight:700;color:#fff;flex-shrink:0">'+gxInits(name)+'</div>';}
function gxBadge(s){var m={active:'b-ok',pending:'b-wa',approved:'b-ok',rejected:'b-er','in-progress':'b-bl',done:'b-ok',present:'b-ok',late:'b-wa',absent:'b-er',high:'b-or',urgent:'b-er',medium:'b-wa',low:'b-gy',suspended:'b-er',open:'b-or',resolved:'b-ok',admin:'b-or',manager:'b-pu',dept_manager:'b-wa',employee:'b-bl',male:'b-bl',female:'b-ok'};return '<span class="b '+(m[s]||'b-gy')+'">'+s+'</span>';}
function gxCalcPay(g){var t=Math.round(g*.20),n=Math.round(g*.08),p=Math.round(g*.05);return{gross:g,tax:t,ni:n,pension:p,net:g-t-n-p};}

/* ── Loading state ── */
function gxLoading(id){setHTML(id,'<div style="display:flex;align-items:center;justify-content:center;padding:2.5rem"><div style="width:28px;height:28px;border:3px solid var(--br);border-top-color:var(--hi);border-radius:50%;animation:sp .7s linear infinite"></div></div>');}
function gxErr(id,msg,retry){setHTML(id,'<div style="text-align:center;padding:2rem"><div style="color:var(--er);margin-bottom:1rem">'+msg+'</div>'+(retry?'<button class="btn btn-gh" onclick="'+retry+'">Retry</button>':'')+'</div>');}

/* ── Print ── */
function gxPrint(title,html){
  var w=window.open('','_blank','width=900,height=700');
  if(!w){gxToast('Allow popups to print','wa');return;}
  w.document.write('<!DOCTYPE html><html><head><title>'+title+'</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:2rem;color:#111;font-size:12px}h2{color:#FF6B00;border-bottom:2px solid #FF6B00;padding-bottom:.5rem;margin-bottom:1rem}table{width:100%;border-collapse:collapse;margin:.75rem 0}th{background:#FF6B00;color:#fff;padding:.35rem .6rem;text-align:left;font-size:.7rem}td{padding:.4rem .6rem;border-bottom:1px solid #eee}tr:nth-child(even)td{background:#f9f9f9}.ft{margin-top:1rem;font-size:.7rem;color:#888;border-top:1px solid #ddd;padding-top:.5rem}</style></head><body>');
  w.document.write('<h2>Giddies Express \u2014 '+title+'</h2>');
  w.document.write(html);
  w.document.write('<div class="ft">Generated: '+new Date().toLocaleString('en-NG')+' | Confidential</div>');
  w.document.write('<scr'+'ipt>window.onload=function(){window.print();}<'+'/scr'+'ipt></body></html>');
  w.document.close();
}

/* ── Notify helper ── */
function gxNotify(empId,title,msg,type){
  var sb=getSB(); if(!sb||!empId)return;
  sb.from('notifications').insert({employee_id:empId,title:title,message:msg,type:type||'in'}).then(function(){}).catch(function(){});
}

/* ── Page init ── */
function gxInit(roles,onReady){
  _ME=requireRole(roles);
  if(!_ME) return;
  _SB=getSB();
  
  // Update sidebar
  var av=$('sbAv'),nm=$('sbName'),rl=$('sbRole');
  if(av) av.textContent=gxInits(_ME.name);
  if(nm) nm.textContent=_ME.name;
  if(rl) rl.textContent=(_ME.role||'').replace(/_/g,' ');
  
  // Clock, presence, online count
  gxClock();
  gxPresence(_ME);
  var oc=$('onlineCnt'); if(oc) oc.textContent=gxOnline().length+' online';
  
  // Notif badge
  if(_SB){
    _SB.from('notifications').select('id',{count:'exact',head:true})
      .eq('employee_id',_ME.id).eq('read',false)
      .then(function(r){if((r.count||0)>0){var d=$('notifDot');if(d)d.style.display='block';}}
      ).catch(function(){});
  }
  
  if(onReady) onReady(_ME,_SB);
}
