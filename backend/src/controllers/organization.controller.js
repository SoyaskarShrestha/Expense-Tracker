import { nanoid } from 'nanoid';
import { organizationSelectColumns, query } from '../services/db.service.js';

function isAdmin(user) {
  return user?.role === 'admin';
}

function isOrgHead(user) {
  return user?.role === 'organization_head';
}

function isEmployee(user) {
  return user?.role === 'employee';
}

export async function listOrganizations(req, res) {
  if (isAdmin(req.user)) {
    const { rows } = await query(
      `SELECT ${organizationSelectColumns}
       FROM organizations
       ORDER BY created_at DESC`
    );
    return res.json({ data: rows });
  }

  if (isOrgHead(req.user)) {
    const { rows } = await query(
      `SELECT ${organizationSelectColumns}
       FROM organizations
       WHERE head_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ data: rows });
  }

  if (isEmployee(req.user)) {
    const { rows } = await query(
      `SELECT ${organizationSelectColumns}
       FROM organizations o
       WHERE EXISTS (
         SELECT 1
         FROM employees e
         WHERE e.organization_id = o.id
           AND LOWER(e.email) = LOWER($1)
       )
       ORDER BY created_at DESC`,
      [req.user.email]
    );
    return res.json({ data: rows });
  }

  return res.json({ data: [] });
}

export async function createOrganization(req, res) {
  if (!isAdmin(req.user) && !isOrgHead(req.user)) {
    return res.status(403).json({ message: 'Only admin or organization head users can create organizations' });
  }

  const { name, description, headId } = req.body;

  let targetHeadId = req.user.id;

  if (isOrgHead(req.user)) {
    if (headId && headId !== req.user.id) {
      return res.status(403).json({ message: 'Organization heads can only create organizations for themselves' });
    }
    targetHeadId = req.user.id;
  } else if (headId) {
    const { rows: headRows } = await query(
      `SELECT id, role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [headId]
    );
    const headUser = headRows[0];

    if (!headUser || !['organization_head', 'admin'].includes(headUser.role)) {
      return res.status(400).json({ message: 'headId must reference an admin or organization head user' });
    }

    targetHeadId = headUser.id;
  }

  const { rows } = await query(
    `INSERT INTO organizations (id, name, description, head_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${organizationSelectColumns}`,
    [nanoid(), name, description, targetHeadId]
  );

  const newOrg = rows[0];

  return res.status(201).json({ data: newOrg });
}
