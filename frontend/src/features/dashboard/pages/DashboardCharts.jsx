import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

function EmptyChart({ message }) {
  return <div className="h-[300px] flex items-center justify-center text-muted-foreground">{message}</div>;
}

export function DashboardCharts({ isPersonal, categoryData, expensesByDate, hasExpenseData, personalExpenses, requestsByStatus, moneyRequests, employees }) {
  if (isPersonal) {
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Distribution of your spending</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No expense data available" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Expenses</CardTitle>
              <CardDescription>Last 7 days spending trend</CardDescription>
            </CardHeader>
            <CardContent>
              {hasExpenseData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={expensesByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No expense data available" />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Your latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {personalExpenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {expense.category} • {expense.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(expense.amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request Status</CardTitle>
            <CardDescription>Money request distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {requestsByStatus.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={requestsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {requestsByStatus.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No request data available" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Amounts</CardTitle>
            <CardDescription>Top recent requests</CardDescription>
          </CardHeader>
          <CardContent>
            {moneyRequests.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={moneyRequests.slice(0, 5).map((request) => ({
                    name: (request.employeeName || '').split(' ')[0],
                    amount: Number(request.amount || 0),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No request data available" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Money Requests</CardTitle>
          <CardDescription>Latest employee requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {moneyRequests.slice(0, 5).map((request) => (
              <div key={request.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{request.employeeName}</p>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-bold">${Number(request.amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      request.status === 'approved'
                        ? 'bg-primary text-primary-foreground'
                        : request.status === 'pending'
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-destructive text-destructive-foreground'
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}