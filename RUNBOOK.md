# 🚀 Offline-First Ration Tracker — Project Runbook

This document contains all the necessary instructions to start, test, and troubleshoot the Offline-First Ration Distribution System. **Keep this file updated** as the project evolves.

---

## 🗂️ Project Folder Structure

```
FS06-Offline_rural_ration_tracker/
├── backend/          → Node.js + Express API server (Port 5000)
├── distributor-app/  → React/Vite PWA for village distributors (Port 5174)
├── state-admin/      → React/Vite dashboard for State Admins (Port 5173)
│   (previously named admin-panel)
└── RUNBOOK.md        → This file
```

> **Note**: The `admin-panel` folder was renamed to `state-admin`. If renaming fails due to a running server, stop the server first (`Ctrl+C`) and run in a new terminal:
> ```powershell
> Rename-Item "C:\Hackathon\FS06-Offline_rural_ration_tracker\admin-panel" "state-admin"
> ```

---

## 🛠️ Prerequisites & Database Setup

The project uses **CouchDB** as its central database for offline-first synchronization.

1. **Ensure CouchDB is Running**:
   - UI (Fauxton): `http://127.0.0.1:5984/_utils/`
   - Credentials: `admin` / `shri`
   - Databases created: `admin_users`, `distributions`

2. **Enable CORS** *(CRITICAL — do this once after installing CouchDB)*:
   ```bash
   npm install -g add-cors-to-couchdb
   add-cors-to-couchdb http://admin:shri@127.0.0.1:5984
   ```

3. **Lockout Fix**: If CouchDB temporarily locks the account due to wrong password attempts:
   - Open Windows **Services** app → Find **"Apache CouchDB"** → **Restart**

---

## 🏃‍♂️ How to Launch (3 Terminals Required)

### 🟢 Terminal 1 — Backend API + Landing Page
```bash
cd C:\Hackathon\FS06-Offline_rural_ration_tracker\backend
npm run dev
```
Runs on: **`http://localhost:5000`**
- Visit `http://localhost:5000` to see the **Portal Launcher** (links to both apps)
- `/health` → API health check
- `/api/auth/login` → Authentication endpoint
- `/api/admin/dashboard` → Live analytics data

### 🟡 Terminal 2 — Distributor App
```bash
cd C:\Hackathon\FS06-Offline_rural_ration_tracker\distributor-app
npm run dev -- --force
```
Runs on: **`http://localhost:5174`**

### 🔵 Terminal 3 — State Admin Portal
```bash
cd C:\Hackathon\FS06-Offline_rural_ration_tracker\state-admin
npm run dev
```
Runs on: **`http://localhost:5173`**

---

## 🔗 Quick Access Links

| Portal | URL | Description |
|---|---|---|
| **Launch Hub** | `http://localhost:5000` | Links to both apps |
| **Distributor Login** | `http://localhost:5174/login` | Village distributor portal |
| **State Admin Login** | `http://localhost:5173/login` | State analytics dashboard |
| **CouchDB UI** | `http://127.0.0.1:5984/_utils/` | Database management |
| **API Health** | `http://localhost:5000/health` | Backend status |

---

## 🔑 Login Credentials

Users are stored in CouchDB's `admin_users` database. If the database is wiped, run `node seed.js` in the backend folder to recreate them.

### 📦 Distributor App (`http://localhost:5174/login`)
- **Username**: `village_dist`
- **Password**: `password123`
- **Role**: `DISTRIBUTOR` — can record offline distributions and raise complaints

### 🛡️ State Admin Portal (`http://localhost:5173/login`)
- **Username**: `shri_admin`
- **Password**: `password123`
- **Role**: `STATE_ADMIN` — can view analytics and manage the system

---

## 💡 Important Notes & Troubleshooting

### Tailwind/PostCSS Error
If you see `Cannot find module tailwindcss/dist/lib.js`:
```bash
cd distributor-app
rmdir /s /q node_modules\.vite
npm run dev -- --force
```
This is fixed permanently via `css: { postcss: {} }` in `vite.config.js`. The `--force` flag is only needed once after each cache corruption.

### Offline Testing (Demo tip!)
1. Open Distributor App in the browser
2. Open **DevTools** (F12) → **Network** tab → set throttle to **"Offline"**
3. Record distributions — they save locally in PouchDB with `PENDING` status
4. Go back **Online** → navigate to **Sync** page → click **"Start Live Sync"**
5. Check CouchDB Fauxton UI — the documents appear in the `distributions` database!

### Re-seeding Users
If the `admin_users` database is deleted or CouchDB is reinstalled:
```bash
cd C:\Hackathon\FS06-Offline_rural_ration_tracker\backend
node seed.js
```

### Architecture Summary
- `admin_users` (CouchDB) → Stores login credentials (bcrypt-hashed passwords)
- `distributions` (CouchDB/PouchDB) → Offline transaction records (synced via PouchDB live replication)
- `complaints` (Local PouchDB) → Offline complaint records (manual sync pending)

---

*Last updated: May 2026 — Update this file whenever ports, credentials, or architecture changes!*
