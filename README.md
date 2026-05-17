# AtomGoals – Goal Setting & Tracking Portal

AtomGoals is a full-stack internal goal management portal built for Atomberg’s goal-setting workflow. It supports employee goal creation, L1 manager approval, quarterly achievement tracking, manager check-ins, shared departmental goals, admin governance, audit trails, report export, active phase enforcement, and rule-based escalation monitoring.

The project is built as a role-based browser portal for Employees, Managers, and Admin/HR users.

---

## Live Demo

**Frontend:** https://atomgoals.vercel.app  
**Backend Health Check:** https://atomgoals-1.onrender.com/health

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@atomgoals.com | password123 |
| Manager | manager@atomgoals.com | password123 |
| Employee 1 | employee@atomgoals.com | password123 |
| Employee 2 | employee2@atomgoals.com | password123 |

---

## Overview

AtomGoals solves the problem of managing employee goal sheets, manager approvals, quarterly achievement updates, check-ins, shared goals, and HR/Admin governance in one structured system.

Instead of using spreadsheets or manual follow-ups, AtomGoals provides a complete digital workflow where:

- Employees create and submit goal sheets.
- Managers review, return, approve, and lock goals.
- Employees update quarterly achievements.
- Managers complete structured check-ins.
- Admin/HR tracks completion, audit logs, reports, unlock requests, escalations, and active phases.

---

## Core Features

### 1. Employee Goal Sheet

Employees can create and manage their goal sheet during the active Goal Setting phase.

Features include:

- Create goals
- Edit goals before submission
- Delete goals before submission
- Submit goal sheet to L1 Manager
- View approved and locked goals
- View manager rework feedback
- View active phase restrictions

Goal fields:

- Thrust Area
- Goal Title
- Goal Description
- UoM Type
- Score Direction
- Target Value
- Deadline
- Weightage

Validation rules:

- Total weightage must be exactly 100%
- Each goal must have at least 10% weightage
- Maximum 8 goals per employee
- Timeline goals require a deadline
- Required field validation

---

### 2. L1 Manager Approval Workflow

Managers can review submitted goal sheets from their direct reports.

Manager actions:

- View submitted goal sheets
- Review employee goals
- Edit target value, deadline, and weightage inline
- Return goal sheet for rework with comments
- Approve and lock goal sheet

Workflow states:

- Draft
- Submitted
- Revision Requested
- Approved & Locked

After approval, the employee cannot edit, add, or delete goals unless Admin unlocks the goal sheet.

---

### 3. Quarterly Achievement Tracking

After goals are approved and locked, employees can update quarterly achievements.

Supported quarters:

- Q1
- Q2
- Q3
- Q4

Employees can update:

- Actual Achievement
- Status
- Completion Date
- Employee Note

Supported statuses:

- Not Started
- On Track
- Completed

The system calculates:

- Progress Score
- Weighted Score

Supported scoring types:

- Higher is better
- Lower is better
- Timeline-based goals
- Zero-based goals

---

### 4. Manager Quarterly Check-ins

Managers can complete structured quarterly check-ins for their direct reports.

Manager check-in features:

- View planned target vs actual achievement
- View progress score
- View weighted score
- View employee notes
- Add manager check-in comment
- Mark check-in as completed
- Completed check-ins become locked/read-only

---

### 5. Admin Dashboard

Admin/HR users can monitor the full organization-wide goal workflow.

Admin dashboard includes:

- Total employees
- Total managers
- Draft goal sheets
- Submitted goal sheets
- Returned for rework count
- Approved/locked goal sheets
- Q1 check-in completion
- Q2 check-in completion
- Q3 check-in completion
- Q4 check-in completion

---

### 6. Completion Dashboard

Admin can view employee-level completion status.

The dashboard shows:

- Employee name
- Manager name
- Goal sheet status
- Total goals
- Total weightage
- Q1 check-in status
- Q2 check-in status
- Q3 check-in status
- Q4 check-in status

---

### 7. Audit Trail

The system records important governance actions.

Audit logs include:

- Goal sheet submission
- Manager approval
- Manager return for rework
- Admin unlock action
- Quarterly achievement update
- Manager check-in completion
- Shared goal activity
- Active phase changes

Audit logs are visible to Admin users in newest-first order.

---

### 8. Admin Unlock

Admin can unlock an approved and locked goal sheet when a governed revision is required.

Unlock behavior:

- Admin must enter a reason.
- Goal sheet moves to Revision Requested.
- Employee can edit only during the Goal Setting phase.
- Manager approval is required again after resubmission.
- Unlock action is recorded in Audit Trail.

---

### 9. Shared Goals / Departmental KPIs

Managers and Admins can create shared goals and assign them to multiple employees.

Shared goal features:

- Create departmental KPIs
- Assign shared goals to multiple employees
- Select a primary owner
- Show shared goal label in employee goal sheets
- Keep title, target, UoM, deadline, and description read-only for assigned employees
- Allow employees to adjust only weightage during editable phase
- Include shared goals in total 100% weightage validation

Primary owner achievement sync:

- Primary owner updates achievement.
- Achievement syncs to linked shared goal instances.
- Other assigned employees can view synced achievement.

---

### 10. Active Phase Management & Enforcement

Admin can control the current active workflow phase.

Supported phases:

- Goal Setting
- Q1
- Q2
- Q3
- Q4

Phase enforcement:

- Goal creation, editing, submission, and manager approval are allowed only during Goal Setting.
- Q1 achievement updates and check-ins are allowed only during Q1.
- Q2 achievement updates and check-ins are allowed only during Q2.
- Q3 achievement updates and check-ins are allowed only during Q3.
- Q4 achievement updates and check-ins are allowed only during Q4.
- Non-active quarters remain view-only.

---

### 11. Achievement Report Export

Admin can export an achievement report as CSV.

The CSV report includes:

- Employee name
- Employee email
- Manager name
- Goal sheet status
- Quarter
- Goal title
- Thrust area
- UoM type
- Target value
- Actual achievement
- Employee status
- Progress score
- Weightage
- Weighted score
- Employee note
- Manager check-in status
- Manager check-in comment

---

## Bonus Feature: Rule-Based Escalation Monitor

AtomGoals includes an in-app escalation monitor for Admin/HR users.

The escalation module dynamically detects pending workflow actions based on the current active phase.

Escalation issue types:

- Goal Not Submitted
- Manager Approval Pending
- Check-in Not Completed

Escalation levels:

- Level 1: Employee
- Level 2: Manager
- Level 3: HR

The Escalation Monitor shows:

- Employee name
- Manager name
- Issue type
- Related phase/quarter
- Pending since
- Escalation level
- Responsible person
- Status
- Suggested action

The escalation status is dynamically derived from the current workflow state.

---

## Tech Stack

### Frontend

- React.js
- Vite
- JavaScript
- CSS

### Backend

- Node.js
- Express.js
- Prisma ORM
- JWT Authentication
- REST APIs

### Database

- MySQL

### Deployment

- Frontend: Vercel
- Backend: Render
- Database: Railway MySQL

---

## Architecture

```text
                    ┌───────────────────────────┐
                    │          Vercel           │
                    │   React + Vite Frontend   │
                    └─────────────┬─────────────┘
                                  │
                                  │ REST API Calls
                                  │
                    ┌─────────────▼─────────────┐
                    │          Render           │
                    │   Node.js + Express API   │
                    │   JWT Auth + Role Guards  │
                    └─────────────┬─────────────┘
                                  │
                                  │ Prisma ORM
                                  │
                    ┌─────────────▼─────────────┐
                    │       Railway MySQL       │
                    │ Users, Goals, Check-ins,  │
                    │ Audit Logs, Shared Goals  │
                    └───────────────────────────┘
```

---

## Role-Based Workflow

```text
Employee
   ↓
Creates Goal Sheet
   ↓
Submits to L1 Manager
   ↓
Manager Reviews
   ↓
Approve & Lock / Return for Rework
   ↓
Employee Updates Quarterly Achievement
   ↓
Manager Completes Quarterly Check-in
   ↓
Admin Tracks Completion, Audit, Reports, Unlocks, Escalations
```

---

## Project Structure

```text
atomgoals/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── migrations/
│   │
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── prisma.js
│   │   └── server.js
│   │
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   │
│   ├── package.json
│   └── .env.example
│
├── docs/
│   └── architecture.md
│
├── README.md
└── .gitignore
```

---

## Local Setup

### Prerequisites

Install:

- Node.js
- MySQL
- Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/NitinSaini0606/atomgoals.git
cd atomgoals
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder using `.env.example`.

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN=8h
```

Run Prisma migrations and seed demo data:

```bash
npx prisma migrate dev
npm run seed
```

Start backend:

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/health
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder using `.env.example`.

```env
VITE_API_BASE_URL=http://localhost:4000
```

Start frontend:

```bash
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## Deployment

### Backend Deployment

Backend is deployed on Render.

Required environment variables:

```env
DATABASE_URL=your_hosted_mysql_database_url
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

Recommended Render commands:

```bash
Build Command:
npm install && npx prisma generate && npx prisma migrate deploy && npm run seed

Start Command:
npm start
```

---

### Frontend Deployment

Frontend is deployed on Vercel.

Required environment variable:

```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

Build settings:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

---

## API Overview

Main API areas:

```text
/auth
/employee
/manager
/admin
/shared-goals
/cycle
/health
```

Examples:

- `POST /auth/login`
- `GET /employee/goal-sheet`
- `POST /employee/goal-sheet/submit`
- `GET /manager/goal-sheets`
- `GET /admin/dashboard`
- `GET /admin/audit-logs`
- `GET /admin/escalations`
- `GET /cycle/active`
- `GET /health`

---

## Demo Flow for Judges

1. Login as Admin  
   - View dashboard
   - View completion dashboard
   - View audit trail
   - View escalation monitor
   - Export achievement report
   - Change active phase if needed

2. Login as Employee  
   - View goal sheet
   - View active phase restrictions
   - View achievement tracking

3. Login as Manager  
   - View direct reports
   - Review goal sheets
   - View quarterly check-ins

4. Login as Employee 2  
   - View shared goal and synced achievement data

---

## Security Notes

- Real `.env` files are not committed to GitHub.
- JWT is used for authentication.
- Role-based middleware protects Employee, Manager, and Admin routes.
- Admin-only routes are protected.
- Demo credentials are intentionally simple for evaluation.

---

## Future Enhancements

Possible future improvements:

- Microsoft Entra ID / Azure AD SSO
- Real email notifications
- Microsoft Teams adaptive card notifications
- Advanced analytics dashboard
- Department-level hierarchy views
- Configurable escalation rules with scheduled background jobs

---

## Author

**Nitin Saini**  
B.Tech AIML, NIT Kurukshetra  
GitHub: [NitinSaini0606](https://github.com/NitinSaini0606)
