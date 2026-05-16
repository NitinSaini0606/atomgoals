# AtomGoals - Goal Setting & Tracking Portal

Initial full-stack project structure for the Atomberg hackathon Goal Setting & Tracking Portal.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MySQL
- ORM: Prisma
- Auth: JWT planned later, not implemented yet

## Project Structure

```text
frontend/   React + Vite client
backend/    Express API + Prisma schema
docs/       Project notes and architecture docs
```

## Local Setup

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

The backend runs at `http://localhost:4000`.

Health check:

```bash
curl http://localhost:4000/health
```

### 3. Database

Create a MySQL database, then update `backend/.env`:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/atomgoals"
```

Generate the Prisma client:

```bash
cd backend
npm run prisma:generate
```

Run the first migration when database access is ready:

```bash
npm run prisma:migrate
```

## Current Scope

This base includes a polished landing page and a working API health route. Goal sheets, manager approvals, quarterly check-ins, dashboards, audit trail, and JWT authentication are intentionally left for later implementation.
