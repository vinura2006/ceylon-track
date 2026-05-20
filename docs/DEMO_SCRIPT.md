# Ceylon Track — Live Demo Script
## Step-by-step guide for a 10-minute demonstration

### Setup (before demo)
1. Run: node database/inject_demo_data.js (injects realistic train states)
2. Open on desktop: http://localhost:3000 (or production URL)
3. Open on phone browser: http://[YOUR_LOCAL_IP]:3000 (same WiFi)
4. Have 3 browser tabs ready: Homepage, Live Map, Admin Dashboard

---

### Demo Flow (10 minutes)

**MINUTE 1-2: Passenger Search**
1. Open index.html — show the dark/light theme toggle
2. Type "Col" in From field — show autocomplete dropdown
3. Select "Colombo Fort (FOT)"
4. Type "Kan" in To field — select "Kandy (KAN)"
5. Click Search → navigate to results.html
6. Point out: status badges (DELAYED badge on Train 1014), reliability badges
7. Click "View Stops" on Train 1014 — show Polgahawela, Peradeniya Junction, Kandy

**MINUTE 3-4: Live Map and Last Stop**
1. Click "Live Map" in nav
2. Select Train 1014 from dropdown
3. Click "Track This Train"
4. Show: red animated marker near Polgahawela (from demo data)
5. Show: "Last Stop: Polgahawela — 8 minutes ago" in info panel
6. Select Train 1068 (CANCELLED) — show "No GPS data" with cancellation status

**MINUTE 5-6: Staff GPS Demo (phone)**
1. On phone: open /login.html → login as staff@ceylon.lk / Staff123!
2. Navigate to /staff-app.html
3. ASSIGN tab: select Train 1084, tap "ASSIGN ME"
4. GPS tab: tap "START BROADCASTING" — allow location permission
5. On desktop: refresh Live Map, select Train 1084
6. Show: marker appears at staff member's actual phone location
7. Walk a few steps — show marker moves on desktop map

**MINUTE 7: Station Master Last Stop**
1. On phone staff app: go to LAST STOP tab
2. Select "Galle" from dropdown
3. Tap "UPDATE LAST STOP"
4. On desktop results.html: search FOT→GAL
5. Show: Train 1086 card now shows "Last Stop: Galle • just now"

**MINUTE 8: Admin Dashboard**
1. Navigate to admin.html (auto-redirect if logged in as staff)
2. Show stat cards: Active Schedules, Delayed Today, Cancelled Today, Active Watchers
3. Update Status form: select Train 1084, set DELAYED, enter 20 minutes
4. Submit — show "Status updated. X watchers notified."
5. Return to results.html — show Train 1084 now shows DELAYED +20m

**MINUTE 9: Timetable and Booking**
1. Navigate to /timetable.html
2. Click "Main Line" tab — show filtered trains
3. Click "View Stops" on Udarata Menike — show full 14-stop route
4. Click "Book Ticket" on Intercity Express
5. Show booking modal — select date, 2 passengers, 1st class
6. Click "Book on Pravesha →" — show Pravesha opens in new tab with all details pre-filled

**MINUTE 10: Journey Watch and Disruptions**
1. Login as passenger@ceylon.lk / Pass123!
2. Search FOT→KAN — click "Watch Train" on Train 1014
3. Navigate to /watch.html — show the watched train with live status badge
4. Show pulsing animation on DELAYED status
5. Navigate to Admin → Disruptions tab
6. Show Train 1068 (CANCELLED) with 0% reliability bar in red

---

### Key Talking Points
- "The phone IS the GPS device — no hardware needed for the demo"
- "If staff switches off broadcasting, passengers automatically see Last Stop instead"
- "The system works on any mobile browser — no app download needed"
- "All ticket booking goes through the official Sri Lanka Railways Pravesha platform"
- "The reliability badge is calculated from the last 30 days of real trip data"
