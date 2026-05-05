# Ceylon Track — Real-Time Passenger Information System

A passenger information system for Sri Lanka Railway providing real-time train tracking, delay alerts, and journey monitoring.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with PostGIS
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Auth:** JWT + bcrypt

## Team — Group 2

| Name | Sprint 1 Role | Sprint 2 Role | Sprint 3 Role |
|------|--------------|--------------|--------------|
| Vinura Nawarathna | Scrum Master | Developer | Developer |
| Oshan Wijegunawardana | Product Owner | Product Owner | Product Owner |
| Ravindu Chamod | Developer | Scrum Master | Developer |
| Kalindu Dulshan | Developer | Tester | Scrum Master |

> In Scrum there are 3 official roles: **Product Owner**, **Scrum Master**, and **Developer** (which includes testers). Roles rotate across sprints so every team member gains experience in each area. The Product Owner remains consistent across all sprints to maintain product vision continuity.

## Sprint 2 Contributions

**Vinura — Developer**
Responsible for implementing all Sprint 2 features. Wrote the backend API endpoints for real-time status, class filtering, route details, JWT security hardening, and the admin portal delay update functionality. Connected the frontend to all new API endpoints. Committed all implementation code to GitHub.

**Oshan — Product Owner**
Managed the Sprint 2 product backlog. Wrote the acceptance criteria for all 8 Sprint 2 stories in Jira before development began. Reviewed each completed story against its acceptance criteria and approved or rejected the work. Maintained the priority order of the backlog. Represented the passenger's perspective in all planning discussions.

**Ravindu — Scrum Master**
Facilitated all Sprint 2 ceremonies including sprint planning, daily standups, sprint review, and retrospective. Updated and maintained the Jira board throughout the sprint. Removed blockers — specifically resolved the database connection issue during week 2. Ensured the team followed Scrum principles and tracked sprint progress against the burndown chart.

**Kalindu — Tester (within Developer role)**
Responsible for quality assurance across all Sprint 2 features. Created test cases for each story's acceptance criteria. Executed manual testing and identified 5 bugs (CTP-81 through CTP-85). Documented bug reports in Jira with steps to reproduce, expected behaviour, and actual behaviour. Verified bug fixes before closing each ticket.

## Running the Project

```bash
# Install dependencies
cd backend && npm install

# Start the backend (serves frontend at http://localhost:3000)
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

> **Requires** PostgreSQL running locally with database `ceylontrack` on port `5432`.
