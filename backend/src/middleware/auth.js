import jwt from 'jsonwebtoken';
import { query } from '../services/db.service.js';

export function requireRoles(roles, message = 'Forbidden') {
  const allowedRoles = new Set(roles);

  return (req, res, next) => {
    if (!req.user || !allowedRoles.has(req.user.role)) {
      return res.status(403).json({ message });
    }

    return next();
  };
}

export async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Missing auth token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-this-in-production');

    const { rows } = await query(
      'SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1',
      [payload.id]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid auth token' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid auth token' });
  }
}
