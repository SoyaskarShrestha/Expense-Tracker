import React, { useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

function buildDateRange(timeRange) {
  const now = new Date();
  const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { startDate, endDate: now, days };
}

export function ReportsPage() {
  const { viewMode, personalExpenses, moneyRequests, employees, organizations } = useApp();
  const [timeRange, setTimeRange] = useState('7days');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  const { startDate, endDate, days } = useMemo(() => buildDateRange(timeRange), [timeRange]);
  const startDateInput = useMemo(() => startDate.toISOString().split('T')[0], [startDate]);
  const endDateInput = useMemo(() => endDate.toISOString().split('T')[0], [endDate]);

  const personalCategoryOptions = useMemo(
    () => ['all', ...new Set(personalExpenses.map((expense) => expense.category))],
    [personalExpenses]
  );

  const filteredMoneyRequests = useMemo(
    () =>
      moneyRequests.filter((request) => {
        const requestDate = new Date(request.requestedAt);
        const inDateRange = requestDate >= startDate && requestDate <= endDate;
        const matchesOrganization =
          organizationFilter === 'all' || request.organizationId === organizationFilter;
        const matchesEmployee = employeeFilter === 'all' || request.employeeId === employeeFilter;
        return inDateRange && matchesOrganization && matchesEmployee;
      }),
    [moneyRequests, startDate, endDate, organizationFilter, employeeFilter]
  );

  const filteredPersonalExpenses = useMemo(
    () =>
      personalExpenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        const matchesDate = expenseDate >= startDate && expenseDate <= endDate;
        const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
        return matchesDate && matchesCategory;
      }),
    [personalExpenses, startDate, endDate, categoryFilter]
  );

  const totalPersonalSpent = useMemo(
    () => filteredPersonalExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredPersonalExpenses]
  );

  const avgDailySpend = totalPersonalSpent / days;

  const categoryData = useMemo(() => {
    const totals = filteredPersonalExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredPersonalExpenses]);

  const paymentData = useMemo(() => {
    const totals = filteredPersonalExpenses.reduce((acc, expense) => {
      acc[expense.paymentMethod] = (acc[expense.paymentMethod] || 0) + expense.amount;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .filter((item) => item.value > 0);
  }, [filteredPersonalExpenses]);

  const trendData = useMemo(
    () =>
      Array.from({ length: Math.min(days, 30) }, (_, index) => {
        const date = new Date(endDate.getTime() - (days - 1 - index) * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];

        const total = filteredPersonalExpenses
          .filter((expense) => expense.date === dateKey)
          .reduce((sum, expense) => sum + expense.amount, 0);

        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: Number(total.toFixed(2)),
        };
      }),
    [days, endDate, filteredPersonalExpenses]
  );

  const approvedAmount = useMemo(
    () =>
      moneyRequests
        .filter((request) => filteredMoneyRequests.some((item) => item.id === request.id))
        .filter((request) => request.status === 'approved')
        .reduce((sum, request) => sum + request.amount, 0),
    [filteredMoneyRequests, moneyRequests]
  );

  const pendingAmount = useMemo(
    () =>
      moneyRequests
        .filter((request) => filteredMoneyRequests.some((item) => item.id === request.id))
        .filter((request) => request.status === 'pending')
        .reduce((sum, request) => sum + request.amount, 0),
    [filteredMoneyRequests, moneyRequests]
  );

  const totalRequested = useMemo(
    () => filteredMoneyRequests.reduce((sum, request) => sum + request.amount, 0),
    [filteredMoneyRequests]
  );

  const requestsByEmployee = useMemo(
    () =>
      employees
        .map((employee) => {
          const employeeRequests = moneyRequests.filter((request) => request.employeeId === employee.id);
          const filteredEmployeeRequests = employeeRequests.filter((request) =>
            filteredMoneyRequests.some((item) => item.id === request.id)
          );
          const total = filteredEmployeeRequests.reduce((sum, request) => sum + request.amount, 0);

          return {
            name: employee.name.split(' ')[0],
            amount: Number(total.toFixed(2)),
            requests: filteredEmployeeRequests.length,
          };
        })
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [employees, filteredMoneyRequests, moneyRequests]
  );

  const statusData = useMemo(
    () => [
      {
        name: 'Approved',
        value: filteredMoneyRequests.filter((request) => request.status === 'approved').length,
        amount: approvedAmount,
      },
      {
        name: 'Pending',
        value: filteredMoneyRequests.filter((request) => request.status === 'pending').length,
        amount: pendingAmount,
      },
      {
        name: 'Rejected',
        value: filteredMoneyRequests.filter((request) => request.status === 'rejected').length,
        amount: 0,
      },
    ],
    [filteredMoneyRequests, approvedAmount, pendingAmount]
  );

  const handleExport = () => {
    toast.success('Report exported successfully');
  };

  const isPersonal = viewMode === 'personal';
  const organizationOptions = useMemo(
    () => ['all', ...organizations.map((organization) => organization.id)],
    [organizations]
  );
  const employeeOptions = useMemo(() => {
    if (organizationFilter === 'all') {
      return employees;
    }
    return employees.filter((employee) => employee.organizationId === organizationFilter);
  }, [employees, organizationFilter]);
  const getOrganizationName = (organizationId) =>
    organizations.find((organization) => organization.id === organizationId)?.name || 'Unknown';

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports &amp; Analytics</h1>
          <p className="text-muted-foreground mt-1">
            {isPersonal ? 'Personal' : 'Work'} expense insights and trends
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            {isPersonal
              ? 'Refine personal reports by date window and category'
              : 'Refine work reports by date window, organization, and employee'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Date From</Label>
            <Input value={startDateInput} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Date To</Label>
            <Input value={endDateInput} readOnly />
          </div>
          {isPersonal ? (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  {personalCategoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={organizationFilter}
                  onValueChange={(value) => {
                    setOrganizationFilter(value);
                    setEmployeeFilter('all');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationOptions.map((organizationId) => (
                      <SelectItem key={organizationId} value={organizationId}>
                        {organizationId === 'all' ? 'All Organizations' : getOrganizationName(organizationId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employeeOptions.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isPersonal ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalPersonalSpent.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-red-500" />
                  <span className="text-red-500">+8.2%</span> from previous period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Daily Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${avgDailySpend.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Per day average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredPersonalExpenses.length}</div>
                <p className="text-xs text-muted-foreground mt-1">In selected time range</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {categoryData[0]?.name.split(' ')[0] || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${categoryData[0]?.value.toFixed(2) || '0.00'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spending Trend</CardTitle>
                <CardDescription>Daily expense tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Category distribution</CardDescription>
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
                        label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
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
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No expense data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>Highest spending areas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>How you pay</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRequested.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">All requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${approvedAmount.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3 text-green-500" />
                  Disbursed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">${pendingAmount.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredMoneyRequests.length > 0
                    ? ((filteredMoneyRequests.filter((request) => request.status === 'approved').length /
                        filteredMoneyRequests.length) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground mt-1">Success rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requests by Employee</CardTitle>
                <CardDescription>Top requesting employees</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={requestsByEmployee.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="amount" fill="#3b82f6" name="Amount ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Status Distribution</CardTitle>
                <CardDescription>Approval breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Employee Request Summary</CardTitle>
                <CardDescription>Detailed breakdown by employee</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={requestsByEmployee}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                    <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="amount" fill="#3b82f6" name="Amount ($)" />
                    <Bar yAxisId="right" dataKey="requests" fill="#8b5cf6" name="# Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
