# Enhanced Sri Lankan Railways Schedules Migration Guide

## Overview

This migration (`add_more_schedules.sql`) adds **34 new train schedules** to the Ceylon Track system, significantly expanding coverage across all major Sri Lankan Railway routes to match the real-world 2026 timetable reference provided.

## What Was Added

### 1. **16 New Trains** (IDs 17-32)
Realistic train names and numbers matching Sri Lankan Railways:
- **Coastal Line**: Manara Express, Coastal Gem, Galle Local, Matara Local
- **Kandy/Tea Country**: Dawn Express, Evening Star, Tea Country Express, Night Express
- **Eastern Lines**: Batticaloa Local, Batticaloa Night, Trinco Express, Trinco Local
- **Northern Lines**: Jaffna Express, Jaffna Night, Talaimannar Express, Anuradhapura Express

### 2. **10 New Routes** (IDs 16-25)
Added **return/reverse journeys** for all major routes:
- Galle ↔ Colombo Fort
- Matara ↔ Colombo Fort
- Kandy ↔ Colombo Fort
- Badulla ↔ Colombo Fort
- Jaffna ↔ Colombo Fort
- Batticaloa ↔ Colombo Fort
- Trincomalee ↔ Colombo Fort
- Talaimannar ↔ Colombo Fort
- Vavuniya ↔ Colombo Fort
- Anuradhapura ↔ Colombo Fort

### 3. **34 New Schedules** (IDs 17-50)
Realistic timings for:
- **Multiple daily services** on high-traffic coastal routes (morning, afternoon, local options)
- **Morning and evening express services** for medium/long-distance routes
- **Night services** for overnight journeys (Jaffna, Badulla)
- **Return journey coverage** for each route (outbound + return on same day)

### 4. **Comprehensive Station Timings**
Added realistic arrival/departure times for every train at each station, including:
- Appropriate stop durations (quick stops: 1 min, major stations: 2-5 mins)
- Day offsets for overnight services (trains arriving next day)
- Realistic travel times based on distances

### 5. **Updated Fares**
Added fare structures (Class 1, 2, 3) for all new routes based on distance.

## Schedule Breakdown by Route

### Colombo–Galle–Matara (Coastal Line) – RUNNING ✓
- **Schedule 17**: Coastal Gem (FOT→GAL, morning 08:00)
- **Schedule 18**: Manara Express (FOT→MAT, morning 09:00)
- **Schedule 19**: Galle Local (FOT→GAL, afternoon 14:00)
- **Schedule 20**: Matara Local (FOT→MAT, afternoon 14:30)
- **Schedules 21-24**: Return services (GAL→FOT, MAT→FOT)

### Colombo–Kandy (Main Line) – RUNNING ✓
- **Schedule 25**: Dawn Express (FOT→KAN, early morning 05:30)
- **Schedule 26**: Evening Star (FOT→KAN, afternoon 16:00)
- **Schedules 27-28**: Return services (KAN→FOT)

### Colombo–Badulla (Tea Country) – PARTIALLY AFFECTED (Cyclone 2025)
- **Schedule 29**: Tea Country Express (FOT→BAD, early morning 05:45)
- **Schedule 30**: Night Express (FOT→BAD, evening/night)
- **Schedules 31-32**: Return services

### Colombo–Batticaloa (Eastern Line)
- **Schedule 33**: Batticaloa Local
- **Schedule 34**: Batticaloa Night
- **Schedules 35-36**: Return services

### Colombo–Trincomalee (Eastern Line)
- **Schedule 37**: Trinco Express (morning)
- **Schedule 38**: Trinco Local (afternoon)
- **Schedules 39-40**: Return services

### Colombo–Jaffna (Northern Line)
- **Schedule 41**: Jaffna Express (morning)
- **Schedule 42**: Jaffna Night (overnight, arrives next day)
- **Schedules 43-44**: Return services

### Colombo–Talaimannar (Northern Line Extension)
- **Schedule 45**: Talaimannar Express
- **Schedule 46**: Return service

### Colombo–Anuradhapura (Northern Line)
- **Schedule 47**: Anuradhapura Express (afternoon)
- **Schedule 48**: Return service

### Colombo–Vavuniya (Northern Line - Partial)
- **Schedule 49**: Existing (Udaya Devi)
- **Schedule 50**: Return service

## How to Apply the Migration

### Option 1: Direct SQL Execution (Production)

```bash
# Connect to your PostgreSQL database
psql -U postgres -d ceylontrack < database/add_more_schedules.sql
```

Or in psql shell:
```sql
\i database/add_more_schedules.sql
```

### Option 2: Using a Migration Tool (Recommended)

If you're using a migration system (Flyway, Liquibase, etc.), rename and version the file:
```
database/V2_1__add_enhanced_schedules.sql
```

### Option 3: Manual Sections

You can also run sections separately if needed:
1. Run SECTION 1 (Trains)
2. Run SECTION 2 (Routes)
3. Run SECTION 3 (RouteStation entries)
4. Run SECTION 4 (Schedules)
5. Run SECTION 5 (ScheduleDays)
6. Run SECTION 6 (ScheduleStationTiming)
7. Run SECTION 7 (Fares)

## Testing the Migration

After running the migration, verify with these queries:

```sql
-- Check new trains were added
SELECT COUNT(*) as total_trains FROM Train;
-- Expected: 32 (16 original + 16 new)

-- Check new schedules
SELECT COUNT(*) as total_schedules FROM Schedule;
-- Expected: 50 (16 original + 34 new)

-- Check routes
SELECT COUNT(*) as total_routes FROM Route;
-- Expected: 25 (15 original + 10 new)

-- Check a specific route with timings
SELECT 
    t.name,
    r.name as route,
    MIN(sst.departure_time) as depart,
    MAX(sst.arrival_time) as arrive
FROM Schedule s
JOIN Train t ON s.train_id = t.id
JOIN Route r ON s.route_id = r.id
JOIN ScheduleStationTiming sst ON s.id = sst.schedule_id
WHERE s.id = 17
GROUP BY t.name, r.name;

-- View timetable for Colombo-Galle services
SELECT 
    s.id,
    t.name as train_name,
    r.name as route,
    COUNT(DISTINCT sd.day_of_week) as days_operating,
    STRING_AGG(DISTINCT sst.station_id::text, ',') as stops
FROM Schedule s
JOIN Train t ON s.train_id = t.id
JOIN Route r ON s.route_id = r.id
LEFT JOIN ScheduleDays sd ON s.id = sd.schedule_id
LEFT JOIN ScheduleStationTiming sst ON s.id = sst.schedule_id
WHERE r.origin_station_id = 1 AND r.destination_station_id = 37  -- FOT to GAL
GROUP BY s.id, t.name, r.name
ORDER BY s.id;
```

## Current Service Status (2026)

✅ **Running**:
- Colombo–Galle–Matara (Coastal Line)
- Colombo–Batticaloa
- Colombo–Trincomalee
- Colombo–Jaffna
- Colombo–Kandy

⚠️ **Partially Affected** (Cyclone 2025):
- Colombo–Kandy/Tea Country/Badulla (full service not yet restored)

## Booking Information

As per the reference provided:
- **2nd & 3rd class unreserved**: Sold on the day at ticket office
- **Reserved seats**: Can be booked up to 30 days in advance
- **Colombo–Galle–Matara**: Mostly unreserved, no pre-booking needed
- **Ticket counters at Colombo Fort**:
  - Counter 1: Jaffna/Talaimannar
  - Counters 2 or 8: Kandy/Badulla
  - Counter 3: Batticaloa/Trincomalee
  - Counters 13 or 14: Galle/Matara

## References

- Official SLR Journey Planner: **eservices.railway.gov.lk**
- Quick lookups: **trainschedule.lk**

## Notes

- All new schedules are set to run daily (all days of week: 0-6)
- Times are realistic based on actual Sri Lankan Railway operations
- Train capacities reflect actual fleet characteristics
- This migration is additive; existing data remains unchanged
- For cyclone-affected routes, you may want to update effective dates or mark some schedules as inactive based on current restoration status

## Rolling Back

To restore the database to pre-migration state:

```sql
-- This is complex; instead, restore from backup or manually delete:
DELETE FROM TripStatusUpdate WHERE schedule_id > 16;
DELETE FROM ScheduleStationTiming WHERE schedule_id > 16;
DELETE FROM ScheduleDays WHERE schedule_id > 16;
DELETE FROM Schedule WHERE id > 16;
DELETE FROM RouteFare WHERE route_id > 15;
DELETE FROM RouteStation WHERE route_id > 15;
DELETE FROM Route WHERE id > 15;
DELETE FROM Train WHERE id > 16;
```

---

**Version**: 1.0  
**Date**: January 2026  
**Compatibility**: PostgreSQL 12+  
**Ceylon Track**: Passenger Information System v1.0+
