# COMPREHENSIVE BUILD PROMPT
## Offline-First Ration Distribution System

Use this prompt to build the entire project with Claude, ChatGPT, or other AI tools. Provide all context files first, then this prompt.

---

## 🔥 MASTER BUILD PROMPT

```
I'm building an OFFLINE-FIRST Ration Distribution System for rural Karnataka with two main applications:

1. DISTRIBUTOR APP (Offline-First React)
2. GOVT ADMIN PANEL (Online React)
3. BACKEND SERVER (Node.js or FastAPI)
4. DATABASE (PostgreSQL/MySQL backend + PouchDB/CouchDB offline)

CRITICAL REQUIREMENTS:

### ARCHITECTURE & OFFLINE-FIRST DESIGN
- Distributor app MUST work 100% offline using PouchDB
- Sync happens ONLY when internet is available
- Transactions stored locally with status: PENDING → SYNCED
- No real-time validation needed offline
- Unique transaction_id = device_id + timestamp + ration_card_id
- ZERO duplicate distributions allowed (monthly deduplication)

### DATABASE SCHEMA
- Location hierarchy: State → District → Taluk → Village (unique code: KA-DH-HU-001)
- Ration Cards: One card per family, one distribution per month
- Distribution Transactions: Must have transaction_id (UNIQUE), sync_status, conflict tracking
- Sync Queue: Local queue for pending transactions, retries with exponential backoff
- Conflicts Table: Track and resolve duplicates, manual review for fraud
- Distribution Logs: Monthly ledger to prevent duplicates

See database files: pouchdb_couchdb_schema.json, backend_sql_schema.sql

### DISTRIBUTOR APP REQUIREMENTS

**Login Screen**
- Device ID generation (unique per device)
- Username/password login
- Store JWT token locally
- Offline fallback: Login with cached credentials

**Dashboard**
- Sync status indicator (GREEN = synced, RED = offline, YELLOW = pending)
- Pending transactions counter
- Last sync timestamp
- Network status

**Distribution Screen**
- Select Ration Card (cached locally)
- Search by: Card #, Head Name, Aadhaar
- View family members + alive status
- Select grain type + quantity
- Select which family member receives ration
- Authentication popup: Display member photo/name, Ask distributor to click "OK" to authenticate
- Validation:
  * Block if member marked deceased
  * Block if already distributed this month
  * Block if ration card inactive
- Save transaction locally with transaction_id
- Show success message with transaction_id

**Sync Page**
- "Load From Server" button → Pulls latest data
- Shows sync progress (X of Y transactions synced)
- Display synced transactions (green checkmark)
- Display failed transactions (red X)
- Retry button for failed transactions
- Auto-retry on internet reconnect
- Handle conflicts: Show "Review Conflicts" if any

**Complaint Form**
- Type: DEAD_PERSON, FRAUD, DUPLICATE, EXPIRED, OTHER
- Ration Card selection
- Family member selection
- Message/description
- Photo upload (optional)
- Submit offline or online

**Offline Indicator**
- Red banner at top when offline
- Green banner when online
- "Pending Sync: X transactions" message

### GOVT ADMIN PANEL REQUIREMENTS

**Admin Login**
- Email/password
- Token-based auth
- Session timeout (24 hours)
- Role-based access (STATE_ADMIN > DISTRICT_ADMIN > DISTRIBUTOR)

**Dashboard / Analytics**
- Total distributions this month
- Total grain distributed (by type)
- Active ration cards
- Sync status (% synced, pending, conflicts)
- Complaints (open vs resolved)
- Charts: Monthly trends, grain consumption by type, district-wise distribution

**Grain Management**
- Add/update grain types (rice, wheat, dal, jowar)
- Current stock per village
- Reorder level alerts
- Price per unit
- Bulk import prices

**Logistics Management**
- Create shipment: Grain type, quantity, from location, to village
- Track shipment status (PENDING → IN_TRANSIT → DELIVERED)
- Edit delivery dates
- View shipment history

**Admin Management**
- Create distributor accounts (email, password, assign village)
- View all admins (with roles, assigned locations)
- Deactivate/reactivate accounts
- Reset passwords
- View last login timestamp

**User Management (Ration Cards)**
- Search ration card
- View family members
- Manage member status:
  * Mark member as deceased (stops future ration)
  * Reactivate if status wrong
- Create new ration card (bulk CSV import)
- Deactivate entire card

**Conflict Resolution Dashboard**
- View all conflicts (type, status, when created)
- View conflicting transactions (side-by-side)
- Resolution options:
  * Keep first (default)
  * Keep both (mark other as reviewed)
  * Manual review needed
- Add resolution notes

### BACKEND API REQUIREMENTS

All endpoints return JSON with:
```json
{
  "status": "success|error",
  "data": {},
  "message": "",
  "timestamp": "2026-05-05T14:30:00Z"
}
```

**Authentication**
- POST /api/auth/login (email, password, device_id)
  * Returns: { token, user_role, assigned_location, expires_in }
- POST /api/auth/logout
- GET /api/auth/validate-token
- POST /api/auth/refresh-token

**Master Data (for offline sync)**
- GET /api/master/locations (all villages, cached)
- GET /api/master/ration-cards/:location (all cards for location)
- GET /api/master/grains (grain types)
- GET /api/master/distribution-logs/:location (monthly logs)

**Distribution (Core)**
- POST /api/distributions/check-duplicate (ration_card_id, month, year)
  * Returns: { isDuplicate: true|false, lastDistribution: {...} }
- POST /api/distributions/validate-member (ration_card_id, aadhaar)
  * Returns: { valid: true|false, member: {...}, reason: "" }
- POST /api/distributions/record (offline transaction data)
  * Returns: { status, transaction_id, sync_status }
- GET /api/distributions/:transactionId (get status)

**Sync (CRITICAL)**
- POST /api/sync/push (device_id, transactions[], last_sync_timestamp)
  * Process each transaction:
    1. Check if transaction_id exists (duplicate?)
    2. Check if ration_card + month combo exists (duplicate?)
    3. Validate ration card still active
    4. Check member still alive
    5. Update inventory
    6. Create conflict if duplicate
    7. Mark as SYNCED
  * Returns: { synced_count, failed_count, conflicts: [] }
- GET /api/sync/pull (last_sync_timestamp)
  * Returns: { locations, ration_cards, distribution_logs, conflicts }
- GET /api/sync/status/:deviceId
  * Returns: { pending_count, failed_count, last_sync }

**Complaints**
- POST /api/complaints (device_id, type, ration_card_id, message)
  * Returns: { complaint_id, status }
- GET /api/complaints/:deviceId
- GET /api/complaints (admin only, all)
- PUT /api/complaints/:id/resolve (admin, with resolution_notes)

**Admin Only**
- POST /api/admin/users (create distributor/admin)
- GET /api/admin/users (list all, with filters)
- PUT /api/admin/users/:id (edit, deactivate)
- POST /api/admin/grains/purchase (add grain purchase record)
- POST /api/admin/shipments (create shipment)
- PUT /api/admin/shipments/:id (update status)
- GET /api/admin/analytics/dashboard
- GET /api/admin/analytics/monthly-report
- GET /api/admin/conflicts

**Error Handling**
- 400: Invalid input
- 401: Unauthorized
- 403: Forbidden
- 409: Conflict (duplicate transaction)
- 500: Server error
- Include error_code and detailed message

### SYNC LOGIC (MOST CRITICAL)

**Device Side (When Internet Detected)**
1. Get all docs with sync_status = "PENDING"
2. Group into batches (max 100 transactions per request)
3. Send to server: { device_id, transactions: [{...}], last_sync_timestamp }
4. For each successful transaction: Update sync_status = "SYNCED"
5. For each failed: Retry up to 3 times, then mark "FAILED"
6. For each conflict: Mark as "CONFLICT", ask admin to review

**Server Side (Receive Sync)**
1. Validate device_id and token
2. For each transaction:
   a. Check transaction_id uniqueness (exists? → Conflict)
   b. Check ration_card + month (exists? → Conflict)
   c. Check ration card active (inactive? → Conflict)
   d. Check member alive (deceased? → Conflict)
   e. If all pass: Insert distribution, update stock, mark SYNCED
   f. If fails: Add to conflicts table

**Conflict Detection**
```
DUPLICATE_MONTH: Same ration_card, same month, different device
DUPLICATE_TRANSACTION: Same transaction_id (offline → offline duplicate)
SYNC_MISMATCH: Data inconsistency
MISSING_MEMBER: Member deleted/marked dead since offline sync
```

**Resolution**
1. Auto-keep first transaction (earliest created_at)
2. Mark others as CONFLICT
3. Admin sees conflict dashboard
4. Manual review if needed
5. Log resolution with notes

### DEDUPLICATION GUARANTEE

**Monthly Log Table**
- ration_card_id + month + year = UNIQUE key
- Last distribution date stored
- Check BEFORE distribution: SELECT COUNT(*) FROM distributions WHERE ration_card_id = ? AND month = ? AND year = ?
- If count > 0: Block

**Transaction ID Uniqueness**
- transaction_id = device_id + timestamp + ration_card_id
- Stored with UNIQUE constraint
- Even if sync runs twice: Same transaction_id → Duplicate detected

**Local + Server Validation**
- Device: Check against local distribution_logs (offline)
- Server: Check against distributions table (authoritative)
- Match between device & server reduces conflicts

### TECH STACK SPECIFICATIONS

**Frontend**
- React 18+
- Tailwind CSS for styling
- PouchDB for offline storage
- Axios for API calls
- React Router for navigation
- React Query for server state
- Recharts for analytics
- UUID for device_id generation

**Backend (Choose One)**
- **Option A (Recommended): Node.js + Express**
  * express, cors, dotenv, jsonwebtoken, bcryptjs
  * mysql2/promise or pg (PostgreSQL driver)
  * axios for external APIs
  * winston for logging
  * joi for validation

- **Option B: FastAPI + Python**
  * fastapi, uvicorn, python-jose, passlib
  * psycopg2-binary (PostgreSQL) or mysql-connector-python
  * pydantic for validation
  * sqlalchemy for ORM
  * logging for logs

**Database**
- PostgreSQL 13+ (production recommended)
- MySQL 8+ (alternative)
- PouchDB (local on device)
- CouchDB (optional central sync)

### SECURITY REQUIREMENTS

1. **Authentication**
   - JWT tokens with 24-hour expiry
   - Refresh tokens with 7-day expiry
   - Store tokens securely (httpOnly cookies)
   - Device ID validation

2. **Password Security**
   - Bcrypt with salt rounds = 10
   - Minimum 8 characters
   - Require strong password on first login

3. **Data Encryption**
   - HTTPS only for all API calls
   - Encrypt Aadhaar in database (AES-256)
   - Encrypt sensitive PouchDB data

4. **Rate Limiting**
   - 10 requests/minute per device for sync
   - 5 failed login attempts → Lock account 30 minutes
   - 100 requests/minute per IP for APIs

5. **Audit Trail**
   - Log all admin actions with timestamp, user, IP
   - Log all conflict resolutions
   - Log failed sync attempts

### TESTING REQUIREMENTS

**Offline Scenarios**
- ✓ Record distribution without internet
- ✓ App remains responsive offline
- ✓ Data persists locally
- ✓ Sync queue builds up

**Sync Scenarios**
- ✓ Sync when internet reconnects
- ✓ Partial sync (some fail, some succeed)
- ✓ Retry failed transactions
- ✓ Handle network interruption during sync

**Edge Cases**
- ✓ Same distribution attempted from 2 devices simultaneously
- ✓ Device goes offline during sync
- ✓ Server processes same sync request twice
- ✓ Member marked dead after offline distribution
- ✓ Ration card deactivated after offline distribution

**Fraud Prevention**
- ✓ Prevent duplicate monthly distribution
- ✓ Prevent distribution for deceased member
- ✓ Prevent distribution for inactive card
- ✓ Flag suspicious patterns (multiple devices same card)

### DEPLOYMENT & DEVOPS

**Environment Configuration**
- Use .env files (never commit secrets)
- Environment variables for all config
- Separate configs for dev/staging/production

**Database Setup**
- Run migrations on startup
- Seed initial data (grains, locations)
- Automated backups daily
- Point-in-time recovery capability

**Monitoring & Logging**
- API response time tracking
- Sync success/failure rates
- Error logging to central service
- Alerts for critical failures

**CI/CD**
- Automated tests on each commit
- Linting and code formatting
- Security scanning (OWASP)
- Automated deployment to staging
- Manual approval for production

### PERFORMANCE OPTIMIZATION

1. **Batch Processing**
   - Sync up to 100 transactions per request
   - Batch insert for database operations
   - Gzip compression for payloads

2. **Caching**
   - Cache location data (monthly TTL)
   - Cache ration card data (daily TTL)
   - Client-side cache with service workers

3. **Database Optimization**
   - Indexes on frequently queried fields
   - Partitioning distribution table by date
   - Archive old transactions quarterly

4. **Frontend Optimization**
   - Code splitting by route
   - Lazy loading components
   - Service workers for offline support
   - Image optimization

### DELIVERABLES CHECKLIST

**Phase 1: Foundation**
- [ ] Database schema created (PostgreSQL/MySQL)
- [ ] PouchDB schema designed
- [ ] API endpoints documented
- [ ] Authentication system (JWT)

**Phase 2: Distributor App**
- [ ] Login with device ID
- [ ] Offline distribution recording
- [ ] PouchDB integration
- [ ] Sync page with status
- [ ] Complaint form
- [ ] Complete offline workflow

**Phase 3: Admin Panel**
- [ ] Login and role-based access
- [ ] Dashboard with analytics
- [ ] Grain management
- [ ] Logistics tracking
- [ ] User/ration card management
- [ ] Conflict resolution dashboard

**Phase 4: Backend & Integration**
- [ ] All API endpoints implemented
- [ ] Sync engine with deduplication
- [ ] Conflict detection & resolution
- [ ] Authentication & authorization
- [ ] Error handling & validation

**Phase 5: Testing & Optimization**
- [ ] Unit tests for critical functions
- [ ] Integration tests for sync flow
- [ ] Performance testing (concurrent syncs)
- [ ] Security testing
- [ ] User acceptance testing

**Phase 6: Deployment**
- [ ] Production database setup
- [ ] API deployed on server
- [ ] Apps deployed to play store/app store
- [ ] Monitoring & alerting configured
- [ ] Backup & disaster recovery tested

---

## NOTES FOR AI ASSISTANT

1. **Start with Backend First**: Database schema, migrations, API endpoints
2. **Then Distributor App**: Focus on offline-first design
3. **Then Admin Panel**: Standard online React app
4. **Integration Last**: Connect all components

2. **Ask Clarifying Questions About**:
   - Exact location data structure (how many districts/taluks in XLS?)
   - Preferred backend language (Node.js vs FastAPI?)
   - Database preference (PostgreSQL vs MySQL?)
   - Timeline for delivery
   - Testing requirements

3. **Provide Code In This Order**:
   - Migration scripts (load data)
   - Database setup scripts
   - Backend routes & controllers
   - Backend services (sync, dedup)
   - Frontend components
   - Integration code

4. **Use Modern Best Practices**:
   - Async/await over callbacks
   - Proper error handling with try/catch
   - Input validation on all endpoints
   - Logging on important operations
   - Comments for complex logic

5. **Security First**:
   - Never log sensitive data
   - Validate all inputs
   - Use parameterized queries
   - HTTPS only
   - Rate limiting on sensitive endpoints

---

END PROMPT

---

## HOW TO USE THIS PROMPT

### With Claude (claude.ai)

1. Go to claude.ai
2. Create new conversation
3. Upload these files as attachments:
   - pouchdb_couchdb_schema.json
   - backend_sql_schema.sql
   - IMPLEMENTATION_GUIDE.md
   - load_location_data.py
4. Paste this prompt
5. Specify which component to build first
6. Ask Claude to start with specific parts

### Example Follow-up Prompts

**To Start Backend Development:**
```
Based on the schema and API requirements above, build the Node.js backend 
with Express. Start with:
1. Database connection module
2. Authentication middleware & routes
3. Distribution routes (check-duplicate, record, sync/push)
4. Sync engine service with deduplication logic

Use async/await, proper error handling, and logging.
```

**To Start Distributor App:**
```
Build the React distributor app with:
1. PouchDB initialization and schema setup
2. Login screen with device ID generation
3. Distribution form with ration card selection
4. Sync page showing pending transactions
5. Offline indicator component

Use React hooks, Tailwind CSS, and proper state management.
```

**To Start Admin Panel:**
```
Build the React admin panel with:
1. Login & authentication
2. Dashboard with analytics (use Recharts)
3. User management (CRUD for admins/distributors)
4. Analytics dashboard showing:
   - Distribution trends
   - Grain consumption
   - Sync status
   - Pending conflicts

Use React Router, Tailwind, and Recharts.
```

### To Load Your XLS Data

1. Prepare your Excel file with columns:
   - District Name
   - Taluk Name
   - Village Name
   - Village Code
   - Latitude (optional)
   - Longitude (optional)

2. Run the load script:
   ```bash
   # PostgreSQL
   python3 load_location_data.py \
     --file /path/to/villages.xlsx \
     --db-type postgresql \
     --host localhost \
     --user postgres \
     --password yourpassword \
     --database ration_db

   # MySQL
   python3 load_location_data.py \
     --file /path/to/villages.xlsx \
     --db-type mysql \
     --host localhost \
     --user root \
     --password yourpassword \
     --database ration_db
   ```

---

**Version**: 1.0
**Last Updated**: 2026-05-05
**Status**: Ready for Development
