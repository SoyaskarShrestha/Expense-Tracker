import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_PATH = path.join(__dirname, '../../data/db.json');

let db;
let sqliteFilePath = '';

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
  if (!db) {
    throw new Error('SQLite database is not initialized. Call initializeDatabase() first.');
  }
}

function resolveSqlitePath() {
  const configuredPath = process.env.SQLITE_PATH || './data/expense-tracker.sqlite';
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.join(__dirname, '../../', configuredPath);
}

function getSeedTimestamp(baseTime, index) {
  return new Date(baseTime + index).toISOString();
}

async function runStatements(database, statements) {
  for (const statement of statements) {
    await database.exec(statement);
  }
}

function transformQuery(text) {
  return text
    .replace(/\$(\d+)/g, '?')
    .replace(/::int/g, '')
    .replace(/\bNOW\(\)/g, 'CURRENT_TIMESTAMP');
}

async function runSql(text, params = []) {
  const sql = transformQuery(text);
  const normalized = sql.trim().toUpperCase();

  if (normalized.startsWith('SELECT') || normalized.startsWith('PRAGMA')) {
    const rows = await db.all(sql, params);
    return { rows, rowCount: rows.length };
  }

  if (normalized.includes('RETURNING')) {
    const rows = await db.all(sql, params);
    return { rows, rowCount: rows.length };
  }

  const result = await db.run(sql, params);
  return { rows: [], rowCount: result.changes ?? 0, lastID: result.lastID };
}

async function seedDatabase() {
  const raw = await fs.readFile(SEED_PATH, 'utf8');
  const seed = JSON.parse(raw);
  const baseTime = Date.now();

  const insertUser = await db.prepare(
    `INSERT INTO users (id, name, email, password, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertExpense = await db.prepare(
    `INSERT INTO personal_expenses (
      id,
      user_id,
      category,
      amount,
      description,
      date,
      payment_method,
      recurrence,
      reminder_enabled,
      reminder_days_before,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertOrg = await db.prepare(
    `INSERT INTO organizations (id, name, description, head_id, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertEmployee = await db.prepare(
    `INSERT INTO employees (id, organization_id, name, email, role, joined_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertRequest = await db.prepare(
    `INSERT INTO money_requests (
      id,
      organization_id,
      employee_id,
      employee_name,
      amount,
      reason,
      status,
      requested_at,
      responded_at,
      responded_by,
      response_note,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  try {
    await db.exec('BEGIN');

    let timestampIndex = 0;

    for (const user of seed.users || []) {
      await insertUser.run(
        user.id,
        user.name,
        String(user.email).toLowerCase(),
        user.password,
        user.role || 'user',
        getSeedTimestamp(baseTime, (timestampIndex += 1))
      );
    }

    for (const expense of seed.personalExpenses || []) {
      await insertExpense.run(
        expense.id,
        expense.userId,
        expense.category,
        Number(expense.amount),
        expense.description,
        expense.date,
        expense.paymentMethod,
        expense.recurrence || 'none',
        expense.reminderEnabled ? 1 : 0,
        Number(expense.reminderDaysBefore || 0),
        getSeedTimestamp(baseTime, (timestampIndex += 1))
      );
    }

    for (const organization of seed.organizations || []) {
      await insertOrg.run(
        organization.id,
        organization.name,
        organization.description,
        organization.headId,
        getSeedTimestamp(baseTime, (timestampIndex += 1))
      );
    }

    for (const employee of seed.employees || []) {
      await insertEmployee.run(
        employee.id,
        employee.organizationId,
        employee.name,
        employee.email,
        employee.role,
        employee.joinedAt,
        getSeedTimestamp(baseTime, (timestampIndex += 1))
      );
    }

    for (const request of seed.moneyRequests || []) {
      await insertRequest.run(
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
        getSeedTimestamp(baseTime, (timestampIndex += 1))
      );
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  } finally {
    await insertUser.finalize();
    await insertExpense.finalize();
    await insertOrg.finalize();
    await insertEmployee.finalize();
    await insertRequest.finalize();
  }
}

export async function query(text, params) {
  requireDatabaseConfiguration();
  return runSql(text, params);
}

export async function withTransaction(callback) {
  requireDatabaseConfiguration();

  const client = {
    query: (text, params) => runSql(text, params),
  };

  try {
    await db.exec('BEGIN');
    const result = await callback(client);
    await db.exec('COMMIT');
    return result;
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function initializeDatabase() {
  if (db) {
    return;
  }

  const databasePath = resolveSqlitePath();
  sqliteFilePath = databasePath;
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  db = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON');

  await runStatements(db, [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS personal_expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date DATE NOT NULL,
      payment_method TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'none',
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      reminder_days_before INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS personal_expenses_user_created_idx
      ON personal_expenses (user_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      head_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS organizations_created_idx
      ON organizations (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS employees_org_created_idx
      ON employees (organization_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS money_requests (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      employee_name TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded_at TEXT NULL,
      responded_by TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
      response_note TEXT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS money_requests_created_idx
      ON money_requests (created_at DESC)`,
  ]);

  await ensureColumn('personal_expenses', 'recurrence', "TEXT NOT NULL DEFAULT 'none'");
  await ensureColumn('personal_expenses', 'reminder_enabled', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('personal_expenses', 'reminder_days_before', 'INTEGER NOT NULL DEFAULT 0');

  await ensureColumn('money_requests', 'responded_by', 'TEXT NULL REFERENCES users(id) ON DELETE SET NULL');
  await ensureColumn('money_requests', 'response_note', 'TEXT NULL');

  const { rows } = await query('SELECT COUNT(*) AS count FROM users');
  if (Number(rows[0]?.count || 0) === 0) {
    await seedDatabase();
  }
}

export async function closeDatabase() {
  if (!db) {
    return;
  }

  await db.close();
  db = undefined;
  sqliteFilePath = '';
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
    provider: 'sqlite',
    filePath: sqliteFilePath || resolveSqlitePath(),
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
