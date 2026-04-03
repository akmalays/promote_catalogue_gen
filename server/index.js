const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5001;
const DATA_FILE = path.join(__dirname, 'data.json');

// ===== Supabase SDK for Scheduler =====
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const getEnv = (key) => {
      const match = envContent.match(new RegExp(`${key}=["']?([^"'\\n]+)["']?`));
      return match ? match[1] : '';
    };
    const url = getEnv('VITE_SUPABASE_URL');
    const key = getEnv('VITE_SUPABASE_ANON_KEY');
    if (url && key) {
      supabase = createClient(url, key);
      console.log('✅ Supabase connected for scheduler');
    }
  }
} catch (e) {
  console.warn('⚠️ Supabase SDK not available for scheduler. Install with: npm install @supabase/supabase-js');
}

// ===== Notification Scheduler Logic =====
async function runNotificationScheduler() {
  if (!supabase) return { success: false, message: 'Supabase not configured' };

  try {
    const now = new Date().toISOString();
    
    // Find all scheduled notifications that are due
    const { data: dueNotifs, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_sent', false)
      .lte('scheduled_at', now);

    if (error) throw error;

    if (!dueNotifs || dueNotifs.length === 0) {
      return { success: true, sent: 0, message: 'No scheduled notifications due' };
    }

    // Mark each as sent
    let sentCount = 0;
    for (const notif of dueNotifs) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', notif.id);
      
      if (!updateError) {
        sentCount++;
        console.log(`📢 Notification sent: "${notif.title}" (scheduled for ${notif.scheduled_at})`);
      }
    }

    return { success: true, sent: sentCount, message: `${sentCount} notification(s) sent` };
  } catch (err) {
    console.error('Scheduler error:', err);
    return { success: false, message: err.message };
  }
}

// Auto-run scheduler every 60 seconds
if (supabase) {
  setInterval(async () => {
    const result = await runNotificationScheduler();
    if (result.sent > 0) {
      console.log(`⏰ Auto-scheduler: ${result.message}`);
    }
  }, 60000);
  console.log('⏰ Auto-scheduler started (every 60 seconds)');
}

// Load or initialize data
let data = {
  users: [
    { id: '1', username: 'admin', password: 'password123', name: 'Administrator' }
  ],
  visitors: [
    { id: '1', name: 'Budi Santoso', phone: '6281234567890', selected: false },
    { id: '2', name: 'Siti Rahayu', phone: '6285678901234', selected: false },
    { id: '3', name: 'Andi Kurniawan', phone: '6287890123456', selected: false },
  ]
};

const loadData = () => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }
};

const saveData = () => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

loadData();

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    const jsonBody = body ? JSON.parse(body) : {};

    // --- SCHEDULER API ---
    if (req.url === '/api/scheduler/run' && (req.method === 'POST' || req.method === 'GET')) {
      const result = await runNotificationScheduler();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    // --- AUTH ---
    if (req.url === '/api/login' && req.method === 'POST') {
      const { username, password } = jsonBody;
      const user = data.users.find(u => u.username === username && u.password === password);
      if (user) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: { id: user.id, username: user.username, name: user.name } }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Username atau password salah' }));
      }
    }

    // --- VISITORS ---
    else if (req.url === '/api/visitors' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data.visitors));
    }
    else if (req.url === '/api/visitors' && req.method === 'POST') {
      const newV = { id: Date.now().toString(), ...jsonBody, selected: false };
      data.visitors.push(newV);
      saveData();
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newV));
    }
    else if (req.url.startsWith('/api/visitors/') && req.method === 'PUT') {
      const id = req.url.split('/').pop();
      const index = data.visitors.findIndex(v => v.id === id);
      if (index !== -1) {
        data.visitors[index] = { ...data.visitors[index], ...jsonBody };
        saveData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data.visitors[index]));
      } else {
        res.writeHead(404); res.end();
      }
    }
    else if (req.url.startsWith('/api/visitors/') && req.method === 'DELETE') {
      const id = req.url.split('/').pop();
      data.visitors = data.visitors.filter(v => v.id !== id);
      saveData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }
    else {
      res.writeHead(404);
      res.end();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Backend server (Vanilla Node) running on http://localhost:${PORT}`);
});
