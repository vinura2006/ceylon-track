# Ceylon Track — Final Sprint Report
## Sprint 4 (Final)

### Sprint Goal
Deliver a production-ready, fully tested, and documented real-time passenger
information system for Sri Lanka Railway with live GPS tracking,
last stop updates, official timetable, and Pravesha ticket booking.

### Team Roles

| Name | Role | Sprint 4 Responsibilities |
|------|------|--------------------------|
| Vinura Nawarathna | Developer | GPS assignment system, last stop endpoint, timetable backend, performance optimisation |
| Kalindu Dulshan | Tester / QA | UAT suite (26 test cases), bug verification, Selenium E2E tests |
| Ravindu Chamod | Scrum Master | Facilitated ceremonies, maintained Jira board, removed blockers, deployment coordination |
| Oshan Wijegunawardana | Product Owner | Acceptance criteria for all Sprint 4 stories, stakeholder demo, Pravesha integration sign-off |

### Sprint 4 Stories Delivered

| ID | Story | Points | Status |
|----|-------|--------|--------|
| CTP-159 | Staff assigns phone to train for GPS broadcast | 5 | DONE |
| CTP-160 | Staff can cancel GPS broadcast at any time | 3 | DONE |
| CTP-161 | Passenger sees live GPS train location on map | 5 | DONE |
| CTP-162 | Email alert when watched train is delayed | 8 | DONE |
| CTP-163 | Predicted arrival time shown at each stop | 5 | DONE |
| CTP-164 | All API endpoints tested with automated suite | 8 | DONE |
| CTP-165 | Cached schedules when offline | 5 | DONE |
| CTP-166 | Application works on mobile | 3 | DONE |
| CTP-167 | Log of known service disruptions | 3 | DONE |
| CTP-168 | Ceylon Track accessible from public URL | 5 | IN PROGRESS |
| CTP-169 | System responds consistently under load | 3 | IN PROGRESS |
| CTP-170 | UAT report confirming system meets requirements | 3 | IN PROGRESS |

### Bugs Resolved

| ID | Priority | Description | Fix |
|----|----------|-------------|-----|
| CTP-171 | High | Email not sent when delay exceeds threshold | Fixed email trigger in staff status update handler |
| CTP-172 | High | Predicted arrival shows NaN with no historical data | Added null check, return null prediction if no data |
| CTP-173 | Medium | JourneyWatch shows duplicates after page refresh | Added UNIQUE(user_id, schedule_id) constraint |
| CTP-174 | Medium | Cached schedules not invalidated after staff delay update | Added cache-busting header, clear on status change |
| CTP-175 | Low | Mobile layout breaks at 375px | Fixed overflow on filter tabs, added flex-wrap |

### Sprint Velocity
- Planned: 58 story points
- Delivered: 49 story points (CTP-168/169/170 in progress)
- Sprint completion: 84%

### Key Technical Decisions
1. Used navigator.geolocation.watchPosition (not setInterval polling) for battery efficiency on staff phones
2. Added 5-second throttle on GPS push to reduce server load without sacrificing UX
3. Implemented 404 fallback: if no live GPS, show last stop coordinates on map
4. Used Promise.allSettled() for parallel GPS/last-stop checks on results page (avoids blocking render)
5. Switched to UPSERT (INSERT ... ON CONFLICT DO UPDATE) for GPS to handle concurrent updates safely

### Retrospective

What went well:
- GPS demo feature worked on first attempt on real mobile hardware
- UAT suite caught 3 bugs before submission that would have failed acceptance criteria
- Pravesha deep-link integration required no backend work — clean URL construction in frontend
- Railway.app deployment was smooth — auto-deploy from GitHub main branch

What to improve:
- WebSocket for instant watcher notifications (currently email only, 5-10 min delay)
- Station Master role restriction was complex — needed more time for thorough testing
- Seed data for timetable could have been done earlier to unblock frontend development
