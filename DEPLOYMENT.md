# Live Deployment Guide for Rural Ration Distribution System

This project is built using a modern decoupled architecture:
1. **Frontend (React/Vite)**: Admin Panel and Offline-First Distributor App.
2. **Backend (Node/Express)**: API server for the Admin Panel.
3. **Database (CouchDB + PouchDB)**: Handles real-time cross-device offline syncing natively.

To deploy this project to the public internet, you need to host each of these three components. Below are the detailed steps.

---

## 1. Hosting the Database (CouchDB)

CouchDB is the heart of the real-time offline sync system. PouchDB in the browser talks *directly* to CouchDB.

### Recommended Providers:
- **IBM Cloudant** (Fully managed CouchDB, free tier available).
- **DigitalOcean Droplet / AWS EC2** (Self-hosted using Docker).

### Option A: Using IBM Cloudant (Easiest)
1. Go to [IBM Cloudant](https://cloud.ibm.com/catalog/services/cloudant) and create a free tier account.
2. Create a new Cloudant instance and generate "Service Credentials" (URL, Username, Password).
3. Open the Cloudant dashboard and configure **CORS** (Cross-Origin Resource Sharing) to allow `*` (All domains) so your frontend can connect.
4. Your CouchDB connection string will look like: `https://apikey:password@your-instance.cloudant.com`

### Option B: Self-Hosting on DigitalOcean/AWS via Docker
1. Create a basic Ubuntu server instance.
2. SSH into the server and run CouchDB via Docker:
   ```bash
   docker run -d -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=yourpassword --name couchdb couchdb
   ```
3. Expose port `5984` in your server's firewall.
4. Run the CORS setup script on your server: `node setup_cors.js` (Make sure to point it to your server IP).

---

## 2. Hosting the Backend (Node.js / Express)

The backend serves the API endpoints for the Admin Panel (User Creation, Logistics, Analytics).

### Recommended Provider: Render.com or Heroku

1. Create a free account on [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository containing this project.
4. Set the following configuration:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. **Environment Variables**:
   Add the variables from your local `.env` file, but update the CouchDB URL to your live database.
   ```env
   PORT=5000
   COUCHDB_URL=https://admin:yourpassword@your-database-url.com
   JWT_SECRET=your_super_secret_key_for_production
   ```
6. Click **Create Web Service**. Render will give you a live URL (e.g., `https://ration-backend.onrender.com`).

---

## 3. Hosting the Frontends (React / Vite)

You have two frontend applications: `admin-panel` and `distributor-app`. These are static sites and can be hosted anywhere for free.

### Recommended Provider: Vercel or Netlify

### Deploying the Admin Panel
1. Create a free account on [Vercel](https://vercel.com).
2. Click **Add New** -> **Project** and select your GitHub repository.
3. Configure the Project:
   - **Framework Preset**: Vite
   - **Root Directory**: `admin-panel`
4. Update the backend URL in `admin-panel/src/App.jsx` (or wherever `axios` calls are made) from `http://localhost:5000` to your new live backend URL (e.g., `https://ration-backend.onrender.com`).
   *(Note: For production, it's best to use Vite env variables like `import.meta.env.VITE_BACKEND_URL`)*.
5. Click **Deploy**.

### Deploying the Distributor App
1. Go back to the Vercel Dashboard, click **Add New** -> **Project**, and select the same repository.
2. Configure the Project:
   - **Framework Preset**: Vite
   - **Root Directory**: `distributor-app`
3. **CRITICAL STEP**: Update the database connections!
   Open `distributor-app/src/db.js` and change `COUCHDB_URL` and `authConfig` to match your live CouchDB/Cloudant server.
   ```javascript
   const COUCHDB_URL = 'https://your-database-url.com';
   const authConfig = { auth: { username: 'admin', password: 'yourpassword' } };
   ```
   *Note: In a true production environment, you would use CouchDB per-user databases (PouchDB proxy) or CouchDB JWT authentication instead of hardcoding admin credentials, but this works for deployment testing.*
4. Click **Deploy**.

---

## 4. Initialization & Testing on Live

Once all three parts are deployed:
1. **Initialize DBs**: The backend will automatically create the databases (`users`, `grains`, `distributions`, etc.) upon connection if they do not exist.
2. **Setup Admin**: Run your `reset_db.js` script against the live CouchDB instance to seed the initial `admin` account and logistics flow.
3. **Test Offline**:
   - Open your live Distributor App URL on a mobile phone browser.
   - Login. The app will sync all ration cards locally automatically in the background.
   - Turn on **Airplane Mode** on your phone.
   - Notice you can still search users and record distributions natively.
   - Turn Airplane Mode off. The local changes will instantly sync up to your live CouchDB server without you having to push any buttons.
