import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { query, sanitizeUser, userSelectColumns, organizationSelectColumns, withTransaction } from '../services/db.service.js';
import { signToken } from '../services/auth.service.js';

const BCRYPT_ROUNDS = 10;

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function signup(req, res) {
  const { name, email, password, isOrgAccount, organizationName, organizationDescription } = req.body;

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = await query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);

  if (exists.rowCount > 0) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
  const userId = nanoid();
  let organization = null;

  if (isOrgAccount && organizationName) {
    // Create user as organization_head with organization
    try {
      const result = await withTransaction(async (db) => {
        const { rows: userRows } = await db.query(
          `INSERT INTO users (id, name, email, password, role)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING ${userSelectColumns}`,
          [userId, name, normalizedEmail, hashedPassword, 'organization_head']
        );

        const orgId = nanoid();
        const { rows: orgRows } = await db.query(
          `INSERT INTO organizations (id, name, description, head_id)
           VALUES ($1, $2, $3, $4)
           RETURNING ${organizationSelectColumns}`,
          [orgId, organizationName, organizationDescription || '', userId]
        );

        return {
          user: userRows[0],
          organization: orgRows[0],
        };
      });

      const newUser = result.user;
      organization = result.organization;

      const token = signToken(newUser);
      return res.status(201).json({ token, user: sanitizeUser(newUser), organization });
    } catch (error) {
      console.error('Organization signup error:', error);
      return res.status(500).json({ message: 'Failed to create organization' });
    }
  } else {
    // Regular user account
    const { rows } = await query(
      `INSERT INTO users (id, name, email, password, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${userSelectColumns}`,
      [userId, name, normalizedEmail, hashedPassword, 'user']
    );

    const newUser = rows[0];

    const token = signToken(newUser);
    return res.status(201).json({ token, user: sanitizeUser(newUser) });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  const normalizedEmail = String(email).trim().toLowerCase();
  const { rows } = await query(`SELECT ${userSelectColumns} FROM users WHERE email = $1 LIMIT 1`, [normalizedEmail]);
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  let isValidPassword = false;
  if (isBcryptHash(user.password)) {
    isValidPassword = await bcrypt.compare(String(password), user.password);
  } else {
    // Preserve access for legacy seed data stored before password hashing was added.
    isValidPassword = user.password === String(password);
    if (isValidPassword) {
      const upgradedHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
      await query('UPDATE users SET password = $1 WHERE id = $2', [upgradedHash, user.id]);
      user.password = upgradedHash;
    }
  }

  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user);
  return res.json({ token, user: sanitizeUser(user) });
}

export async function me(req, res) {
  const { rows } = await query(`SELECT ${userSelectColumns} FROM users WHERE id = $1 LIMIT 1`, [req.user.id]);
  const user = rows[0];

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user: sanitizeUser(user) });
}
