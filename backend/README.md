# Expense Tracker Backend

Node.js + Express backend for the expense tracker frontend.

## Structure

- `src/app.js` - Express app wiring, middleware, and route mounting
- `src/server.js` - process entry point that starts the HTTP server
- `src/config/` - shared configuration helpers such as CORS origin parsing
- `src/controllers/` - request handlers grouped by domain
- `src/routes/` - thin route definitions that map endpoints to controllers
- `src/services/` - shared business/data helpers
- `src/middleware/` - reusable middleware such as auth guards
- `data/db.json` - seed data used to bootstrap SQLite on first run

## Setup

1. Install dependencies:
   npm install
2. Create env file:
   copy .env.example .env
3. Run server:
   npm run dev

Server runs on http://localhost:4000 by default.

## API Overview

- Health: GET /api/health
- Database health: GET /api/health/db
- Auth:
  - POST /api/auth/signup
  - POST /api/auth/login
  - GET /api/auth/me
- Personal expenses:
  - GET /api/expenses
  - POST /api/expenses
  - PATCH /api/expenses/:id
  - DELETE /api/expenses/:id
- Organizations:
  - GET /api/organizations
  - POST /api/organizations
- Employees:
  - GET /api/employees
  - POST /api/employees
  - DELETE /api/employees/:id
- Money requests:
  - GET /api/money-requests
  - POST /api/money-requests
  - PATCH /api/money-requests/:id/status

## Notes

- Data is persisted to a local SQLite file (`SQLITE_PATH`).
- The backend will create tables automatically and seed them from `data/db.json` if the database is empty.
- Seed changes in `data/db.json` do not overwrite an existing SQLite file. To reload fresh seed data, stop the backend, run `npm run db:reseed`, then start the backend again.
- Auth uses JWT via Authorization: Bearer <token>.
