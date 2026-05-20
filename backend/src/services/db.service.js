import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_PATH = path.join(__dirname, '../../data/db.json');

let pool;
const { Pool } = pg;

export const userSelectColumns = 'id, name, email, password, role';
export const expenseSelectColumns =
  'id, user_id AS "userId", category, amount, description, date, payment_method AS "paymentMethod", recurrence, reminder_enabled AS "reminderEnabled", reminder_days_before AS "reminderDaysBefore", created_at AS "createdAt"';
export const organizationSelectColumns =
  'id, name, description, head_id AS "headId", created_at AS "createdAt"';
export const employeeSelectColumns =
  'id, organization_id AS "organizationId", name, email, role, joined_at AS "joinedAt", created_at AS "createdAt"';
export function moneyRequestSelectColumns(alias = 'money_requests') {
  return [
    `${alias}.id`,
    `${alias}.organization_id AS "organizationId"`,
    `${alias}.employee_id AS "employeeId"`,
    `${alias}.employee_name AS "employeeName"`,
    `${alias}.amount`,
    `${alias}.reason`,
    `${alias}.status`,
    `${alias}.requested_at AS "requestedAt"`,
    `${alias}.responded_at AS "respondedAt"`,
    `${alias}.responded_by AS "respondedBy"`,
    `(SELECT name FROM users u WHERE u.id = ${alias}.responded_by) AS "respondedByName"`,
    `${alias}.response_note AS "responseNote"`,
    `${alias}.created_at AS "createdAt"`,
  ].join(', ');
}

async function ensureColumn(tableName, columnName, definition) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function requireDatabaseConfiguration() {
  if (!pool) {
    throw new Error('PostgreSQL database pool is not initialized. Call initializeDatabase() first.');
  }
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Configure a PostgreSQL connection string in the environment.');
  }

  return databaseUrl;
}


function transformQuery(text) {
  // PostgreSQL uses $1, $2 instead of ?, so no transformation needed
  // Remove SQLite-specific syntax
  return text
    .replace(/::int/g, '::integer')
    .replace(/CURRENT_TIMESTAMP/g, 'CURRENT_TIMESTAMP')
    .replace(/NOW\(\)/g, 'NOW()');
}

async function runSql(text, params = []) {
  const sql = transformQuery(text);
  const normalized = sql.trim().toUpperCase();

  try {
    const result = await pool.query(sql, params);
    
    if (normalized.startsWith('SELECT') || normalized.includes('RETURNING')) {
      return { rows: result.rows, rowCount: result.rowCount };
    }

    return { rows: result.rows || [], rowCount: result.rowCount ?? 0 };
  } catch (error) {
    console.error('SQL Error:', error.message, '\nQuery:', sql, '\nParams:', params);
    throw error;
  }
}

async function seedDatabase() {
  const raw = await fs.readFile(SEED_PATH, 'utf8');
  const seed = JSON.parse(raw);
  const baseTime = Date.now();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let timestampIndex = 0;

    for (const user of seed.users || []) {
      await client.query(
        `INSERT INTO users (id, name, email, password, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          user.name,
          String(user.email).toLowerCase(),
          user.password,
          user.role || 'user',
          new Date(baseTime + (timestampIndex += 1)).toISOString(),
        ]
      );
    }

    for (const expense of seed.personalExpenses || []) {
      await client.query(
        `INSERT INTO personal_expenses (
          id, user_id, category, amount, description, date, payment_method,
          recurrence, reminder_enabled, reminder_days_before, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          expense.id,
          expense.userId,
          expense.category,
          Number(expense.amount),
          expense.description,
          expense.date,
          expense.paymentMethod,
          expense.recurrence || 'none',
          expense.reminderEnabled ? true : false,
          Number(expense.reminderDaysBefore || 0),
          new Date(baseTime + (timestampIndex += 1)).toISOString(),
        ]
      );
    }

    for (const organization of seed.organizations || []) {
      await client.query(
        `INSERT INTO organizations (id, name, description, head_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          organization.id,
          organization.name,
          organization.description,
          organization.headId,
          new Date(baseTime + (timestampIndex += 1)).toISOString(),
        ]
      );
    }

    for (const employee of seed.employees || []) {
      await client.query(
        `INSERT INTO employees (id, organization_id, name, email, role, joined_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          employee.id,
          employee.organizationId,
          employee.name,
          employee.email,
          employee.role,
          employee.joinedAt,
          new Date(baseTime + (timestampIndex += 1)).toISOString(),
        ]
      );
    }

    for (const request of seed.moneyRequests || []) {
      await client.query(
        `INSERT INTO money_requests (
          id, organization_id, employee_id, employee_name, amount, reason, status,
          requested_at, responded_at, responded_by, response_note, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          request.id,
          request.organizationId,
          request.employeeId,
          request.employeeName,
          Number(request.amount),
          request.reason,
          request.status || 'pending',
          request.requestedAt,
          request.respondedAt ?? null,
          request.respondedBy ?? null,
          request.responseNote ?? null,
          new Date(baseTime + (timestampIndex += 1)).toISOString(),
        ]
      );
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function query(text, params) {
  requireDatabaseConfiguration();
  return runSql(text, params);
}

async function runStatements(poolOrClient, statements) {
  for (const statement of statements) {
    try {
      await poolOrClient.query(statement);
    } catch (error) {
      // Ignore "already exists" errors for CREATE TABLE IF NOT EXISTS
      if (!error.message.includes('already exists')) {
        console.error('Error executing statement:', error.message);
      }
    }
  }
}

export async function withTransaction(callback) {
  requireDatabaseConfiguration();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const queryWrapper = {
      query: (text, params) => {
        const sql = transformQuery(text);
        return client.query(sql, params).then(result => ({
          rows: result.rows,
          rowCount: result.rowCount
        }));
      }
    };

    const result = await callback(queryWrapper);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  if (pool) {
    return;
  }

  const databaseUrl = getDatabaseUrl();
  console.log('Connecting to PostgreSQL database...');

  // Detect whether SSL is required (common on managed hosts like Render)
  const shouldUseSsl = process.env.PGSSLMODE === 'require' || /render\.com/.test(databaseUrl) || process.env.NODE_ENV === 'production';

  const poolConfig = {
    connectionString: databaseUrl,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  if (shouldUseSsl) {
    // For many managed Postgres providers (Render, Heroku) you can connect with ssl
    // Disable strict certificate verification when using provider-managed certificates
    // (set rejectUnauthorized=false). If you need stricter validation, provide CA certs.
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  pool = new Pool(poolConfig);

  pool.on('error', (error) => {
    console.error('Unexpected error on idle client', error);
  });

  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL');
    client.release();
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }

  // Create tables if they don't exist
  await runStatements(pool, [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS personal_expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      description TEXT NOT NULL,
      date DATE NOT NULL,
      payment_method TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'none',
      reminder_enabled BOOLEAN NOT NULL DEFAULT false,
      reminder_days_before INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS personal_expenses_user_created_idx
      ON personal_expenses (user_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      head_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS organizations_created_idx
      ON organizations (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS employees_org_created_idx
      ON employees (organization_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS money_requests (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      employee_name TEXT NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP NULL,
      responded_by TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
      response_note TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS money_requests_created_idx
      ON money_requests (created_at DESC)`,
  ]);

  // Seed database if empty
  const { rows } = await query('SELECT COUNT(*) AS count FROM users');
  if (Number(rows[0]?.count || 0) === 0) {
    await seedDatabase();
  }
}

export async function closeDatabase() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = undefined;
}

export async function getDatabaseDiagnostics() {
  requireDatabaseConfiguration();

  const [users, personalExpenses, organizations, employees, moneyRequests] = await Promise.all([
    query('SELECT COUNT(*) AS count FROM users'),
    query('SELECT COUNT(*) AS count FROM personal_expenses'),
    query('SELECT COUNT(*) AS count FROM organizations'),
    query('SELECT COUNT(*) AS count FROM employees'),
    query('SELECT COUNT(*) AS count FROM money_requests'),
  ]);

  return {
    provider: 'postgresql',
    database_url: getDatabaseUrl(),
    tables: {
      users: Number(users.rows[0]?.count || 0),
      personalExpenses: Number(personalExpenses.rows[0]?.count || 0),
      organizations: Number(organizations.rows[0]?.count || 0),
      employees: Number(employees.rows[0]?.count || 0),
      moneyRequests: Number(moneyRequests.rows[0]?.count || 0),
    },
  };
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}
