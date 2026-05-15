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
| Vinura Nawarathna | Scrum Master | Developer | BA |
| Oshan Wijegunawardana | Product Owner (BA) | Scrum Master | Tester |
| Ravindu Chamod | Tester (QA) | BA | Developer |
| Kalindu Dulshan | Developer | QA | Scrum Master |

> Roles rotate across sprints so every team member gains experience in each area. This ensures shared ownership, cross-functional skill development, and resilience across the project lifecycle.

## Sprint Contributions

**Sprint 1**
- **Vinura (Scrum Master):** Facilitated sprint planning, daily standups, and the sprint review. Set up the project repository structure, GitHub branching strategy, and Jira board. Ensured the team followed Scrum ceremonies and tracked the sprint burndown.
- **Oshan (Product Owner / BA):** Defined and prioritised the initial product backlog. Gathered passenger requirements, wrote user stories, and set acceptance criteria for all Sprint 1 stories. Liaised with the team to clarify requirements throughout the sprint.
- **Ravindu (Tester / QA):** Created the Sprint 1 test plan and manual test cases for all user stories. Executed functional testing on the search and authentication features. Logged and tracked defects found during testing.
- **Kalindu (Developer):** Implemented the core backend API endpoints — station listing, schedule search, and user authentication (register/login with JWT). Set up the PostgreSQL database schema and initial seed data.

**Sprint 2**
- **Vinura (Developer):** Implemented all Sprint 2 features — real-time train status updates, class-based filtering, ETA prediction logic, JWT security hardening, and the admin portal delay management. Connected the frontend to all new API endpoints. Committed all implementation code to GitHub.
- **Oshan (Scrum Master):** Facilitated all Sprint 2 ceremonies including sprint planning, daily standups, sprint review, and retrospective. Maintained and updated the Jira board. Removed blockers — specifically resolved the database connection issue in week 2. Tracked sprint progress against the burndown chart.
- **Ravindu (BA):** Translated Sprint 2 passenger requirements into detailed user stories. Documented the system's business rules for class filtering and delay display. Assisted with refining acceptance criteria and reviewed completed features against business requirements before handover to QA.
- **Kalindu (QA):** Responsible for quality assurance across all Sprint 2 features. Created test cases for each story's acceptance criteria. Executed manual testing and identified 5 bugs (CTP-81 through CTP-85). Documented bug reports in Jira with steps to reproduce, expected behaviour, and actual behaviour. Verified bug fixes before closing each ticket.

**Sprint 3**
- **Vinura (BA):** Defined the Sprint 3 system requirements for GPS tracking, Journey Watch, email notifications, and deployment. Wrote the technical specification and acceptance criteria for all Sprint 3 stories. Produced the refactoring log and deployment guide documentation.
- **Oshan (Tester):** Executed the full Sprint 3 UAT covering all 24 test cases across 3 sprints. Validated GPS map behaviour, offline caching, disruption monitor, and notification flows. Documented all test results in the UAT report and provided the final sign-off.
- **Ravindu (Developer):** Implemented Sprint 3 backend features — GPS route (`/api/gps`), Journey Watch CRUD (`/api/journeywatch`), the disruptions reliability endpoint (`/api/disruptions`), and the Procfile/deployment configuration for Railway.app.
- **Kalindu (Scrum Master):** Facilitated all Sprint 3 Scrum ceremonies. Managed the Jira board, tracked the final sprint burndown, and coordinated the sprint review presentation. Ensured all stories met their definition of done before the sprint ended.

## Running the Project

```bash
# Install dependencies
cd backend && npm install

# Start the backend (serves frontend at http://localhost:3000)
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

> **Requires** PostgreSQL running locally with database `ceylontrack` on port `5432`.
