import React, { lazy, Suspense, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
} from 'lucide-react';

const DashboardCharts = lazy(() =>
  import('./DashboardCharts').then((module) => ({ default: module.DashboardCharts }))
);

export function DashboardPage() {
  const {
    viewMode,
    personalExpenses,
    employees,
    moneyRequests,
    organizations,
    currentEmployee,
    currentUser,
    isEmployee,
    isOrgHead,
  } = useApp();

  const totalPersonalExpense = useMemo(
    () => personalExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [personalExpenses]
  );

  const expensesByCategory = useMemo(
    () =>
      personalExpenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {}),
    [personalExpenses]
  );

  const categoryData = useMemo(
    () =>
      Object.entries(expensesByCategory)
        .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
        .filter((item) => item.value > 0),
    [expensesByCategory]
  );

  const expensesByDate = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map((date) => {
      const total = personalExpenses
        .filter((expense) => expense.date === date)
        .reduce((sum, expense) => sum + expense.amount, 0);

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: Number(total.toFixed(2)),
      };
    });
  }, [personalExpenses]);

  const hasExpenseData = expensesByDate.some((item) => item.amount > 0);

  const pendingRequests = useMemo(
    () => moneyRequests.filter((request) => request.status === 'pending').length,
    [moneyRequests]
  );

  const approvedAmount = useMemo(
    () =>
      moneyRequests
        .filter((request) => request.status === 'approved')
        .reduce((sum, request) => sum + request.amount, 0),
    [moneyRequests]
  );

  const pendingAmount = useMemo(
    () =>
      moneyRequests
        .filter((request) => request.status === 'pending')
        .reduce((sum, request) => sum + request.amount, 0),
    [moneyRequests]
  );

  const requestsByStatus = useMemo(
    () => [
      { name: 'Approved', value: moneyRequests.filter((request) => request.status === 'approved').length },
      { name: 'Pending', value: moneyRequests.filter((request) => request.status === 'pending').length },
      { name: 'Rejected', value: moneyRequests.filter((request) => request.status === 'rejected').length },
    ],
    [moneyRequests]
  );

  const isPersonal = viewMode === 'personal';
  const currentOrganization = useMemo(() => {
    if (!currentEmployee) return null;
    return organizations.find((organization) => organization.id === currentEmployee.organizationId) || null;
  }, [organizations, currentEmployee]);

  const managedOrganizationsCount = useMemo(() => organizations.length, [organizations]);
  const managedEmployeesCount = useMemo(() => employees.length, [employees]);

  const totalRequestedAmount = useMemo(
    () => moneyRequests.reduce((sum, request) => sum + request.amount, 0),
    [moneyRequests]
  );

  const approvedRequestsCount = useMemo(
    () => moneyRequests.filter((request) => request.status === 'approved').length,
    [moneyRequests]
  );

  const pendingRequestsCount = useMemo(
    () => moneyRequests.filter((request) => request.status === 'pending').length,
    [moneyRequests]
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{isPersonal ? 'Personal' : 'Work'} expense overview</p>
      </div>

      {isPersonal ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPersonalExpense.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-500 inline-flex items-center">
                  <ArrowUpRight className="h-3 w-3" /> 12% from last month
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(expensesByCategory).length}</div>
              <p className="text-xs text-muted-foreground">Active spending categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{personalExpenses.length}</div>
              <p className="text-xs text-muted-foreground">Total expense entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Per Day</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalPersonalExpense / 7).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Last 7 days average</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {isEmployee && currentEmployee && (
            <Card>
              <CardHeader>
                <CardTitle>My Work Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="font-medium inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {currentOrganization?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium">{currentEmployee.role}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Requested</p>
                  <p className="font-medium">${totalRequestedAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requests</p>
                  <p className="font-medium">{approvedRequestsCount} approved / {pendingRequestsCount} pending</p>
                </div>
              </CardContent>
            </Card>
          )}

          {isOrgHead && currentUser && (
            <Card>
              <CardHeader>
                <CardTitle>Organization Head Scope</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Organizations</p>
                  <p className="font-medium">{managedOrganizationsCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="font-medium">{managedEmployeesCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Requests</p>
                  <p className="font-medium">{pendingRequests}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved Amount</p>
                  <p className="font-medium">${approvedAmount.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
              <p className="text-xs text-muted-foreground">Active team members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${approvedAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500 inline-flex items-center">
                  <ArrowDownRight className="h-3 w-3" /> Disbursed
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Under review</p>
            </CardContent>
          </Card>
          </div>
        </>
      )}

      <Suspense
        fallback={<div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading charts...</div>}
      >
        <DashboardCharts
          isPersonal={isPersonal}
          categoryData={categoryData}
          expensesByDate={expensesByDate}
          hasExpenseData={hasExpenseData}
          personalExpenses={personalExpenses}
          requestsByStatus={requestsByStatus}
          moneyRequests={moneyRequests}
          employees={employees}
        />
      </Suspense>
    </div>
  );
}
