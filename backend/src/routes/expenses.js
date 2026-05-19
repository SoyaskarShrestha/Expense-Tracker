import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { createExpense, deleteExpense, listExpenses, updateExpense } from '../controllers/expense.controller.js';
import { validate } from '../middleware/validate.js';
import { createExpenseSchema, expenseIdSchema, updateExpenseSchema } from '../validation/expense.schemas.js';

const router = express.Router();

router.get('/', authRequired, listExpenses);
router.post('/', authRequired, validate(createExpenseSchema), createExpense);
router.patch('/:id', authRequired, validate(updateExpenseSchema), updateExpense);
router.delete('/:id', authRequired, validate(expenseIdSchema), deleteExpense);

export default router;
