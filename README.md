# Expense Tracker

Full-stack expense tracking application:
- Frontend: React + Vite
- Backend: Node.js + Express in the backend folder

## Prerequisites

- Node.js 18+
- npm

## 1. Run Backend

Open a terminal in backend and run:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend starts on http://localhost:4001.

Health check:

```bash
curl http://localhost:4001/api/health
```

## 2. Run Frontend

Open another terminal in frontend and run:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend starts on http://localhost:5173.

## Demo Login

- Email: john@example.com
- Password: password

## Scripts

### Frontend (frontend)

- npm run dev - start frontend dev server
- npm run build - build frontend
- npm run lint - lint frontend code

### Backend (backend)

- npm run db:reseed - delete the SQLite database so the next backend start reseeds from `backend/data/db.json`
- npm run dev - start backend in watch mode
- npm run start - start backend normally

## Backend API Summary

- GET /api/health
- Auth:
  - POST /api/auth/signup
  - POST /api/auth/login
  - GET /api/auth/me
- Expenses:
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

- Backend uses file storage at backend/data/db.json.
- If `backend/data/expense-tracker.sqlite` already exists, changes in `backend/data/db.json` will not auto-apply. Run `npm run db:reseed` in `backend/`, then restart the backend to pick up fresh seed data such as Bob login and the second org.
- Frontend stores auth token in browser localStorage.
- Frontend app files are now located under frontend/.
