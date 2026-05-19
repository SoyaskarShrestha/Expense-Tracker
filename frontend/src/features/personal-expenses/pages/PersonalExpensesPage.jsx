import React, { useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Plus, Trash2, Edit, Filter, Bell, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

const categories = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Other',
];

const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Digital Wallet'];
const recurrenceOptions = [
  { value: 'none', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function parseDate(dateString) {
  return new Date(`${dateString}T12:00:00`);
}

function formatDate(dateString) {
  return parseDate(dateString).toLocaleDateString();
}

function addRecurrence(date, recurrence) {
  const next = new Date(date);

  if (recurrence === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (recurrence === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else if (recurrence === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  }

  return next;
}

function getNextDueDate(expense) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dueDate = parseDate(expense.date);
  dueDate.setHours(0, 0, 0, 0);

  if (expense.recurrence === 'none') {
    return dueDate >= today ? dueDate : null;
  }

  while (dueDate < today) {
    dueDate = addRecurrence(dueDate, expense.recurrence);
  }

  return dueDate;
}

function getReminderSchedule(expense) {
  if (!expense.reminderEnabled) {
    return null;
  }

  const dueDate = getNextDueDate(expense);
  if (!dueDate) {
    return null;
  }

  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - expense.reminderDaysBefore);

  return { dueDate, reminderDate };
}

function recurrenceLabel(recurrence) {
  return recurrenceOptions.find((option) => option.value === recurrence)?.label || 'One-time';
}

export function PersonalExpensesPage() {
  const { personalExpenses, addPersonalExpense, updatePersonalExpense, deletePersonalExpense } = useApp();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    recurrence: 'none',
    reminderEnabled: false,
    reminderDaysBefore: '3',
  });

  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      recurrence: 'none',
      reminderEnabled: false,
      reminderDaysBefore: '3',
    });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.category || !formData.amount || !formData.description || !formData.paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.reminderEnabled && (!formData.reminderDaysBefore || Number(formData.reminderDaysBefore) <= 0)) {
      toast.error('Reminder lead time must be greater than 0');
      return;
    }

    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
      reminderEnabled: formData.reminderEnabled,
      reminderDaysBefore: formData.reminderEnabled ? Number(formData.reminderDaysBefore) : 0,
    };

    try {
      if (editingId) {
        await updatePersonalExpense(editingId, payload);
        toast.success('Expense updated successfully');
      } else {
        await addPersonalExpense(payload);
        toast.success('Expense added successfully');
      }

      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error?.message || 'Failed to save expense');
    }
  };

  const handleEdit = (expense) => {
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      recurrence: expense.recurrence || 'none',
      reminderEnabled: Boolean(expense.reminderEnabled),
      reminderDaysBefore: String(expense.reminderDaysBefore ?? 3),
    });
    setEditingId(expense.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await deletePersonalExpense(id);
      toast.success('Expense deleted successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete expense');
    }
  };

  const filteredExpenses =
    filterCategory === 'all'
      ? personalExpenses
      : personalExpenses.filter((expense) => expense.category === filterCategory);

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const recurringExpenses = personalExpenses.filter((expense) => expense.recurrence && expense.recurrence !== 'none');

  const reminderItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + 30);

    return personalExpenses
      .map((expense) => {
        const schedule = getReminderSchedule(expense);
        if (!schedule) return null;

        return {
          expense,
          dueDate: schedule.dueDate,
          reminderDate: schedule.reminderDate,
        };
      })
      .filter((item) => item && item.dueDate <= rangeEnd)
      .sort((left, right) => left.reminderDate - right.reminderDate);
  }, [personalExpenses]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Personal Expenses</h1>
          <p className="text-muted-foreground mt-1">Track current spending, recurring charges, and reminder schedule</p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Update your expense details and schedule' : 'Enter the expense and optional schedule details'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    type="text"
                    placeholder="What did you spend on?"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence">Recurrence</Label>
                    <Select
                      value={formData.recurrence}
                      onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select recurrence" />
                      </SelectTrigger>
                      <SelectContent>
                        {recurrenceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminderDaysBefore">Reminder Lead Time</Label>
                    <Input
                      id="reminderDaysBefore"
                      type="number"
                      min="0"
                      max="30"
                      value={formData.reminderDaysBefore}
                      onChange={(event) => setFormData({ ...formData, reminderDaysBefore: event.target.value })}
                      disabled={!formData.reminderEnabled}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Scheduled reminder</p>
                    <p className="text-xs text-muted-foreground">
                      Show this expense in your reminder queue before it is due
                    </p>
                  </div>
                  <Switch
                    checked={formData.reminderEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        reminderEnabled: checked,
                        reminderDaysBefore: checked ? formData.reminderDaysBefore || '3' : '0',
                      })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit">{editingId ? 'Update' : 'Add'} Expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Expense List</CardTitle>
            <CardDescription>Current total for the filtered view</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring Expenses</CardTitle>
            <CardDescription>Expenses with an active repeat cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recurringExpenses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {recurringExpenses.filter((expense) => expense.recurrence === 'monthly').length} monthly,{' '}
              {recurringExpenses.filter((expense) => expense.recurrence === 'weekly').length} weekly
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Reminders</CardTitle>
            <CardDescription>Reminders due in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reminderItems.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {reminderItems.length > 0 ? 'Active reminder queue is ready' : 'No reminders scheduled'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reminders</CardTitle>
          <CardDescription>Planned reminders for recurring or future-dated expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {reminderItems.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No scheduled reminders in the next 30 days.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reminderItems.map(({ expense, dueDate, reminderDate }) => (
                <div key={expense.id} className="rounded-md border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">{expense.category}</p>
                    </div>
                    <Badge variant="outline">${expense.amount.toFixed(2)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <Repeat className="w-3 h-3 mr-1" />
                      {recurrenceLabel(expense.recurrence)}
                    </Badge>
                    <Badge variant="outline">
                      <Bell className="w-3 h-3 mr-1" />
                      {expense.reminderDaysBefore} day{expense.reminderDaysBefore !== 1 ? 's' : ''} before
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>Reminder: {reminderDate.toLocaleDateString()}</div>
                    <div>Due: {dueDate.toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Expense Register</CardTitle>
              <CardDescription>View and manage all your expenses</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No expenses found. Add your first expense to get started!
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={expense.recurrence === 'none' ? 'outline' : 'secondary'}>
                            {recurrenceLabel(expense.recurrence)}
                          </Badge>
                          {expense.reminderEnabled && (
                            <div className="text-xs text-muted-foreground">
                              reminder {expense.reminderDaysBefore} day{expense.reminderDaysBefore !== 1 ? 's' : ''} before
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{expense.paymentMethod}</TableCell>
                      <TableCell className="text-right font-bold">${expense.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
