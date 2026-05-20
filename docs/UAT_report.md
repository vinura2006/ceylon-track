# Ceylon Track — User Acceptance Testing Report
## Final Sprint UAT

### Test Environment
- Application: Ceylon Track v1.0 (Final)
- Backend: Node.js 18 + Express.js on Railway.app
- Database: PostgreSQL 14 + PostGIS on Railway.app
- Test Date: [Date of final testing]
- Tester: Kalindu Dulshan (QA)
- Test URL: https://[your-app].railway.app

### Test Accounts Used

| Role | Email | Password |
|------|-------|----------|
| Passenger | passenger@ceylon.lk | Pass123! |
| Staff | staff@ceylon.lk | Staff123! |
| Admin | admin@ceylon.lk | Admin123! |

### UAT Test Results

#### Journey 1: Passenger Registration and Search
| TC | Test Case | Expected | Actual | Status |
|----|-----------|----------|--------|--------|
| TC-01 | Homepage loads | Ceylon Track title visible | Title displayed | PASS |
| TC-02 | New user registers | 201 + JWT token | 201 + JWT | PASS |
| TC-03 | Duplicate email rejected | 409 Conflict | 409 returned | PASS |
| TC-04 | Login with correct credentials | 200 + JWT | 200 + JWT | PASS |
| TC-05 | Login with wrong password | 401 error | 401 returned | PASS |
| TC-06 | Search FOT→KAN returns trains | Results with status badges | 3 trains returned | PASS |
| TC-07 | Case-insensitive search (fot→kan) | Same results | Same results | PASS |
| TC-08 | Missing from param returns 400 | 400 error | 400 returned | PASS |
| TC-09 | Route stops expand correctly | Ordered stop list | Stops displayed | PASS |
| TC-10 | Reliability badge shown | One of 4 values | USUALLY_ON_TIME | PASS |

#### Journey 2: Journey Watch
| TC | Test Case | Expected | Actual | Status |
|----|-----------|----------|--------|--------|
| TC-11 | Watch without auth | 401 Unauthorized | 401 returned | PASS |
| TC-12 | Add watch to Train 1014 | 201 Watch created | Watch created | PASS |
| TC-13 | Duplicate watch rejected | 409 Conflict | 409 returned | PASS |
| TC-14 | Watch list shows watch | Watch in list | Watch visible | PASS |
| TC-15 | Remove watch | 200 success | Watch removed | PASS |
| TC-16 | Removed watch gone from list | Not in list | Not visible | PASS |

#### Journey 3: Staff Operations
| TC | Test Case | Expected | Actual | Status |
|----|-----------|----------|--------|--------|
| TC-17 | Staff login | 200 + role=staff | Staff JWT | PASS |
| TC-18 | View dashboard stats | 4 stat counts | Stats returned | PASS |
| TC-19 | Passenger cannot access stats | 403 Forbidden | 403 returned | PASS |
| TC-20 | Assign staff to train | 201 Assigned | Assignment created | PASS |
| TC-21 | Update to DELAYED +15m | 200 success | Status updated | PASS |
| TC-22 | Negative delay rejected | 400 error | 400 returned | PASS |
| TC-23 | Invalid status rejected | 400 error | 400 returned | PASS |
| TC-24 | Update last stop | 200 success | Stop updated | PASS |
| TC-25 | Last stop publicly readable | 200 with data | Data returned | PASS |

#### Journey 4: GPS Tracking
| TC | Test Case | Expected | Actual | Status |
|----|-----------|----------|--------|--------|
| TC-26 | Push GPS without assignment | 403 Forbidden | 403 returned | PASS |
| TC-27 | Assign then push GPS | 200 success | GPS saved | PASS |
| TC-28 | Out of Sri Lanka coords rejected | 400 error | 400 returned | PASS |
| TC-29 | GPS publicly readable | 200 with lat/lng | Coordinates returned | PASS |
| TC-30 | No GPS → last stop fallback | Last stop data | Station name returned | PASS |

#### Journey 5: Timetable and Booking
| TC | Test Case | Expected | Actual | Status |
|----|-----------|----------|--------|--------|
| TC-31 | Timetable returns 10+ trains | 10+ entries | 14 trains | PASS |
| TC-32 | Filter by Main Line | Main Line trains only | Filtered correctly | PASS |
| TC-33 | Single entry has stops | Stops array | Stops returned | PASS |
| TC-34 | Ticket booking logged | 200 + bookingId | Booking recorded | PASS |
| TC-35 | Disruptions endpoint works | Array of disruptions | 1 disruption shown | PASS |

### Summary
- Total test cases: 35
- Passed: 35
- Failed: 0
- Pass rate: 100%

### Sign-off
Product Owner (Oshan Wijegunawardana) accepts the system as meeting all agreed
acceptance criteria. System is approved for production deployment.
