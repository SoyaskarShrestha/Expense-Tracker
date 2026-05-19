import { query, sanitizeUser, userSelectColumns } from '../services/db.service.js';

const ADMIN_PANEL_READ_ONLY = process.env.ADMIN_PANEL_READ_ONLY === 'true';

function isAdmin(user) {
  return user?.role === 'admin';
}

export async function listUsers(req, res) {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: 'Only admin users can view users' });
  }

  const { rows } = await query(
    `SELECT ${userSelectColumns}
     FROM users
     ORDER BY created_at DESC`
  );

  return res.json({ data: rows.map((user) => sanitizeUser(user)) });
}

export async function updateUserRole(req, res) {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: 'Only admin users can update user roles' });
  }

  if (ADMIN_PANEL_READ_ONLY) {
    return res.status(403).json({ message: 'Admin role management is in read-only mode' });
  }

  const { id } = req.params;
  const { role } = req.body;

  if (id === req.user.id) {
    return res.status(400).json({ message: 'You cannot change your own role' });
  }

  const { rows } = await query(
    `UPDATE users
     SET role = $1
     WHERE id = $2
     RETURNING ${userSelectColumns}`,
    [role, id]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ data: sanitizeUser(rows[0]) });
}
