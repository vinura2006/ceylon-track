# Ceylon Track — UAT Report

## Sprint 1 — User Acceptance Testing

| ID | User Story | Acceptance Criteria | Test Steps | Result | Tester |
|----|-----------|---------------------|------------|--------|--------|
| UAT-S1-01 | As a passenger, I want to search for trains by origin and destination so I can plan my journey | Search returns at least one train for valid origin/destination pair | 1. Open index.html 2. Type "Colombo Fort" 3. Type "Kandy" 4. Select today's date 5. Click Search | ✅ PASS | Kalindu |
| UAT-S1-02 | As a passenger, I want to see departure and arrival times so I know when the train leaves and arrives | Each result card shows departure time and arrival time | 1. Perform a valid search 2. Verify each result card contains departure_time and arrival_time fields | ✅ PASS | Kalindu |
| UAT-S1-03 | As a passenger, I want to filter trains by travel class so I only see trains with my preferred class | Selecting "1st Class" hides trains with no 1st class carriages | 1. Search Colombo Fort → Kandy 2. Click filter "1st Class" 3. Verify Muthu Kumari (commuter) is hidden | ✅ PASS | Kalindu |
| UAT-S1-04 | As a passenger, I want to register and log in so my profile is saved | After registration, login returns JWT token stored in localStorage | 1. Open login.html 2. Click Register 3. Enter valid email and password 4. Submit 5. Verify token in localStorage | ✅ PASS | Kalindu |
| UAT-S1-05 | As a passenger, I want to see the live train status badge so I know if the train is running on time | Status badge shows "On Time", "Delayed", or "Cancelled" with appropriate colour | 1. Search for trains 2. Verify each card shows a coloured status badge | ✅ PASS | Kalindu |
| UAT-S1-06 | As a staff member, I want to log in with admin credentials so I can access the admin dashboard | Logging in with staff email shows the admin panel | 1. Open login.html 2. Enter staff credentials 3. Verify redirect to admin.html | ✅ PASS | Kalindu |

**Sprint 1 Result: 6/6 tests passed (100%)**

---

## Sprint 2 — User Acceptance Testing

| ID | User Story | Acceptance Criteria | Test Steps | Result | Notes | Tester |
|----|-----------|---------------------|------------|--------|-------|--------|
| UAT-S2-01 | As an admin, I want to update a train's delay status so passengers are informed in real time | PATCH /api/admin/trips/:id/status returns 200 and updates the TripStatusUpdate table | 1. Login as admin 2. Open admin.html 3. Find today's trip 4. Set delay to 15 minutes 5. Click Update | ✅ PASS | — | Kalindu |
| UAT-S2-02 | As a passenger, I want to see predicted ETA when a train is delayed so I can adjust my plans | Schedule detail page shows "Predicted" column next to "Scheduled" column | 1. Set Udarata Menike to 20 min delay 2. Click train name on results page 3. Verify Predicted ETA column updates | ✅ PASS | Recovery logic reduces delay by 20% per remaining stop | Kalindu |
| UAT-S2-03 | As a passenger, I want to filter by class 1, 2, or 3 so only relevant trains appear | Selecting "3rd Class only" shows Muthu Kumari; selecting "1st Class only" hides it | 1. Search Colombo Fort → Kandy 2. Toggle class filters 3. Verify Muthu Kumari appears/disappears | ✅ PASS | — | Kalindu |
| UAT-S2-04 | As a passenger, I want to subscribe to train watch so I receive delay alerts | POST /api/watch creates a watch record for the authenticated user | 1. Login as passenger 2. Click "Watch this train" on search results 3. Check DB for new JourneyWatch row | ✅ PASS | — | Kalindu |
| UAT-S2-05 | As a passenger, I want to see train reliability scores so I can choose the most punctual service | Each search result card shows a reliability percentage and colour indicator | 1. Search any route 2. Verify reliability badge appears on each card | ✅ PASS | — | Kalindu |
| UAT-S2-06 | As an admin, I want to add a new station so the network can be expanded | POST /api/admin/stations with valid lat/lon and code creates station in DB | 1. Login as admin 2. Open Stations tab 3. Click Add Station 4. Fill form 5. Submit | ✅ PASS | — | Kalindu |
| UAT-S2-07 | As an admin, I want to see today's running trains in a dashboard | GET /api/admin/trips/today returns all schedules running today | 1. Login as admin 2. Open Trips tab 3. Verify trip list shows current day trains | ✅ PASS | — | Kalindu |
| UAT-S2-08 | As a passenger, I want the station list to work offline from cache | Station autocomplete works when network is down using localStorage cache | 1. Load index.html once online 2. Disconnect network 3. Reload 4. Verify yellow offline banner and autocomplete still works | ✅ PASS | Cache TTL 24h | Kalindu |

**Sprint 2 Result: 8/8 tests passed (100%)**

---

## Sprint 3 — User Acceptance Testing

| ID | User Story | Acceptance Criteria | Test Steps | Result | Bug Ref | Tester |
|----|-----------|---------------------|------------|--------|---------|--------|
| UAT-S3-01 | As a passenger, I want a Journey Watch dashboard so I can monitor all my watched trains in one place | watch.html shows all watched journeys with live status, auto-refreshes every 30 seconds | 1. Login as passenger 2. Watch two trains 3. Open watch.html 4. Verify both trains appear 5. Wait 30s, confirm refresh | ✅ PASS | — | Kalindu |
| UAT-S3-02 | As a passenger, I want email alerts when my watched train is delayed | Nodemailer sends email when delay_minutes > 5 for a watched schedule | 1. Watch Udarata Menike 2. Admin sets 10 min delay 3. Wait for background job 4. Check test inbox | ✅ PASS | — | Kalindu |
| UAT-S3-03 | As a passenger, I want to see a live map of train positions so I know exactly where my train is | map.html shows Leaflet markers for all trains with GPS data; markers move when GPS updates | 1. Open map.html 2. Run GPS simulator 3. Verify train marker appears and moves | ✅ PASS | — | Kalindu |
| UAT-S3-04 | As a passenger, I want to view a service disruption table showing which trains are unreliable | disruptions.html renders table with train name, reliability score, and colour-coded badge | 1. Open disruptions.html 2. Verify table loads 3. Verify reliability badges are colour-coded 4. Test filter buttons | ✅ PASS | BUG-06 fixed | Kalindu |
| UAT-S3-05 | As a passenger, I want cached search results when I am offline | results.html shows yellow offline banner and last cached results when fetch fails | 1. Search once online 2. Disconnect network 3. Repeat same search 4. Verify yellow banner and cached data | ✅ PASS | — | Kalindu |
| UAT-S3-06 | As a system, the GPS tracking endpoint must accept updates and return live positions | POST /api/gps/update stores position; GET /api/gps/trains/live returns all active train positions | 1. POST GPS update with valid token 2. GET /api/gps/trains/live 3. Verify updated train appears in response | ✅ PASS | — | Kalindu |
| UAT-S3-07 | As an admin, I want the notification job to start automatically with the server | "Notification checker started" appears in terminal on server boot | 1. Restart server 2. Check terminal output for notification job message | ✅ PASS | — | Kalindu |
| UAT-S3-08 | As a tester, I want the test suite to pass with ≥80% pass rate | npm test shows ≥80% pass rate across all test files | 1. cd backend 2. npm test 3. Verify output shows 21/21 tests passed | ✅ PASS | 100% (21/21) | Kalindu |
| UAT-S3-09 | As a passenger, I want the offline banner on map.html when GPS polling fails | map.html shows red offline banner when /api/gps/trains/live cannot be reached | 1. Disconnect network 2. Open map.html 3. Wait for poll cycle 4. Verify offline banner appears | ✅ PASS | — | Kalindu |
| UAT-S3-10 | As a passenger, I want to toggle notifications per watched journey | watch.html notification toggle calls PATCH /api/journeywatch/:id | 1. Open watch.html 2. Toggle notification bell on a journey 3. Verify API call fired 4. Verify UI updates | ✅ PASS | — | Kalindu |

**Sprint 3 Result: 10/10 tests passed (100%)**

---

## Overall UAT Summary

| Sprint | Tests Run | Tests Passed | Pass Rate |
|--------|-----------|--------------|-----------|
| Sprint 1 | 6 | 6 | 100% |
| Sprint 2 | 8 | 8 | 100% |
| Sprint 3 | 10 | 10 | 100% |
| **Total** | **24** | **24** | **100% (≥95% threshold: ✅ PASS)** |

**UAT Sign-off:** All 24 acceptance criteria met across all 3 sprints.
Signed off by Product Owner: **Oshan Wijegunawardana**
Date: 2026-05-15
