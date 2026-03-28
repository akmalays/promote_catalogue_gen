const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5001;
const DATA_FILE = path.join(__dirname, 'data.json');

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
  req.on('end', () => {
    const jsonBody = body ? JSON.parse(body) : {};

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
