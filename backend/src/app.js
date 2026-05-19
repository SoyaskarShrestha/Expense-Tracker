import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import expensesRoutes from './routes/expenses.js';
import organizationsRoutes from './routes/organizations.js';
import employeesRoutes from './routes/employees.js';
import moneyRequestsRoutes from './routes/moneyRequests.js';
import usersRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import { createAllowedOrigins } from './config/cors.js';
import { getDatabaseDiagnostics } from './services/db.service.js';

const app = express();
const allowedOrigins = createAllowedOrigins();

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const isProduction = process.env.NODE_ENV === 'production';
const apiRateLimitWindowMs = readPositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const apiRateLimitMax = readPositiveInt(process.env.API_RATE_LIMIT_MAX, 300);
const authRateLimitWindowMs = readPositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const authRateLimitMax = readPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, isProduction ? 20 : 200);

const apiLimiter = rateLimit({
  windowMs: apiRateLimitWindowMs,
  max: apiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  })
);
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'expense-tracker-backend' });
});

app.get('/api/health/db', async (_req, res, next) => {
  try {
    const diagnostics = await getDatabaseDiagnostics();
    res.json({ ok: true, ...diagnostics });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/money-requests', moneyRequestsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
