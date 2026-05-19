import test from 'node:test';
import { before } from 'node:test';
import { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let app;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_SQLITE_PATH = path.join(__dirname, `../data/expense-tracker.test.${process.pid}.sqlite`);

async function resetTestDatabaseFiles() {
  await Promise.all([
    fs.rm(TEST_SQLITE_PATH, { force: true }),
    fs.rm(`${TEST_SQLITE_PATH}-shm`, { force: true }),
    fs.rm(`${TEST_SQLITE_PATH}-wal`, { force: true }),
  ]);
}

before(async () => {
  process.env.SQLITE_PATH = TEST_SQLITE_PATH;
  await resetTestDatabaseFiles();

  const { initializeDatabase } = await import('../src/services/db.service.js');
  const appModule = await import('../src/app.js');
  app = appModule.default;

  await initializeDatabase();
});

after(async () => {
  const { closeDatabase } = await import('../src/services/db.service.js');
  await closeDatabase();
  await resetTestDatabaseFiles();
});

async function request(path, options = {}) {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? JSON.parse(text) : text;

    return { response, body };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function loginAndGetToken(email, password) {
  const { response, body } = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200);
  assert.ok(body.token);
  return body.token;
}

test('GET /api/health returns service status', async () => {
  const { response, body } = await request('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true, service: 'expense-tracker-backend' });
});

test('POST /api/auth/signup rejects missing fields', async () => {
  const { response, body } = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.equal(body.message, 'Validation failed');
  assert.ok(Array.isArray(body.errors));
  assert.ok(body.errors.some((error) => error.source === 'body' && error.path === 'name'));
  assert.ok(body.errors.some((error) => error.source === 'body' && error.path === 'email'));
  assert.ok(body.errors.some((error) => error.source === 'body' && error.path === 'password'));
});

test('GET /api/auth/me rejects missing token', async () => {
  const { response, body } = await request('/api/auth/me');

  assert.equal(response.status, 401);
  assert.equal(body.message, 'Missing auth token');
});

test('admin can browse admin panel data', async () => {
  const adminToken = await loginAndGetToken('john@example.com', 'password');

  const { response, body } = await request('/api/admin/panel', {
    headers: {
      authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data.users));
  assert.ok(Array.isArray(body.data.expenses));
  assert.ok(Array.isArray(body.data.organizations));
  assert.ok(Array.isArray(body.data.requests));
});

test('personal expense supports recurring schedule and reminders', async () => {
  const token = await loginAndGetToken('john@example.com', 'password');

  const createResponse = await request('/api/expenses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      category: 'Utilities',
      amount: 89.99,
      description: 'Internet bill',
      date: '2026-05-02',
      paymentMethod: 'Bank Transfer',
      recurrence: 'monthly',
      reminderEnabled: true,
      reminderDaysBefore: 5,
    }),
  });

  assert.equal(createResponse.response.status, 201);
  assert.equal(createResponse.body.data.recurrence, 'monthly');
  assert.equal(createResponse.body.data.reminderEnabled, 1);
  assert.equal(createResponse.body.data.reminderDaysBefore, 5);

  const updateResponse = await request(`/api/expenses/${createResponse.body.data.id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      reminderEnabled: false,
      reminderDaysBefore: 0,
      recurrence: 'yearly',
    }),
  });

  assert.equal(updateResponse.response.status, 200);
  assert.equal(updateResponse.body.data.recurrence, 'yearly');
  assert.equal(updateResponse.body.data.reminderEnabled, 0);
  assert.equal(updateResponse.body.data.reminderDaysBefore, 0);
});

test('employee cannot create organization', async () => {
  const employeeToken = await loginAndGetToken('bob@techinnovations.com', 'password');

  const { response, body } = await request('/api/organizations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${employeeToken}`,
    },
    body: JSON.stringify({ name: 'Blocked Org', description: 'Should fail' }),
  });

  assert.equal(response.status, 403);
  assert.equal(body.message, 'Only admin or organization head users can create organizations');
});

test('organization head can create organization for own workspace', async () => {
  const orgHeadToken = await loginAndGetToken('sara@innovationlabs.com', 'password');

  const { response, body } = await request('/api/organizations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${orgHeadToken}`,
    },
    body: JSON.stringify({
      name: 'Sara Ventures',
      description: 'Head-owned workspace',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(body.data.name, 'Sara Ventures');
  assert.equal(body.data.headId, '4');
});

test('employee can only view own money requests', async () => {
  const employeeToken = await loginAndGetToken('bob@techinnovations.com', 'password');

  const { response, body } = await request('/api/money-requests', {
    headers: {
      authorization: `Bearer ${employeeToken}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].employeeName, 'Bob Williams');
  assert.equal(body.data[0].employeeId, '2');
});

test('employee cannot create request for another organization', async () => {
  const employeeToken = await loginAndGetToken('bob@techinnovations.com', 'password');

  const { response, body } = await request('/api/money-requests', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${employeeToken}`,
    },
    body: JSON.stringify({
      organizationId: '2',
      amount: 250,
      reason: 'Cross-org should fail',
    }),
  });

  assert.equal(response.status, 403);
  assert.equal(body.message, 'You can only create requests for your own organization');
});

test('employee cannot update money request status', async () => {
  const employeeToken = await loginAndGetToken('bob@techinnovations.com', 'password');

  const { response, body } = await request('/api/money-requests/1/status', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${employeeToken}`,
    },
    body: JSON.stringify({ status: 'approved' }),
  });

  assert.equal(response.status, 403);
  assert.equal(body.message, 'Only admin or organization head users can update request status');
});

test('rejecting a money request requires a review note', async () => {
  const adminToken = await loginAndGetToken('john@example.com', 'password');

  const { response, body } = await request('/api/money-requests/1/status', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'rejected' }),
  });

  assert.equal(response.status, 400);
  assert.equal(body.message, 'Validation failed');
  assert.ok(body.errors.some((error) => error.source === 'body' && error.path === 'note'));
});

test('employee cannot create employee records', async () => {
  const employeeToken = await loginAndGetToken('bob@techinnovations.com', 'password');

  const { response, body } = await request('/api/employees', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${employeeToken}`,
    },
    body: JSON.stringify({
      organizationId: '1',
      name: 'Blocked User',
      email: 'blocked@example.com',
      role: 'Tester',
    }),
  });

  assert.equal(response.status, 403);
  assert.equal(body.message, 'Only admin or organization head users can add employees');
});

test('cannot add employee for an email without a registered user account', async () => {
  const adminToken = await loginAndGetToken('john@example.com', 'password');

  const { response, body } = await request('/api/employees', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      organizationId: '1',
      name: 'Ghost User',
      email: 'ghost@example.com',
      role: 'QA Engineer',
    }),
  });

  assert.equal(response.status, 404);
  assert.equal(body.message, 'A registered user with this email is required before adding an employee');
});

test('adding an employee promotes an existing user account to employee', async () => {
  const adminToken = await loginAndGetToken('john@example.com', 'password');

  const createResponse = await request('/api/employees', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      organizationId: '1',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'QA Engineer',
    }),
  });

  assert.equal(createResponse.response.status, 201);
  assert.equal(createResponse.body.data.email, 'jane@example.com');
  assert.equal(createResponse.body.data.organizationId, '1');
  assert.equal(createResponse.body.data.role, 'QA Engineer');

  const janeLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'jane@example.com', password: 'password' }),
  });

  assert.equal(janeLogin.response.status, 200);
  assert.equal(janeLogin.body.user.role, 'employee');

  const usersResponse = await request('/api/users', {
    headers: {
      authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(usersResponse.response.status, 200);
  const janeUser = usersResponse.body.data.find((user) => user.email === 'jane@example.com');
  assert.ok(janeUser);
  assert.equal(janeUser.role, 'employee');
});

test('same employee can be added to a different organization', async () => {
  const adminToken = await loginAndGetToken('john@example.com', 'password');

  const { response, body } = await request('/api/employees', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      organizationId: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'Research Analyst',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(body.data.email, 'jane@example.com');
  assert.equal(body.data.organizationId, '2');
  assert.equal(body.data.role, 'Research Analyst');
});

test('same employee cannot be added twice to the same organization', async () => {
  const adminToken = await loginAndGetToken('john@example.com', 'password');

  const { response, body } = await request('/api/employees', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      organizationId: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'Research Analyst',
    }),
  });

  assert.equal(response.status, 409);
  assert.equal(body.message, 'This user is already linked to this organization');
});

test('organization head can view and manage only assigned organization data', async () => {
  const orgHeadToken = await loginAndGetToken('sara@innovationlabs.com', 'password');

  const organizationsResponse = await request('/api/organizations', {
    headers: {
      authorization: `Bearer ${orgHeadToken}`,
    },
  });

  assert.equal(organizationsResponse.response.status, 200);
  assert.ok(organizationsResponse.body.data.length >= 1);
  assert.ok(
    organizationsResponse.body.data.some((organization) => organization.name === 'Innovation Labs')
  );

  const requestsResponse = await request('/api/money-requests', {
    headers: {
      authorization: `Bearer ${orgHeadToken}`,
    },
  });

  assert.equal(requestsResponse.response.status, 200);
  assert.equal(requestsResponse.body.data.length, 1);
  assert.equal(requestsResponse.body.data[0].organizationId, '2');

  const updateResponse = await request('/api/money-requests/3/status', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${orgHeadToken}`,
    },
    body: JSON.stringify({ status: 'approved', note: 'Approved for the next vendor milestone' }),
  });

  assert.equal(updateResponse.response.status, 200);
  assert.equal(updateResponse.body.data.status, 'approved');
  assert.equal(updateResponse.body.data.respondedBy, '4');
  assert.equal(updateResponse.body.data.respondedByName, 'Sara Khan');
  assert.equal(updateResponse.body.data.responseNote, 'Approved for the next vendor milestone');

  const secondReview = await request('/api/money-requests/3/status', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${orgHeadToken}`,
    },
    body: JSON.stringify({ status: 'rejected', note: 'Too late for changes' }),
  });

  assert.equal(secondReview.response.status, 409);
  assert.equal(secondReview.body.message, 'Only pending requests can be reviewed');
});

test('admin can list users and update another user role', async () => {
  const adminToken = await loginAndGetToken('john@example.com', 'password');

  const usersResponse = await request('/api/users', {
    headers: {
      authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(usersResponse.response.status, 200);
  const bob = usersResponse.body.data.find((user) => user.email === 'bob@techinnovations.com');
  assert.ok(bob);
  assert.equal(bob.role, 'employee');

  const updateResponse = await request(`/api/users/${bob.id}/role`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: 'user' }),
  });

  assert.equal(updateResponse.response.status, 200);
  assert.equal(updateResponse.body.data.role, 'user');
});

test('employee cannot update user roles', async () => {
  const employeeToken = await loginAndGetToken('bob@techinnovations.com', 'password');

  const { response, body } = await request('/api/users/2/role', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${employeeToken}`,
    },
    body: JSON.stringify({ role: 'employee' }),
  });

  assert.equal(response.status, 403);
  assert.equal(body.message, 'Only admin users can update user roles');
});

test('validation rejects unknown request fields', async () => {
  const { response, body } = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'john@example.com',
      password: 'password',
      extra: 'nope',
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(body.message, 'Validation failed');
  assert.ok(body.errors.some((error) => error.source === 'body' && error.message.includes('Unrecognized key')));
});

test('PATCH /api/expenses/:id rejects empty update payload', async () => {
  const token = await loginAndGetToken('john@example.com', 'password');

  const createResponse = await request('/api/expenses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      category: 'Travel',
      amount: 10,
      description: 'Taxi',
      date: '2026-04-26',
      paymentMethod: 'cash',
    }),
  });

  assert.equal(createResponse.response.status, 201);

  const { response, body } = await request(`/api/expenses/${createResponse.body.data.id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.equal(body.message, 'Validation failed');
  assert.ok(body.errors.some((error) => error.source === 'body' && error.message === 'At least one field must be provided for update'));
});
