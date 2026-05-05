# QUICK REFERENCE GUIDE
## API Endpoints & Deployment Checklist

---

## 🔌 API ENDPOINTS QUICK REFERENCE

### Authentication Endpoints
```
POST /api/auth/login
  Request: { email, password, device_id }
  Response: { token, user_role, assigned_location, expires_in }
  Status: 200 | 401 | 400

GET /api/auth/validate-token
  Headers: Authorization: Bearer {token}
  Response: { valid: true/false, user: {...} }
  Status: 200 | 401

POST /api/auth/refresh-token
  Request: { refresh_token }
  Response: { token, refresh_token, expires_in }
  Status: 200 | 401

POST /api/auth/logout
  Headers: Authorization: Bearer {token}
  Response: { message: "Logged out successfully" }
  Status: 200
```

### Master Data Endpoints (for offline sync)
```
GET /api/master/locations
  Query: ?last_sync={timestamp}
  Response: { locations: [{id, name, code, latitude, longitude}] }
  Status: 200 | 400
  Cache: 1 hour

GET /api/master/ration-cards/:locationCode
  Query: ?include_logs=true
  Response: { ration_cards: [{...}], distribution_logs: [{...}] }
  Status: 200 | 404
  Cache: 24 hours

GET /api/master/grains
  Response: { grains: [{id, name, code, unit}] }
  Status: 200
  Cache: 7 days

GET /api/master/distribution-logs/:locationCode
  Response: { logs: [{ration_card_id, month, year, last_distribution_date}] }
  Status: 200 | 404
  Cache: daily
```

### Distribution Validation Endpoints
```
POST /api/distributions/check-duplicate
  Request: { ration_card_id, month, year }
  Response: { 
    isDuplicate: true/false,
    lastDistribution: { date, quantity, grain },
    month_distribution_count: 1
  }
  Status: 200 | 400 | 404

POST /api/distributions/validate-member
  Request: { ration_card_id, aadhaar_number }
  Response: { 
    valid: true/false,
    member: { name, age, relation, is_alive },
    reason: "Member deceased" // if invalid
  }
  Status: 200 | 400 | 404

POST /api/distributions/validate-card
  Request: { ration_card_id }
  Response: {
    valid: true/false,
    card: { card_number, is_active, family_size },
    reason: "Card inactive" // if invalid
  }
  Status: 200 | 400 | 404
```

### Core Distribution Endpoint
```
POST /api/distributions/record
  Headers: Authorization: Bearer {token}
  Request: {
    transaction_id: "DEV123_20260505_143022_RC0001",
    device_id: "DEV123",
    ration_card_id: "RC0001",
    grain_code: "RICE_001",
    quantity: 15,
    authenticated_member_aadhaar: "1234-5678-9012",
    distribution_date: "2026-05-05T14:30:22Z",
    notes: "Regular distribution"
  }
  Response: {
    status: "recorded",
    transaction_id: "...",
    sync_status: "PENDING",
    message: "Recorded locally"
  }
  Status: 201 | 400 | 409 (conflict) | 401 (auth)
```

### Sync Endpoints (CRITICAL)
```
POST /api/sync/push
  Headers: Authorization: Bearer {token}
  Request: {
    device_id: "DEV123",
    last_sync_timestamp: "2026-05-05T10:00:00Z",
    transactions: [
      {
        transaction_id: "...",
        action_type: "CREATE",
        payload: { type: "distribution", ... }
      }
    ]
  }
  Response: {
    synced_count: 45,
    failed_count: 2,
    conflicts: [
      {
        transaction_id: "...",
        conflict_type: "DUPLICATE_MONTH",
        resolution: "manual_review_needed"
      }
    ],
    sync_timestamp: "2026-05-05T14:30:00Z"
  }
  Status: 200 | 400 | 409 (conflicts) | 401
  Rate Limit: 10 requests/minute per device

GET /api/sync/pull
  Query: ?last_sync={timestamp}&location={locationCode}
  Response: {
    distributions: [{...}],  // for conflict resolution
    ration_card_updates: [{...}],
    status_changes: [{...}],
    conflicts: [{...}],
    sync_timestamp: "2026-05-05T14:30:00Z"
  }
  Status: 200 | 400
  Cache: 5 minutes

GET /api/sync/status/:deviceId
  Headers: Authorization: Bearer {token}
  Response: {
    pending_count: 5,
    synced_count: 45,
    failed_count: 2,
    last_sync: "2026-05-05T14:30:00Z",
    next_retry_at: "2026-05-05T14:35:00Z"
  }
  Status: 200 | 404 | 401
```

### Complaint Endpoints
```
POST /api/complaints
  Headers: Authorization: Bearer {token}
  Request: {
    complaint_type: "DEAD_PERSON|FRAUD|DUPLICATE|EXPIRED|OTHER",
    ration_card_id: "RC0001",
    member_aadhaar: "1234-5678-9012",
    message: "Member deceased in March",
    evidence_url: "s3://bucket/photo.jpg" (optional)
  }
  Response: { 
    complaint_id: "COMP20260505001",
    status: "OPEN",
    created_at: "2026-05-05T15:00:00Z"
  }
  Status: 201 | 400 | 401

GET /api/complaints/:deviceId
  Headers: Authorization: Bearer {token}
  Response: { complaints: [{...}] }
  Status: 200 | 401

GET /api/complaints (ADMIN ONLY)
  Headers: Authorization: Bearer {token}
  Query: ?status=OPEN&type=DEAD_PERSON&page=1
  Response: { complaints: [{...}], total_count: 150, page: 1 }
  Status: 200 | 403 | 401

PUT /api/complaints/:complaintId/resolve
  Headers: Authorization: Bearer {token}
  Request: { resolution_notes: "...", action_taken: "..." }
  Response: { 
    complaint_id: "...",
    status: "RESOLVED",
    resolved_at: "2026-05-05T16:00:00Z"
  }
  Status: 200 | 403 | 404 | 401
```

### Admin Endpoints (Role: STATE_ADMIN or DISTRICT_ADMIN)
```
POST /api/admin/users
  Request: {
    email: "distributor@example.com",
    password: "SecurePass123",
    first_name: "John",
    last_name: "Doe",
    role: "DISTRIBUTOR",
    assigned_village_id: 123,
    device_id: "DEV123"
  }
  Response: { user_id: 456, email: "...", credentials_generated: true }
  Status: 201 | 400 | 403 | 401

GET /api/admin/users
  Query: ?role=DISTRIBUTOR&village_id=123&is_active=true
  Response: { users: [{...}], total_count: 50 }
  Status: 200 | 403 | 401

PUT /api/admin/users/:userId
  Request: { is_active: false, assigned_village_id: 124, ... }
  Response: { user_id: 456, updated_fields: [...] }
  Status: 200 | 400 | 403 | 404 | 401

POST /api/admin/grains
  Request: {
    name: "Rice (White)",
    code: "RICE_001",
    unit: "kg",
    quantity: 5000,
    price_per_unit: 25,
    location_id: 123
  }
  Response: { grain_id: 789, stock_id: 890 }
  Status: 201 | 400 | 403 | 401

POST /api/admin/shipments
  Request: {
    grain_id: 789,
    quantity: 1000,
    from_location: "STATE_WAREHOUSE",
    to_village_id: 123,
    scheduled_date: "2026-05-10T00:00:00Z"
  }
  Response: { shipment_id: "SHIP20260505001" }
  Status: 201 | 400 | 403 | 401

GET /api/admin/analytics/dashboard
  Response: {
    total_distributions_this_month: 1500,
    total_grain_distributed: { RICE_001: 22500, WHEAT: 15000 },
    active_ration_cards: 5000,
    sync_status: { synced: 1450, pending: 45, conflicts: 5 },
    complaints: { open: 12, resolved: 450 },
    charts: {
      daily_distributions: [{date, count}],
      grain_consumption: [{grain, quantity}],
      district_distributions: [{district, count}]
    }
  }
  Status: 200 | 403 | 401

GET /api/admin/conflicts
  Query: ?status=PENDING&page=1
  Response: {
    conflicts: [{...}],
    total_count: 25,
    page: 1
  }
  Status: 200 | 403 | 401

PUT /api/admin/conflicts/:conflictId/resolve
  Request: {
    resolution: "KEEP_FIRST|KEEP_BOTH|MANUAL_REVIEW",
    notes: "...",
    action: "ACCEPT|REJECT|INVESTIGATE"
  }
  Response: { conflict_id: "...", status: "RESOLVED" }
  Status: 200 | 400 | 403 | 404 | 401
```

---

## ⚠️ HTTP STATUS CODES & ERROR RESPONSES

### Success Codes
```
200 OK
  Successful GET, PUT, DELETE

201 Created
  Successful POST that creates a resource

204 No Content
  Successful DELETE with no response body
```

### Client Error Codes
```
400 Bad Request
  {
    "status": "error",
    "code": "INVALID_INPUT",
    "message": "Missing required field: ration_card_id",
    "details": { "field": "ration_card_id", "error": "required" }
  }

401 Unauthorized
  {
    "status": "error",
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }

403 Forbidden
  {
    "status": "error",
    "code": "FORBIDDEN",
    "message": "You don't have permission to perform this action",
    "required_role": "STATE_ADMIN"
  }

404 Not Found
  {
    "status": "error",
    "code": "NOT_FOUND",
    "message": "Ration card not found",
    "resource_id": "RC0001"
  }

409 Conflict
  {
    "status": "error",
    "code": "DUPLICATE_TRANSACTION",
    "message": "Transaction ID already exists",
    "conflict_transaction_id": "...",
    "action": "resolve_manually"
  }
  
  OR (for duplicate distribution)
  
  {
    "status": "error",
    "code": "DUPLICATE_MONTH",
    "message": "Ration already distributed this month",
    "last_distribution": { date, quantity },
    "action": "contact_admin"
  }

429 Too Many Requests
  {
    "status": "error",
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again in 60 seconds",
    "retry_after": 60
  }
```

### Server Error Codes
```
500 Internal Server Error
  {
    "status": "error",
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "error_id": "ERR_20260505_143022_abc123"
  }

503 Service Unavailable
  {
    "status": "error",
    "code": "SERVICE_UNAVAILABLE",
    "message": "Server is temporarily unavailable",
    "estimated_recovery": "2026-05-05T14:35:00Z"
  }
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment (1-2 weeks before)

#### Code Quality
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed
- [ ] No console.log statements in production code
- [ ] Error handling implemented everywhere
- [ ] Logging configured for all critical operations
- [ ] API documentation complete and accurate

#### Security
- [ ] All secrets removed from code
- [ ] Environment variables documented
- [ ] OWASP top 10 vulnerabilities checked
- [ ] SQL injection prevention verified
- [ ] XSS prevention implemented
- [ ] CSRF tokens implemented
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Password policy enforced

#### Database
- [ ] Database schema created and tested
- [ ] Migrations written and tested
- [ ] Indexes created on critical fields
- [ ] Backup strategy documented
- [ ] Disaster recovery plan tested
- [ ] Database connection pooling configured
- [ ] Query performance optimized

#### Performance
- [ ] API response time < 200ms (p95)
- [ ] Sync payload compression enabled
- [ ] Database query optimization complete
- [ ] Caching strategy implemented
- [ ] Load testing completed (concurrent users: 1000)
- [ ] Memory leaks tested and fixed

#### Infrastructure
- [ ] Server provisioned (CPU: 4 cores, RAM: 8GB, SSD: 100GB)
- [ ] SSL certificates obtained
- [ ] Load balancer configured (if needed)
- [ ] CDN configured (if needed)
- [ ] DNS records prepared
- [ ] Firewall rules configured
- [ ] Database backup storage configured

#### Monitoring & Logging
- [ ] Application logging configured
- [ ] Error tracking service integrated (Sentry, etc.)
- [ ] Performance monitoring configured (New Relic, etc.)
- [ ] Database monitoring configured
- [ ] Alert rules configured
- [ ] Log retention policies set (30 days minimum)
- [ ] Uptime monitoring configured

### During Deployment (Day Before)

#### Final Checks
- [ ] Latest code deployed to staging
- [ ] All staging tests passing
- [ ] Data migration scripts tested on staging
- [ ] Rollback plan documented
- [ ] Deployment runbook prepared
- [ ] Team briefing completed
- [ ] Communication channels ready (Slack, etc.)

#### Backup & Recovery
- [ ] Database backed up
- [ ] Current codebase backed up
- [ ] Previous version tag created in Git
- [ ] Rollback scripts tested
- [ ] Disaster recovery procedure reviewed

### Deployment Day (Morning)

#### Pre-Deployment (2 hours before)
- [ ] Maintenance window scheduled (30 minutes)
- [ ] Status page created
- [ ] Users notified of maintenance
- [ ] Team on standby
- [ ] Deployment tools tested
- [ ] Monitoring dashboards open

#### Deployment Steps
1. [ ] Stop all incoming requests (graceful shutdown)
2. [ ] Backup current database
3. [ ] Run database migrations
4. [ ] Deploy new code
5. [ ] Run smoke tests
6. [ ] Enable traffic gradually (0% → 10% → 50% → 100%)
7. [ ] Monitor error rates & performance
8. [ ] Collect team feedback

#### Post-Deployment (30 minutes - 2 hours after)
- [ ] All health checks passing
- [ ] Error rates normal
- [ ] Performance metrics normal
- [ ] Users accessing without issues
- [ ] Database replication healthy
- [ ] Logs show no errors
- [ ] Monitoring alerts working

### Post-Deployment (1 week after)

#### Monitoring & Validation
- [ ] Zero critical errors in production
- [ ] API response times stable
- [ ] Sync success rate > 99%
- [ ] No spike in support tickets
- [ ] User feedback positive
- [ ] Performance metrics as expected

#### Documentation
- [ ] Deployment documented
- [ ] Issues encountered documented
- [ ] Lessons learned captured
- [ ] Runbook updated
- [ ] User guide updated if needed

#### Hotfix Readiness
- [ ] Hotfix process documented
- [ ] Critical issue response plan ready
- [ ] Team trained on rollback procedure
- [ ] Deployment slots configured for quick deploy

---

## 📋 ENVIRONMENT VARIABLES

### Backend Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/ration_db
DB_POOL_SIZE=20

# JWT & Security
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRY=24h
REFRESH_TOKEN_SECRET=another-secret-key
REFRESH_TOKEN_EXPIRY=7d
BCRYPT_ROUNDS=10

# Sync Configuration
SYNC_BATCH_SIZE=100
SYNC_TIMEOUT=30000
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_MULTIPLIER=2

# API
API_PORT=3000
API_BASE_URL=https://api.example.com
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/ration-api.log

# Monitoring
SENTRY_DSN=https://key@sentry.io/project
NEW_RELIC_APP_NAME=Ration-Distribution-API

# Email (for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@example.com
SMTP_PASSWORD=app-password

# File Storage (for evidence photos)
S3_BUCKET=ration-evidence
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx

# Environment
NODE_ENV=production
DEBUG=false
```

### Frontend Environment Variables
```bash
# Distributor App (.env)
REACT_APP_API_URL=https://api.example.com
REACT_APP_SYNC_INTERVAL=5000
REACT_APP_OFFLINE_ENABLED=true
REACT_APP_DB_NAME=ration_distribution_local

# Admin Panel (.env)
REACT_APP_API_URL=https://api.example.com
REACT_APP_AUTH_ENDPOINT=/api/auth/login
REACT_APP_ADMIN_MODE=true
```

---

## 🔍 MONITORING DASHBOARDS

### Key Metrics to Track

**System Health**
- API response time (target: <200ms p95)
- API error rate (target: <0.1%)
- Database connection pool usage
- Server CPU usage (target: <70%)
- Server memory usage (target: <80%)
- Disk space usage (target: <80%)

**Business Metrics**
- Total distributions (daily/monthly)
- Sync success rate (target: >99%)
- Average sync time (target: <10 seconds)
- Conflict detection rate
- User complaints
- Device sync status distribution

**Sync Engine Metrics**
- Transactions pending sync
- Transactions synced (total)
- Transactions failed
- Conflicts created
- Conflicts resolved
- Average sync batch size

---

## 🆘 ROLLBACK PROCEDURE

If deployment fails or causes critical issues:

```bash
# 1. Stop incoming traffic
# 2. Run rollback script
bash scripts/rollback.sh version=v1.0.0

# 3. Verify previous version working
curl https://api.example.com/health

# 4. Notify users
# 5. Investigate root cause
# 6. Fix and test before re-deploying

# Rollback time: < 10 minutes
# Zero data loss guaranteed (database unchanged)
```

---

**Last Updated**: 2026-05-05
**Version**: 1.0
