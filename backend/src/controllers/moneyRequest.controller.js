import { nanoid } from 'nanoid';
import { moneyRequestSelectColumns, query } from '../services/db.service.js';

function isAdmin(user) {
  return user?.role === 'admin';
}

function isOrgHead(user) {
  return user?.role === 'organization_head';
}

function isEmployee(user) {
  return user?.role === 'employee';
}

async function findEmployeeProfilesByEmail(email) {
  const { rows } = await query(
    `SELECT id, organization_id AS "organizationId", name
     FROM employees
     WHERE LOWER(email) = LOWER($1)
     ORDER BY created_at DESC`,
    [email]
  );
  return rows;
}

export async function listMoneyRequests(req, res) {
  if (isAdmin(req.user)) {
    const { rows } = await query(
      `SELECT ${moneyRequestSelectColumns('money_requests')}
       FROM money_requests
       ORDER BY created_at DESC`
    );
    return res.json({ data: rows });
  }

  if (isOrgHead(req.user)) {
    const { rows } = await query(
      `SELECT ${moneyRequestSelectColumns('mr')}
       FROM money_requests mr
       WHERE EXISTS (
         SELECT 1
         FROM organizations o
         WHERE o.id = mr.organization_id
           AND o.head_id = $1
       )
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ data: rows });
  }

  if (isEmployee(req.user)) {
    const { rows } = await query(
      `SELECT ${moneyRequestSelectColumns('mr')}
       FROM money_requests mr
       WHERE EXISTS (
         SELECT 1
         FROM employees e
         WHERE e.id = mr.employee_id
           AND LOWER(e.email) = LOWER($1)
       )
       ORDER BY created_at DESC`,
      [req.user.email]
    );
    return res.json({ data: rows });
  }

  return res.json({ data: [] });
}

export async function createMoneyRequest(req, res) {
  const { organizationId, employeeId, amount, reason } = req.body;

  if (!isAdmin(req.user) && !isOrgHead(req.user) && !isEmployee(req.user)) {
    return res.status(403).json({ message: 'Only admin, organization head, or employee users can create money requests' });
  }

  let targetOrganizationId = organizationId;
  let targetEmployeeId = employeeId;
  let targetEmployeeName = '';

  if (isEmployee(req.user)) {
    const employeeProfiles = await findEmployeeProfilesByEmail(req.user.email);
    if (employeeProfiles.length === 0) {
      return res.status(403).json({ message: 'Employee profile not found for this account' });
    }

    const selectedProfile = targetOrganizationId
      ? employeeProfiles.find((item) => item.organizationId === targetOrganizationId)
      : employeeProfiles[0];

    if (!selectedProfile) {
      return res.status(403).json({ message: 'You can only create requests for your own organization' });
    }

    targetOrganizationId = selectedProfile.organizationId;
    targetEmployeeId = selectedProfile.id;
    targetEmployeeName = selectedProfile.name;
  }

  if (isOrgHead(req.user)) {
    if (!targetOrganizationId || !targetEmployeeId) {
      return res.status(400).json({ message: 'organizationId and employeeId are required' });
    }

    const orgAccess = await query('SELECT 1 FROM organizations WHERE id = $1 AND head_id = $2 LIMIT 1', [
      targetOrganizationId,
      req.user.id,
    ]);

    if (orgAccess.rowCount === 0) {
      return res.status(403).json({ message: 'Organization access denied' });
    }

    const { rows: employeeRows } = await query(
      'SELECT id, name FROM employees WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [targetEmployeeId, targetOrganizationId]
    );
    const employee = employeeRows[0];

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found in selected organization' });
    }

    targetEmployeeName = employee.name;
  }

  if (isAdmin(req.user)) {
    if (!targetOrganizationId || !targetEmployeeId) {
      return res.status(400).json({ message: 'organizationId and employeeId are required' });
    }

    const orgAccess = await query('SELECT 1 FROM organizations WHERE id = $1 AND head_id = $2 LIMIT 1', [
      targetOrganizationId,
      req.user.id,
    ]);

    if (orgAccess.rowCount === 0) {
      return res.status(403).json({ message: 'Organization access denied' });
    }

    const { rows: employeeRows } = await query(
      'SELECT id, name FROM employees WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [targetEmployeeId, targetOrganizationId]
    );
    const employee = employeeRows[0];

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found in selected organization' });
    }

    targetEmployeeName = employee.name;
  }

  const parsedAmount = Number(amount);

  const { rows } = await query(
    `INSERT INTO money_requests (
      id,
      organization_id,
      employee_id,
      employee_name,
      amount,
      reason,
      status,
      requested_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
    RETURNING ${moneyRequestSelectColumns('money_requests')}`,
    [nanoid(), targetOrganizationId, targetEmployeeId, targetEmployeeName, parsedAmount, reason]
  );

  return res.status(201).json({ data: rows[0] });
}

export async function updateMoneyRequestStatus(req, res) {
  if (!isAdmin(req.user) && !isOrgHead(req.user)) {
    return res.status(403).json({ message: 'Only admin or organization head users can update request status' });
  }

  const { id } = req.params;
  const { status, note } = req.body;

  const { rows: requestRows } = await query(
    `SELECT ${moneyRequestSelectColumns('mr')}
     FROM money_requests mr
     INNER JOIN organizations o ON o.id = mr.organization_id
     WHERE mr.id = $1
       AND ($2 = 'admin' OR o.head_id = $3)
     LIMIT 1`,
    [id, req.user.role, req.user.id]
  );

  const currentRequest = requestRows[0];

  if (!currentRequest) {
    return res.status(404).json({ message: 'Money request not found or access denied' });
  }

  if (currentRequest.status !== 'pending') {
    return res.status(409).json({ message: 'Only pending requests can be reviewed' });
  }

  await query(
    `UPDATE money_requests
     SET status = $1,
         responded_at = NOW(),
         responded_by = $2,
         response_note = $3
     WHERE id = $4`,
    [status, req.user.id, note ?? null, id]
  );

  return res.json({
    data: {
      ...currentRequest,
      status,
      respondedAt: new Date().toISOString(),
      respondedBy: req.user.id,
      respondedByName: req.user.name,
      responseNote: note ?? null,
    },
  });
}
