# Ceylon Track 🚂

> Real-Time Passenger Information System for Sri Lanka Railway

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Web Framework | Express.js |
| Database | PostgreSQL 14+ with PostGIS |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Frontend | HTML5 / CSS3 / Vanilla JS |
| Deployment | Railway.app |

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
