import { nanoid } from 'nanoid';
import { expenseSelectColumns, query } from '../services/db.service.js';

export async function listExpenses(req, res) {
  const { rows: expenses } = await query(
    `SELECT ${expenseSelectColumns}
     FROM personal_expenses
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.user.id]
  );
  return res.json({ data: expenses });
}

export async function createExpense(req, res) {
  const { category, amount, description, date, paymentMethod, recurrence, reminderEnabled, reminderDaysBefore } = req.body;

  const parsedAmount = Number(amount);
  const { rows } = await query(
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
      reminder_days_before
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING ${expenseSelectColumns}`,
    [nanoid(), req.user.id, category, parsedAmount, description, date, paymentMethod, recurrence, reminderEnabled ? 1 : 0, reminderDaysBefore]
  );

  const newExpense = rows[0];

  return res.status(201).json({ data: newExpense });
}

export async function updateExpense(req, res) {
  const { id } = req.params;
  const { rows } = await query(
    `SELECT ${expenseSelectColumns}
     FROM personal_expenses
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [id, req.user.id]
  );

  const current = rows[0];

  if (!current) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  const updatedExpense = {
    category: req.body.category ?? current.category,
    amount: req.body.amount != null ? Number(req.body.amount) : current.amount,
    description: req.body.description ?? current.description,
    date: req.body.date ?? current.date,
    paymentMethod: req.body.paymentMethod ?? current.paymentMethod,
    recurrence: req.body.recurrence ?? current.recurrence,
    reminderEnabled: req.body.reminderEnabled ?? current.reminderEnabled,
    reminderDaysBefore: req.body.reminderDaysBefore ?? current.reminderDaysBefore,
  };

  const { rows: updatedRows } = await query(
    `UPDATE personal_expenses
     SET category = $1,
         amount = $2,
         description = $3,
         date = $4,
         payment_method = $5,
         recurrence = $6,
         reminder_enabled = $7,
         reminder_days_before = $8
     WHERE id = $9 AND user_id = $10
     RETURNING ${expenseSelectColumns}`,
    [
      updatedExpense.category,
      updatedExpense.amount,
      updatedExpense.description,
      updatedExpense.date,
      updatedExpense.paymentMethod,
      updatedExpense.recurrence,
      updatedExpense.reminderEnabled ? 1 : 0,
      updatedExpense.reminderDaysBefore,
      id,
      req.user.id,
    ]
  );

  return res.json({ data: updatedRows[0] });
}

export async function deleteExpense(req, res) {
  const { id } = req.params;
  const result = await query(
    `DELETE FROM personal_expenses
     WHERE id = $1 AND user_id = $2`,
    [id, req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  return res.status(204).send();
}
