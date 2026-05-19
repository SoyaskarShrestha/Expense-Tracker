import { moneyRequestSelectColumns, query, sanitizeUser, userSelectColumns } from '../services/db.service.js';

function isAdmin(user) {
  return user?.role === 'admin';
}

export async function getAdminPanelData(req, res) {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: 'Only admin users can access the admin panel' });
  }

  const [usersResult, expensesResult, organizationsResult, requestsResult] = await Promise.all([
    query(
      `SELECT ${userSelectColumns}
       FROM users
       ORDER BY created_at DESC`
    ),
    query(
      `SELECT pe.id,
              pe.user_id AS "userId",
              pe.category,
              pe.amount,
              pe.description,
              pe.date,
              pe.payment_method AS "paymentMethod",
              pe.recurrence,
              pe.reminder_enabled AS "reminderEnabled",
              pe.reminder_days_before AS "reminderDaysBefore",
              pe.created_at AS "createdAt",
              u.name AS "userName",
              u.email AS "userEmail"
       FROM personal_expenses pe
       INNER JOIN users u ON u.id = pe.user_id
       ORDER BY pe.created_at DESC`
    ),
    query(
      `SELECT o.id,
              o.name,
              o.description,
              o.head_id AS "headId",
              o.created_at AS "createdAt",
              u.name AS "headName",
              u.email AS "headEmail"
       FROM organizations o
       INNER JOIN users u ON u.id = o.head_id
       ORDER BY o.created_at DESC`
    ),
    query(
      `SELECT ${moneyRequestSelectColumns('mr')},
              o.name AS "organizationName"
       FROM money_requests mr
       INNER JOIN organizations o ON o.id = mr.organization_id
       ORDER BY mr.created_at DESC`
    ),
  ]);

  return res.json({
    data: {
      users: usersResult.rows.map((user) => sanitizeUser(user)),
      expenses: expensesResult.rows,
      organizations: organizationsResult.rows,
      requests: requestsResult.rows,
    },
  });
}
