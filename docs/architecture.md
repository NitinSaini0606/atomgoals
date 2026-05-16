# AtomGoals Architecture Notes

## Goal

AtomGoals is an internal goal setting and tracking portal for HR teams, employees, and managers. The initial scaffold focuses on a clean runnable base rather than full workflow implementation.

## Planned Product Areas

- Goal Sheet creation and review
- L1 Manager Approval workflow
- Quarterly Check-in records
- Planned vs Actual progress tracking
- Completion Dashboard for HR visibility
- Audit Trail for workflow transparency

## Initial Services

- `frontend`: React + Vite + Tailwind CSS single-page app
- `backend`: Express.js API with Prisma configured for MySQL
- `docs`: Lightweight project documentation

## Auth

JWT authentication is planned but intentionally not implemented in this scaffold.
