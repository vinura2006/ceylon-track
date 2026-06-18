# Ceylon Track 🚂

> Real-Time Passenger Information System for Sri Lanka Railway

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Web Framework | Express.js |
| Database | PostgreSQL 14+ with PostGIS |
| Auth | JWT (jsonwebtoken) + bcrypt + httpOnly cookies |
| Frontend | HTML5 / CSS3 / Vanilla JS + Service Worker |
| Deployment | Railway.app / local |

---

## Prerequisites

- **Node.js** 18 or later
- **PostgreSQL** 14 or later with the **PostGIS** extension installed
- `psql` CLI available in your PATH

---

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/vinura2006/ceylon-track.git
cd ceylon-track
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
# Edit .env and fill in your DATABASE_URL, JWT_SECRET, GPS_DEVICE_TOKEN, etc.
```

Required `.env` keys:

| Key | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | At least 32 random characters |
| `JWT_EXPIRES_IN` | e.g. `15m` |
| `REFRESH_TOKEN_SECRET` | At least 32 random characters |
| `REFRESH_TOKEN_EXPIRES_IN` | e.g. `7d` |
| `GPS_DEVICE_TOKEN` | Secret token for GPS hardware |
| `STAFF_ACCESS_CODE` | Code staff use to claim the staff role |
| `CORS_ORIGIN` | Allowed origin (e.g. `http://localhost:3000`) |
| `NODE_ENV` | `development` or `production` |

### 4. Run the database schema
```bash
psql -d ceylon_track -f database/schema.sql
```

### 5. Apply app-level migrations (indexes, reliability cache, refresh tokens)
```bash
npm run migrate
# or manually:
psql -d ceylon_track -f database/app_tables_migration.sql
psql -d ceylon_track -f database/add_missing_indexes.sql
```

### 6. Seed the database
```bash
psql -d ceylon_track -f database/seed.sql
```

Seed credentials:

| Email | Password | Role |
|---|---|---|
| passenger@ceylon.lk | Pass123! | Passenger |
| staff@ceylon.lk | Staff123! | Staff |
| admin@ceylon.lk | Admin123! | Admin |

### 7. Start the server
```bash
npm start          # production
npm run dev        # development (nodemon)
```

Server runs at **http://localhost:3000** by default.

---

## npm Scripts

| Script | Description |
|---|---|
| `npm start` | Start backend server |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm run migrate` | Apply all DB migrations in order |
| `npm run seed` | Seed the database |
| `npm test` | Run Jest unit tests |
| `npm run test:api` | Run the end-to-end API test suite |

---

## API Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login — sets `refreshToken` httpOnly cookie |
| POST | `/api/auth/refresh` | Cookie | Rotate access token using httpOnly cookie |
| POST | `/api/auth/logout` | Cookie | Revoke refresh token and clear cookie |
| GET | `/api/auth/me` | Yes (any) | Get current user profile |
| GET | `/api/schedules/all` | No | List all active schedules (cached 2 min) |
| GET | `/api/schedules/search` | No | Search trains (`?from=FOT&to=KAN&date=YYYY-MM-DD`) |
| GET | `/api/schedules/:id/route` | No | Get all route stops in sequence |
| GET | `/api/stations` | No | List all stations (cached 5 min) |
| POST | `/api/stations` | Yes (Admin) | Add a new station |
| GET | `/api/watch` | Yes (Passenger) | Get user's watched journeys |
| POST | `/api/watch` | Yes (Passenger) | Subscribe to a journey |
| DELETE | `/api/watch/:id` | Yes (Passenger) | Remove a journey watch |
| GET | `/api/staff/stats` | Yes (Staff/Admin) | Live dashboard statistics |
| POST | `/api/staff/trains/:id/status` | Yes (Staff/Admin) | Update train status |
| POST | `/api/staff/stations` | Yes (Admin) | Add a new station |
| POST | `/api/staff/schedules` | Yes (Admin) | Add a new schedule |
| GET | `/api/gps/:trainId` | Yes (any) | Get live GPS for a train |
| POST | `/api/gps/update` | GPS Token | Push GPS coordinates (hardware endpoint) |
| GET | `/api/disruptions` | No | Schedules with reliability < 60% |
| GET | `/health` | No | Health check |

### Status values for POST /api/staff/trains/:id/status
```json
{ "status": "ON_TIME" | "DELAYED" | "CANCELLED", "delay_minutes": 0, "notes": "..." }
```

---

## Running Tests

```bash
# End-to-end API test (requires running server + seeded DB)
npm run test:api

# Jest unit tests (no server needed)
npm test
```

**Expected API test output:**
```
Total: 24 passed, 0 failed / 24
```

---

## Architecture Notes

### Authentication
- **Access tokens** (`JWT`): 15-minute lifetime, sent as `Authorization: Bearer <token>` header.
- **Refresh tokens**: stored as `httpOnly; SameSite=Strict` cookie — never exposed to JavaScript.
- **Token revocation**: in-memory blacklist warmed on startup from the DB; cleaned daily.

### Caching
- Station list: 5-minute in-process TTL cache (`utils/simpleCache`).
- All-schedules endpoint: 2-minute in-process TTL cache.
- Schedule reliability: pre-computed `schedule_reliability_cache` table, refreshed every 10 minutes by `jobs/reliabilityRefresh.js`.

### Background Jobs
| Job | Interval | Purpose |
|---|---|---|
| `notificationChecker.js` | Every 5 min | Push WebSocket alerts to journey watchers |
| `reliabilityRefresh.js` | Every 10 min | Recompute on-time % into cache table |
| `cleanup.js` | Daily | Remove expired refresh tokens, old blacklist entries, stale trip data |

### WebSocket
Connects at `ws://host:3000`. Clients subscribe with `{ type: 'subscribe', scheduleId: N }`. The server pushes `status_update` events only to relevant subscribers.

---

## Deployment

### 🟠 AWS Free Tier (Recommended — CloudFormation)

Deploy with a single command using the included CloudFormation template.
Provisions EC2 `t2.micro` + RDS `db.t3.micro` (PostgreSQL 16 + PostGIS) — **$0 for 12 months**.

```bash
aws cloudformation create-stack \
  --stack-name ceylon-track \
  --template-body file://deploy/cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=YOUR_KEY_PAIR \
    ParameterKey=DBPassword,ParameterValue=YOUR_DB_PASSWORD \
    ParameterKey=JWTSecret,ParameterValue=YOUR_JWT_SECRET_32CHARS \
    ParameterKey=RefreshTokenSecret,ParameterValue=YOUR_REFRESH_SECRET \
    ParameterKey=GPSDeviceToken,ParameterValue=YOUR_GPS_TOKEN \
    ParameterKey=StaffAccessCode,ParameterValue=YOUR_STAFF_CODE
```

📖 **Full step-by-step guide:** [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md)

---

## Deployment (Railway.app)

1. Push your code to GitHub.
2. Create a new Railway project and connect the repository.
3. Add a **PostgreSQL** plugin in Railway — it will set `DATABASE_URL` automatically.
4. Add the following environment variables in Railway's dashboard:

```
NODE_ENV=production
JWT_SECRET=<strong random string, 32+ chars>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<strong random string, 32+ chars>
REFRESH_TOKEN_EXPIRES_IN=7d
CORS_ORIGIN=https://your-app.railway.app
GPS_DEVICE_TOKEN=<token for GPS devices>
STAFF_ACCESS_CODE=<staff registration code>
```

5. After first deploy, run migrations via Railway's shell:
```bash
psql $DATABASE_URL -f database/schema.sql
psql $DATABASE_URL -f database/app_tables_migration.sql
psql $DATABASE_URL -f database/add_missing_indexes.sql
```

6. Your app will be live at `https://your-app.railway.app`.

> **Note:** `Procfile` already sets `web: node backend/index.js`. No changes needed.

---

## Project Structure

```
ceylon-track/
├── backend/
│   ├── index.js                    # Express + WebSocket entry point
│   ├── routes/
│   │   ├── auth.js                 # Register / login / refresh / logout
│   │   ├── schedules.js            # Schedule search + reliability
│   │   ├── stations.js             # Station CRUD
│   │   ├── staff.js                # Staff dashboard + train status
│   │   ├── watch.js                # Journey watch subscriptions
│   │   ├── gps.js                  # GPS hardware endpoint
│   │   └── disruptions.js          # Disruption feed
│   ├── middleware/
│   │   ├── authenticate.js         # JWT verification + revocation check
│   │   ├── authorize.js            # Role-based access control
│   │   ├── loginThrottle.js        # Brute-force protection
│   │   └── validate.js             # express-validator chains
│   ├── jobs/
│   │   ├── notificationChecker.js  # Journey watch push alerts
│   │   ├── reliabilityRefresh.js   # Reliability cache updater
│   │   └── cleanup.js              # Daily housekeeping
│   ├── utils/
│   │   ├── simpleCache.js          # In-process TTL cache
│   │   └── auditLogger.js          # Staff action audit log
│   ├── db/pool.js                  # PostgreSQL connection pool
│   ├── websocket.js                # WebSocket server
│   ├── test-api.js                 # End-to-end API test suite
│   └── tests/unit/                 # Jest unit tests
│       ├── auth.test.js
│       ├── schedules.test.js
│       └── gps.test.js
├── frontend/
│   ├── index.html                  # Homepage / search
│   ├── results.html                # Search results
│   ├── watch.html                  # Journey watch list
│   ├── admin.html                  # Admin dashboard
│   ├── staff-app.html              # Staff interface
│   ├── login.html / register.html
│   ├── js/
│   │   ├── api.js                  # Shared HTTP + auth client
│   │   ├── auth.js                 # In-memory token management module
│   │   └── config.js               # Dynamic API URL helper
│   └── sw.js                       # Service Worker (offline shell caching)
├── database/
│   ├── schema.sql                  # Full DB schema
│   ├── seed.sql                    # Sample data (with prod guard)
│   ├── app_tables_migration.sql    # Refresh tokens, reliability cache, blacklist
│   ├── add_missing_indexes.sql     # Performance indexes
│   ├── add_gps_columns.sql         # GPS migration
│   └── create_journey_watch.sql    # JourneyWatch migration
├── .editorconfig                   # Code style / indent settings
├── .gitattributes                  # LF line endings enforcement
├── .env.example                    # Environment variable template
└── Procfile                        # Railway.app entry point
```

---

*© 2026 Ceylon Track — Real-Time Passenger Information for Sri Lanka Railways*


---

## Prerequisites

- **Node.js** 18 or later
- **PostgreSQL** 14 or later with the **PostGIS** extension installed
- `psql` CLI available in your PATH

---

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/vinura2006/ceylon-track.git
cd ceylon-track
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
# Edit .env and fill in your DATABASE_URL, JWT_SECRET, etc.
```

### 4. Run the database schema
```bash
psql -d ceylon_track -f database/schema.sql
```

### 5. Seed the database
```bash
psql -d ceylon_track -f database/seed.sql
```

Seed credentials:

| Email | Password | Role |
|---|---|---|
| passenger@ceylon.lk | Pass123! | Passenger |
| staff@ceylon.lk | Staff123! | Staff |
| admin@ceylon.lk | Admin123! | Admin |

### 6. Apply GPS migration
```bash
psql -d ceylon_track -f database/add_gps_columns.sql
```

### 7. Start the server
```bash
npm start
# or in development:
npm run dev
```

Server runs at **http://localhost:3000** by default.

---

## API Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/auth/me` | Yes (any) | Get current user profile |
| GET | `/api/schedules/search` | No | Search trains (`?from=FOT&to=KAN&date=YYYY-MM-DD`) |
| GET | `/api/schedules/:id` | No | Get schedule detail with stops |
| GET | `/api/schedules/:id/route` | No | Get all route stops in sequence |
| GET | `/api/stations` | No | List all stations |
| GET | `/api/watch` | Yes (Passenger) | Get user's watched journeys |
| POST | `/api/watch` | Yes (Passenger) | Subscribe to a journey |
| DELETE | `/api/watch/:id` | Yes (Passenger) | Remove a journey watch |
| GET | `/api/staff/stats` | Yes (Staff/Admin) | Live dashboard statistics |
| POST | `/api/staff/trains/:id/status` | Yes (Staff/Admin) | Update train status |
| POST | `/api/staff/stations` | Yes (Admin) | Add a new station |
| POST | `/api/staff/schedules` | Yes (Admin) | Add a new schedule |
| GET | `/api/gps/:trainId` | Yes (any) | Get live GPS for a train |
| POST | `/api/gps/update` | GPS Token | Push GPS coordinates |
| GET | `/api/disruptions` | Yes (any) | Schedules with reliability < 60% |
| GET | `/health` | No | Health check |

### Status values for POST /api/staff/trains/:id/status
```json
{ "status": "ON_TIME" | "DELAYED" | "CANCELLED", "delay_minutes": 0, "notes": "..." }
```

---

## Running Tests

```bash
node backend/test-api.js
```

Requires a running server and seeded database. Uses Node 18+ built-in `fetch` — no extra dependencies.

Expected output:
```
[PASS] POST /api/auth/register → 201
[PASS] POST /api/auth/register duplicate → 409
...
Total: 22 passed, 0 failed / 22
```

---

## Deployment (Railway.app)

1. Push your code to GitHub.
2. Create a new Railway project and connect the repository.
3. Add a **PostgreSQL** plugin in Railway — it will set `DATABASE_URL` automatically.
4. Add the following environment variables in Railway's dashboard:

```
NODE_ENV=production
JWT_SECRET=<strong random string>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-app.railway.app
GPS_DEVICE_TOKEN=<token for GPS devices>
```

5. After first deploy, run migrations via Railway's shell or by temporarily adding a startup script:
```bash
psql $DATABASE_URL -f database/schema.sql
psql $DATABASE_URL -f database/seed.sql
psql $DATABASE_URL -f database/add_gps_columns.sql
```

6. Your app will be live at `https://your-app.railway.app`.

> **Note:** `Procfile` already sets `web: node backend/index.js`. No changes needed.

---

## Project Structure

```
ceylon-track/
├── backend/
│   ├── index.js              # Express app entry point
│   ├── routes/               # API route handlers
│   │   ├── auth.js
│   │   ├── schedules.js
│   │   ├── staff.js
│   │   ├── watch.js
│   │   ├── gps.js
│   │   └── disruptions.js
│   ├── middleware/           # JWT authentication + role authorization
│   ├── db/pool.js            # PostgreSQL connection pool
│   └── test-api.js           # API test suite (Node 18 fetch)
├── frontend/
│   ├── index.html            # Homepage / search
│   ├── results.html          # Search results
│   ├── watch.html            # Journey watch list
│   ├── admin.html            # Staff/Admin dashboard
│   ├── login.html            # Login page
│   └── register.html         # Registration page
├── database/
│   ├── schema.sql            # Full DB schema
│   ├── seed.sql              # Sample data
│   ├── add_gps_columns.sql   # GPS migration
│   └── create_journey_watch.sql # JourneyWatch migration
├── .env.example              # Environment variable template
└── Procfile                  # Railway.app entry point
```

---

## Manual Actions Required After Setup

| Action | Command |
|---|---|
| Apply GPS columns migration | `psql -d ceylon_track -f database/add_gps_columns.sql` |
| Apply JourneyWatch migration (if schema not fresh) | `psql -d ceylon_track -f database/create_journey_watch.sql` |
| Set environment variables | Edit `.env` from `.env.example` |
| Verify PostGIS installed | `psql -d ceylon_track -c "SELECT PostGIS_Version();"` |

---

*© 2026 Ceylon Track — Real-Time Passenger Information for Sri Lanka Railways*
