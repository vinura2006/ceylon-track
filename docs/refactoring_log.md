# Ceylon Track — Code Refactoring Log

## Overview

This document records the significant refactoring efforts completed during Sprint 2 and Sprint 3 of the Ceylon Track project. Each entry documents the problem with the original code, the refactoring decision, and the improved implementation.

---

## Refactor 1 — Schedule Search: Monolithic Handler → Helper Module

**File:** `backend/routes/schedules.js` → extracted to `backend/utils/scheduleHelpers.js`  
**Sprint:** 2  
**Author:** Vinura Nawarathna  
**Jira:** CTP-120

### Problem
The `/api/schedules/search` route handler was a 190-line monolithic function containing inlined business logic for time formatting, status badge determination, class availability, and duration calculation. This made it impossible to unit test individual functions and violated the Single Responsibility Principle.

### Before (schedules_broken.js — inline logic)

```js
// Inside the route handler — no separation of concerns
const schedules = result.rows.map(row => {
    const durationHours = Math.floor(row.duration_minutes / 60);
    const durationMins  = Math.floor(row.duration_minutes % 60);

    // formatTime was defined inline inside the map callback
    const formatTime = (timeStr) => {
        if (!timeStr) return null;
        return timeStr.substring(0, 5);
    };

    // Badge logic duplicated inline
    let badge = 'Usually On Time';
    let badgeClass = 'ontime';
    if (row.current_status === 'Cancelled' || row.display_status === 'Cancelled') {
        badge = 'Cancelled';
        badgeClass = 'cancelled';
    } else if (row.delay_minutes > 15) {
        badge = 'Significantly Delayed';
        badgeClass = 'delayed';
    } else if (row.delay_minutes > 0) {
        badge = 'Sometimes Delayed';
        badgeClass = 'delayed';
    }

    return {
        schedule_id: row.schedule_id,
        train: { name: row.train_name, number: row.train_number, type: row.train_type },
        departure_time: formatTime(row.departure_time),
        arrival_time:   formatTime(row.arrival_time),
        status: { badge, badge_class: badgeClass },
        // No available_classes — missing feature
        // No reliability — missing feature
    };
});
```

### After (scheduleHelpers.js — extracted, documented, testable)

```js
// utils/scheduleHelpers.js — pure functions, fully documented

/**
 * Determines the available seating classes for a given train.
 */
function getAvailableClasses(trainName, trainType) {
    if (['Yal Devi', 'Udarata Menike', 'Podi Menike', ...].includes(trainName)) {
        return [1, 2, 3];
    } else if (['Uttara Devi', 'Ruhunu Kumari', ...].includes(trainName)) {
        return [1, 2];
    } else if (trainType === 'Commuter') {
        return [3];
    }
    return [1, 2, 3];
}

/**
 * Determines the status badge for a train based on its delay.
 */
function determineStatusBadge(row) {
    let badge = 'Usually On Time';
    let badgeClass = 'ontime';
    if (row.current_status === 'Cancelled') {
        badge = 'Cancelled'; badgeClass = 'cancelled';
    } else if (row.delay_minutes > 15) {
        badge = 'Significantly Delayed'; badgeClass = 'delayed';
    } else if (row.delay_minutes > 0) {
        badge = 'Sometimes Delayed'; badgeClass = 'delayed';
    }
    return { badge, badgeClass };
}

module.exports = { calculateReliability, formatScheduleTimeAndDuration,
                   determineStatusBadge, getAvailableClasses };
```

**Usage in the route handler:**
```js
// routes/schedules.js — clean, readable, testable
const timeAndDuration  = formatScheduleTimeAndDuration(row);
const statusBadge      = determineStatusBadge(row);
const availableClasses = getAvailableClasses(row.train_name, row.train_type);
```

### Impact
- Route handler reduced from 190 lines → 60 lines of business logic.
- Added `available_classes` and `reliability` fields that were missing entirely.
- Helper functions are now independently unit-testable (covered by `search.test.js`).

---

## Refactor 2 — Database Pool: Hardcoded Config → Environment-Aware

**File:** `backend/db/pool.js`  
**Sprint:** 3  
**Author:** Vinura Nawarathna  
**Jira:** CTP-162

### Problem
The original pool was hardcoded for local PostgreSQL only. Deploying to Railway.app requires a `DATABASE_URL` connection string with SSL. The original code would fail in production without manual changes each time.

### Before

```js
const Pool = require('pg').Pool;
require('dotenv').config();

// Only worked locally — would fail on Railway.app
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME     || 'ceylontrack',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

### After

```js
const { Pool } = require('pg');

// Supports both local (individual vars) and production (DATABASE_URL + SSL)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || 'ceylon_track',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20
    });

module.exports = pool;
```

### Impact
- Single file works correctly in both development and production.
- SSL is automatically enabled only in production to avoid self-signed cert errors in development.
- Enables zero-config Railway.app deployment.

---

## Refactor 3 — Schedule Detail: Missing ETA Prediction Added

**File:** `backend/routes/schedules.js` — `GET /api/schedules/:id`  
**Sprint:** 2  
**Author:** Vinura Nawarathna  
**Jira:** CTP-121

### Problem
The schedule detail endpoint returned raw station timings with no predicted ETA. Passengers had no way to see when the train would actually arrive at each stop when delayed.

### Before

```js
// Old: returned stations as-is, no prediction logic
const timingsResult = await pool.query(timingsQuery, [id]);

res.json({
    schedule: result.rows[0],
    stations: timingsResult.rows  // No predicted_eta field
});
```

### After

```js
// New: calculates predicted ETA with delay recovery model
function calculateETA(scheduledArrivalTime, currentDelayMinutes, stopsRemaining) {
    if (currentDelayMinutes === 0) return scheduledArrivalTime;
    if (!scheduledArrivalTime) return null;

    let addedMinutes = currentDelayMinutes;
    // Trains recover ~20% of delay per remaining stop
    if (currentDelayMinutes > 10) {
        const recoveredDelay = currentDelayMinutes -
            (currentDelayMinutes * 0.20 * stopsRemaining);
        addedMinutes = Math.max(Math.round(recoveredDelay), 0);
    }

    const parts  = scheduledArrivalTime.split(':');
    let minutes  = parseInt(parts[0]) * 60 + parseInt(parts[1]) + addedMinutes;
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const enrichedStations = stations.map(st => {
    let stopsRemaining = st.stop_sequence - currentSeq;
    if (stopsRemaining < 0) stopsRemaining = 0;
    return {
        ...st,
        predicted_eta: calculateETA(
            st.arrival_time || st.departure_time,
            schedule.delay_minutes,
            stopsRemaining
        )
    };
});

res.json({ schedule, stations: enrichedStations });
```

### Impact
- Each station now includes a `predicted_eta` field alongside the `arrival_time` (scheduled).
- Frontend results modal can display a "Scheduled" vs "Predicted" column side-by-side.
- Recovery model: trains recover 20% of delay per remaining stop, matching real-world behaviour.

---

## Refactor 4 — Frontend API Calls: Inline fetch → Centralised api.js

**File:** `frontend/js/api.js` (new)  
**Sprint:** 3  
**Author:** Vinura Nawarathna  
**Jira:** CTP-163

### Problem
Every HTML page contained its own hardcoded `const API_BASE_URL = 'http://localhost:3000/api'` with duplicated fetch boilerplate including token injection. Updating the API base URL for production required editing every file manually.

### Before (duplicated in every HTML file)

```js
// Repeated in index.html, results.html, watch.html, admin.html …
const API_BASE_URL = 'http://localhost:3000/api';

async function apiCall(endpoint) {
    const token = localStorage.getItem('ceylontrack_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const response = await fetch(API_BASE_URL + endpoint, { headers });
    // ...
}
```

### After (frontend/js/api.js — shared module)

```js
// Single source of truth — auto-switches between local and production
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://ceylon-track.up.railway.app';

async function apiGet(endpoint) {
    const token = localStorage.getItem('ceylontrack_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const response = await fetch(API_BASE + endpoint, { headers });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}

async function apiPost(endpoint, body) {
    const token = localStorage.getItem('ceylontrack_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const response = await fetch(API_BASE + endpoint, {
        method: 'POST', headers, body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}
```

**Usage in HTML pages:**
```html
<script src="js/api.js"></script>
<script>
    // All pages now use the shared functions
    const data = await apiGet('/api/schedules/search?from=FOT&to=KAN&date=today');
</script>
```

### Impact
- Zero duplication of API base URL or token injection logic.
- Switching from local to production URL happens in one place.
- Consistent error handling across all pages.

---

## Summary Table

| # | File | Type | Sprint | Jira | Lines Before → After |
|---|------|------|--------|------|----------------------|
| 1 | `routes/schedules.js` + `utils/scheduleHelpers.js` | Extract module | 2 | CTP-120 | 190 → 60 (route) + 162 (helpers) |
| 2 | `db/pool.js` | Environment config | 3 | CTP-162 | 25 → 20 (cleaner, multi-env) |
| 3 | `routes/schedules.js` `/:id` handler | Add ETA logic | 2 | CTP-121 | 45 → 90 (feature added) |
| 4 | All HTML files → `frontend/js/api.js` | Extract shared module | 3 | CTP-163 | ~30 lines × 5 files → 1 shared file |
