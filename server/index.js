const http = require('http');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;

/*
 * Lightweight side-effect server.
 *
 * Most application data lives in Supabase (tables + RLS), so this server is no
 * longer responsible for auth, CRUD, or schedulers. Two concerns previously
 * lived here:
 *
 *   1. Legacy /api/login + /api/visitors that wrote to data.json.
 *      → Removed. The frontend uses Supabase Auth + tables exclusively.
 *
 *   2. setInterval(60s) that flushed scheduled notifications.
 *      → Replaced by Postgres pg_cron jobs (see migration
 *      20260517010000_background_jobs_and_rpc.sql). The same job also handles
 *      campaign expiry. No Node side scheduler is needed.
 *
 * What remains:
 *   - GET /healthz: simple liveness probe so deployments / uptime monitors
 *     have something to ping.
 *   - POST /api/scheduler/run: kept as a manual fallback in case cron jobs are
 *     not installed yet. Calls the same Postgres RPCs.
 *
 * Add new endpoints here when integrating outbound side-effects (e.g. sending
 * WhatsApp blasts, Stripe webhooks) that cannot be done from RLS rules.
 */

let supabase = null;
try {
  const fs = require('fs');
  const path = require('path');
  const { createClient } = require('@supabase/supabase-js');

  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const getEnv = (key) => {
      const match = envContent.match(new RegExp(`${key}=["']?([^"'\\n]+)["']?`));
      return match ? match[1] : '';
    };
    const url = getEnv('VITE_SUPABASE_URL');
    const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
    if (url && key) {
      supabase = createClient(url, key);
      console.log('Supabase client ready (manual scheduler fallback enabled).');
    }
  }
} catch (e) {
  console.warn('Supabase SDK unavailable; manual scheduler endpoint disabled.');
}

async function runManualScheduler() {
  if (!supabase) return { success: false, message: 'Supabase not configured' };
  try {
    const [notif, camp] = await Promise.all([
      supabase.rpc('flush_due_notifications'),
      supabase.rpc('deactivate_expired_campaigns'),
    ]);
    if (notif.error) throw notif.error;
    if (camp.error) throw camp.error;
    return {
      success: true,
      notifications_sent: notif.data ?? 0,
      campaigns_expired: camp.data ?? 0,
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  if (req.url === '/healthz' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
    return;
  }

  if (req.url === '/api/scheduler/run' && (req.method === 'POST' || req.method === 'GET')) {
    const result = await runManualScheduler();
    res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Side-effect server listening on http://localhost:${PORT}`);
});
