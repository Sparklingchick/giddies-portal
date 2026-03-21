// ═══════════════════════════════════════════════════════════
//  CONFIG.JS — Giddies Express Portal Configuration
//  ONLY EDIT THIS FILE to connect your Supabase backend
//  Include this FIRST before any other portal script
// ═══════════════════════════════════════════════════════════

const GX_CONFIG = {

  // ── SUPABASE CONNECTION ──────────────────────────────────
  // Get these from: supabase.com → Your Project → Settings → API
  SUPABASE_URL: 'https://dcgdlfwbfdwzojuhifwc.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZ2RsZndiZmR3em9qdWhpZndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjg0ODMsImV4cCI6MjA4OTYwNDQ4M30.51MGgZIwJqh1ICo4m5Xps-4DvYvSivanuRgH8x9tB6g',

  // ── EMAIL (optional — get free key at resend.com) ────────
  RESEND_API_KEY: '',
  FROM_EMAIL:    'noreply@giddiesexpress.com',
  FROM_NAME:     'Giddies Express',

  // ── PORTAL SETTINGS ─────────────────────────────────────
  COMPANY_NAME:  'Giddies Express',
  PORTAL_URL:    'https://Sparklingchick.github.io/giddies-portal',
  TIMEZONE:      'Africa/Lagos',

  // ── WORK HOURS (Nigeria WAT) ─────────────────────────────
  // Change WORK_START and WORK_END to restrict portal access
  // Currently set to 24/7 so all staff can test freely
  WORK_START:    '00:00',   // e.g. '08:00' for 8am
  WORK_END:      '23:59',   // e.g. '17:00' for 5pm
  WEEKEND_ACCESS: 'open',   // 'open' | 'locked' | 'toponly'

};

// ── DO NOT EDIT BELOW THIS LINE ─────────────────────────────
GX_CONFIG.IS_LIVE = !!(
  GX_CONFIG.SUPABASE_URL &&
  GX_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
  GX_CONFIG.SUPABASE_KEY &&
  GX_CONFIG.SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE'
);

if (GX_CONFIG.IS_LIVE) {
  console.log('%c✅ Giddies Express: LIVE MODE — Supabase Connected', 'color:#22C55E;font-weight:bold;font-size:13px');
} else {
  console.log('%c⚠️ Giddies Express: NOT CONNECTED — Check config.js', 'color:#F59E0B;font-weight:bold;font-size:13px');
}
