import { nanoid } from 'nanoid';
import { employeeSelectColumns, query, withTransaction } from '../services/db.service.js';

function isAdmin(user) {
  return user?.role === 'admin';
}

function isOrgHead(user) {
  return user?.role === 'organization_head';
}

function isEmployee(user) {
  return user?.role === 'employee';
}

export async function listEmployees(req, res) {
  if (isAdmin(req.user)) {
    const { rows } = await query(
      `SELECT ${employeeSelectColumns}
       FROM employees
       ORDER BY created_at DESC`
    );
    return res.json({ data: rows });
  }

  if (isOrgHead(req.user)) {
    const { rows } = await query(
      `SELECT ${employeeSelectColumns}
       FROM employees e
       WHERE EXISTS (
         SELECT 1
         FROM organizations o
         WHERE o.id = e.organization_id
           AND o.head_id = $1
       )
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ data: rows });
  }

  if (isEmployee(req.user)) {
    const { rows } = await query(
      `SELECT ${employeeSelectColumns}
       FROM employees
       WHERE LOWER(email) = LOWER($1)
       ORDER BY created_at DESC`,
      [req.user.email]
    );
    return res.json({ data: rows });
  }

  return res.json({ data: [] });
}

export async function createEmployee(req, res) {
  if (!isAdmin(req.user) && !isOrgHead(req.user)) {
    return res.status(403).json({ message: 'Only admin or organization head users can add employees' });
  }

  const { organizationId, name, email, role } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  const orgExists = await query(
    isAdmin(req.user)
      ? 'SELECT 1 FROM organizations WHERE id = $1 LIMIT 1'
      : 'SELECT 1 FROM organizations WHERE id = $1 AND head_id = $2 LIMIT 1',
    isAdmin(req.user) ? [organizationId] : [organizationId, req.user.id]
  );
  if (orgExists.rowCount === 0) {
    return res.status(404).json({ message: 'Organization not found or access denied' });
  }

  const existingUserResult = await query(
    `SELECT id, name, email, role
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail]
  );
  const existingUser = existingUserResult.rows[0];

  if (!existingUser) {
    return res.status(404).json({ message: 'A registered user with this email is required before adding an employee' });
  }

  if (!['user', 'employee'].includes(existingUser.role)) {
    return res.status(409).json({ message: 'Only users with role user or employee can be linked as employees' });
  }

  const existingEmployeeResult = await query(
    `SELECT id
     FROM employees
     WHERE organization_id = $1
       AND LOWER(email) = LOWER($2)
     LIMIT 1`,
    [organizationId, normalizedEmail]
  );

  if (existingEmployeeResult.rowCount > 0) {
    return res.status(409).json({ message: 'This user is already linked to this organization' });
  }

  const newEmployee = await withTransaction(async (db) => {
    if (existingUser.role === 'user') {
      await db.query(
        `UPDATE users
         SET role = 'employee'
         WHERE id = $1`,
        [existingUser.id]
      );
    }

    const { rows } = await db.query(
      `INSERT INTO employees (id, organization_id, name, email, role, joined_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING ${employeeSelectColumns}`,
      [nanoid(), organizationId, name || existingUser.name, existingUser.email, role]
    );

    return rows[0];
  });

  return res.status(201).json({ data: newEmployee });
}

export async function deleteEmployee(req, res) {
  if (!isAdmin(req.user) && !isOrgHead(req.user)) {
    return res.status(403).json({ message: 'Only admin or organization head users can remove employees' });
  }

  const { id } = req.params;
  const result = await query(
    `DELETE FROM employees
     WHERE id = $1
       AND EXISTS (
         SELECT 1
         FROM organizations o
         WHERE o.id = employees.organization_id
           AND ($2 = 'admin' OR o.head_id = $3)
       )`,
    [id, req.user.role, req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  return res.status(204).send();
}
