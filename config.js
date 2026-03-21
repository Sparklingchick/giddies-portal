const GX_CONFIG = {
  SUPABASE_URL:  'https://dcgdlfwbfdwzojuhifwc.supabase.co',
  SUPABASE_KEY:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZ2RsZndiZmR3em9qdWhpZndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjg0ODMsImV4cCI6MjA4OTYwNDQ4M30.51MGgZIwJqh1ICo4m5Xps-4DvYvSivanuRgH8x9tB6g',
  RESEND_API_KEY: '',
  FROM_EMAIL:    'noreply@giddiesexpress.com',
  FROM_NAME:     'Giddies Express',
  COMPANY_NAME:  'Giddies Express',
  PORTAL_URL:    'https://Sparklingchick.github.io/giddies-portal',
  TIMEZONE:      'Africa/Lagos',
  WORK_START:    '00:00',
  WORK_END:      '23:59',
  WEEKEND_ACCESS:'open',
  DEMO_MODE:      false,
};
GX_CONFIG.IS_LIVE = (
  GX_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
  GX_CONFIG.SUPABASE_URL !== '' &&
  GX_CONFIG.SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE' &&
  GX_CONFIG.SUPABASE_KEY !== ''
);
console.log(GX_CONFIG.IS_LIVE
  ? '%c✅ Live mode — Supabase connected'
  : '%c⚠️ Demo mode — Supabase not configured',
  GX_CONFIG.IS_LIVE ? 'color:#22C55E;font-weight:bold' : 'color:#F59E0B;font-weight:bold'
);