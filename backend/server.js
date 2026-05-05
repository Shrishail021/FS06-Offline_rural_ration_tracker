require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { getDb } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize databases to ensure they exist for PouchDB sync
(async () => {
  await getDb('complaints');
  await getDb('distributions');
  await getDb('shipments');
})();

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/sync', require('./src/routes/sync'));
app.use('/api/master', require('./src/routes/master'));
app.use('/api/complaints', require('./src/routes/complaints'));
app.use('/api/logistics', require('./src/routes/logistics'));


app.get('/health', (req, res) => {
    res.json({ status: 'success', message: 'Backend is running' });
});

// Root landing page — links to both portals
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Offline Ration Tracker — Launch Portal</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f5f0eb; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; }
        .badge { background: #22c55e; color: white; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 999px; margin-bottom: 1.5rem; }
        h1 { font-size: 2.5rem; font-weight: 800; color: #1c1917; text-align: center; line-height: 1.2; margin-bottom: .75rem; }
        h1 span { color: #a16207; }
        p { color: #78716c; text-align: center; margin-bottom: 2.5rem; max-width: 480px; line-height: 1.7; }
        .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; width: 100%; max-width: 680px; }
        .card { background: white; border-radius: 1.25rem; padding: 2rem; box-shadow: 0 4px 24px rgba(0,0,0,.07); border: 1px solid #e7e5e4; text-decoration: none; transition: transform .15s, box-shadow .15s; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(0,0,0,.12); }
        .card .icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin-bottom: 1.25rem; }
        .card.distributor .icon { background: #fef9c3; }
        .card.admin .icon { background: #eff6ff; }
        .card h2 { font-size: 1.15rem; font-weight: 700; color: #1c1917; margin-bottom: .4rem; }
        .card p { color: #78716c; font-size: .875rem; margin-bottom: 1.25rem; text-align: left; }
        .card .btn { display: inline-block; font-size: .875rem; font-weight: 700; padding: .65rem 1.4rem; border-radius: .75rem; }
        .card.distributor .btn { background: #a16207; color: white; }
        .card.admin .btn { background: #1d4ed8; color: white; }
        .api { margin-top: 2rem; font-size: .8rem; color: #a8a29e; }
        .api a { color: #a16207; }
        @media (max-width: 540px) { .cards { grid-template-columns: 1fr; } h1 { font-size: 1.8rem; } }
      </style>
    </head>
    <body>
      <div class="badge">✦ OFFLINE-FIRST SYSTEM</div>
      <h1>Karnataka <span>Ration Tracker</span></h1>
      <p>Offline-first ration distribution management for rural Karnataka. Select your portal below to continue.</p>
      <div class="cards">
        <a href="http://localhost:5174" class="card distributor">
          <div class="icon">📦</div>
          <h2>Distributor App</h2>
          <p>Record offline distributions, scan ration cards, and sync data to the central server.</p>
          <span class="btn">Open Distributor Login →</span>
        </a>
        <a href="http://localhost:5173" class="card admin">
          <div class="icon">🛡️</div>
          <h2>State Admin Portal</h2>
          <p>Monitor state-wide distribution metrics, manage users, and resolve flagged complaints.</p>
          <span class="btn">Open Admin Login →</span>
        </a>
      </div>
      <p class="api">Backend API running on port 5000 — <a href="/health">/health</a> · <a href="/api/admin/dashboard">/api/admin/dashboard</a></p>
    </body>
    </html>
  `);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.lang=`Server running on port ${PORT}`;
    console.log(`Server running on port ${PORT}`);
});
