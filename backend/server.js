require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { getDb } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public')); // Serve static assets like the emblem

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
      <title>Anna Bhagya — Karnataka Ration Tracker</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Anek+Kannada:wght@400;600;800&family=Cinzel:wght@600;800&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Inter', sans-serif; 
          background: #000 url('/anna_bhagya_bg.png') no-repeat center center fixed;
          background-size: cover;
          min-height: 100vh; 
          color: #fff;
          overflow-x: hidden;
          display: flex;
        }
        
        /* Dark gradient overlay to make text readable */
        .overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(20, 15, 0, 0.65) 100%);
          z-index: 1;
        }

        .layout-wrapper {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: row;
          width: 100%;
          min-height: 100vh;
        }

        .left-content {
          flex: 1.2;
          padding: 5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .right-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .emblem {
          width: 80px;
          margin-bottom: 2rem;
          filter: drop-shadow(0 4px 12px rgba(212, 175, 55, 0.4));
        }

        .title-kannada {
          font-family: 'Anek Kannada', sans-serif;
          font-size: 5.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fef08a 0%, #d4af37 50%, #b48c14 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: -0.5rem;
          line-height: 1;
          text-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);
        }

        h1 { 
          font-family: 'Cinzel', serif;
          font-size: 2rem; 
          font-weight: 800; 
          color: #fff; 
          letter-spacing: 4px;
          text-transform: uppercase;
          margin-bottom: 2.5rem; 
          opacity: 0.9;
        }

        .scheme-info {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-left: 4px solid #d4af37;
          padding: 2rem;
          border-radius: 0 1rem 1rem 0;
          max-width: 650px;
        }

        .scheme-info p {
          font-size: 1.1rem;
          line-height: 1.8;
          color: #e5e5e5;
          margin-bottom: 1rem;
          font-weight: 300;
        }
        .scheme-info p:last-child { margin-bottom: 0; }
        
        .scheme-info strong {
          color: #fef08a;
          font-weight: 600;
        }

        .stats {
          display: flex;
          gap: 3rem;
          margin-top: 3rem;
        }
        .stat-item h3 { font-size: 2.5rem; font-family: 'Cinzel', serif; color: #d4af37; margin-bottom: 0.25rem; }
        .stat-item p { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #a3a3a3; }

        /* Right side cards */
        .portals-container {
          width: 100%;
          max-width: 480px;
        }

        .portal-header {
          margin-bottom: 2rem;
          text-align: center;
        }
        .portal-header h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; color: #fff; }
        .portal-header p { color: #a3a3a3; font-size: 0.95rem; }

        .card { 
          background: rgba(255, 255, 255, 0.06);
          border-radius: 1.25rem; 
          padding: 2rem; 
          margin-bottom: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-decoration: none; 
          transition: all 0.3s ease; 
          display: block;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          opacity: 0; transition: opacity 0.3s;
        }

        .card:hover { 
          transform: translateY(-4px); 
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(212, 175, 55, 0.4);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3); 
        }
        .card:hover::before { opacity: 1; }

        .card-content { position: relative; z-index: 2; display: flex; align-items: flex-start; gap: 1.5rem; }
        
        .card .icon { 
          width: 60px; height: 60px; 
          border-radius: 16px; 
          display: flex; align-items: center; justify-content: center; 
          font-size: 1.8rem; flex-shrink: 0;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .card.distributor .icon { box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.2); }
        .card.admin .icon { box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.2); }

        .card h3 { font-size: 1.25rem; font-weight: 600; color: #fff; margin-bottom: 0.5rem; }
        .card p { color: #b3b3b3; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1rem; }
        
        .card .btn-text {
          font-size: 0.85rem; font-weight: 700; color: #d4af37;
          text-transform: uppercase; letter-spacing: 1px;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .card.admin .btn-text { color: #60a5fa; }
        .card:hover .btn-text { transform: translateX(5px); transition: transform 0.3s; }

        .api-info {
          text-align: center; margin-top: 3rem; font-size: 0.75rem; color: #666; font-family: monospace;
        }
        .api-info a { color: #888; text-decoration: none; }
        
        @media (max-width: 1024px) {
          .layout-wrapper { flex-direction: column; }
          .left-content { padding: 3rem 2rem; text-align: center; align-items: center; flex: none; }
          .scheme-info { border-left: none; border-top: 4px solid #d4af37; border-radius: 0 0 1rem 1rem; text-align: left; }
          .right-content { padding: 3rem 1rem; border-left: none; border-top: 1px solid rgba(255,255,255,0.1); flex: none; }
          .title-kannada { font-size: 4rem; }
        }
      </style>
    </head>
    <body>
      <div class="overlay"></div>
      
      <div class="layout-wrapper">
        <!-- Left Information Side -->
        <div class="left-content">
      <img src="/anna_bhagya_icon.png" alt="Anna Bhagya Symbol" class="emblem" style="width: 140px; border-radius: 20px;">
          <div class="title-kannada">ಅನ್ನಭಾಗ್ಯ</div>
          <h1>Karnataka Ration Tracker</h1>
          
          <div class="scheme-info">
            <p><strong>Anna Bhagya</strong> is the Government of Karnataka's flagship food security scheme, driven by the vision of a hunger-free state. It guarantees free food grains to BPL (Below Poverty Line) and Antyodaya cardholders.</p>
            <p>This modernized <strong>Offline-First Management System</strong> ensures that even the most remote rural villages have uninterrupted, transparent, and digitally verified access to their rightful rations—with or without internet connectivity.</p>
          </div>

          <div class="stats">
            <div class="stat-item">
              <h3>10kg</h3>
              <p>Rice Guarantee</p>
            </div>
            <div class="stat-item">
              <h3>100%</h3>
              <p>Offline Capable</p>
            </div>
            <div class="stat-item">
              <h3>Secured</h3>
              <p>By Sync Engine</p>
            </div>
          </div>
        </div>

        <!-- Right Action Side -->
        <div class="right-content">
          <div class="portals-container">
            <div class="portal-header">
              <h2>Select Your Portal</h2>
              <p>Secure login required to access operational dashboards.</p>
            </div>

            <a href="http://localhost:5174" class="card distributor">
              <div class="card-content">
                <div class="icon">🌾</div>
                <div>
                  <h3>Distributor Point-of-Sale</h3>
                  <p>For village ration shops. Record distributions, calculate automated family baskets, and perform biometric verifications offline.</p>
                  <div class="btn-text">Launch App &rarr;</div>
                </div>
              </div>
            </a>

            <a href="http://localhost:5173" class="card admin">
              <div class="card-content">
                <div class="icon">🏛️</div>
                <div>
                  <h3>State Admin Dashboard</h3>
                  <p>For government oversight. Monitor statewide inventory logistics, manage distributor credentials, and resolve public complaints.</p>
                  <div class="btn-text">Launch Dashboard &rarr;</div>
                </div>
              </div>
            </a>

            <div class="api-info">
              Backend Online (Port 5000) | <a href="/health">Health Check</a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
