# Ceylon Track — System Architecture

## Overview
Ceylon Track is a three-tier web application providing real-time passenger
information for Sri Lanka Railway.

## Tier Breakdown

### Presentation Tier (Frontend)
- Technology: HTML5, CSS3, Vanilla JavaScript
- Pages: index.html, results.html, watch.html, live-map.html, timetable.html,
  admin.html, staff-app.html, login.html, register.html, gps-demo.html
- State management: localStorage for JWT and user profile
- Map library: Leaflet.js with OpenStreetMap tiles (no API key required)
- No build step — served as static files from Express

### Application Tier (Backend)
- Technology: Node.js 18, Express.js
- Architecture: RESTful API with modular route files
- Authentication: JWT (jsonwebtoken) + bcrypt password hashing
- Route files: auth, schedules, stations, watch, staff, gps, disruptions,
  assignments, laststop, timetable (10 total)
- Middleware: authenticate.js (JWT verification), authorize.js (role check)

### Data Tier (Database)
- Technology: PostgreSQL 14 with PostGIS extension
- Tables: 11 tables (users, stations, schedules, stop_times,
  trip_status_updates, journey_watches, train_assignments, train_last_stops,
  sri_lanka_timetable, timetable_stops, ticket_bookings)
- Spatial data: PostGIS geography(POINT, 4326) for station locations and GPS

## Key Data Flows

### Live GPS Tracking
Staff Phone → POST /api/gps/mobile-update → UPSERT trip_status_updates
→ Passenger: GET /api/gps/:id (every 5s) → marker.setLatLng() on Leaflet map

### Last Stop Fallback
If no live GPS: GET /api/laststop/:id → train_last_stops table
→ Find station coordinates from STATIONS constant → show orange marker

### Schedule Search
GET /api/schedules/search → SELECT + LEFT JOIN trip_status_updates (today)
→ COALESCE(status, 'ON_TIME') → reliability subquery → response with live badges

## Security Model

| Endpoint category | Auth required | Role required |
|-------------------|--------------|---------------|
| GET /api/stations, /api/timetable, /api/schedules | No | None |
| GET /api/gps/:id, /api/laststop/:id | No | None (public) |
| POST /api/auth/register, /login | No | None |
| GET /api/watch, POST /api/watch | Yes | Any |
| POST /api/assignments/assign | Yes | Staff, Admin |
| POST /api/gps/mobile-update | Yes + Assignment | Staff, Admin |
| POST /api/laststop/update | Yes | Staff, Admin |
| GET /api/staff/stats | Yes | Staff, Admin |
| POST /api/staff/trains/:id/status | Yes | Staff, Admin |
