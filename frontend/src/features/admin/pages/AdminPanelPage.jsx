import React, { useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Users, Wallet, Building2, FileText } from 'lucide-react';

function matchesSearch(value, query) {
  if (!query) return true;
  return String(value || '').toLowerCase().includes(query.toLowerCase());
}

export function AdminPanelPage() {
  const { isAdmin, adminPanelData } = useApp();
  const [search, setSearch] = useState('');

  const users = useMemo(
    () =>
      adminPanelData.users.filter(
        (user) =>
          matchesSearch(user.name, search) ||
          matchesSearch(user.email, search) ||
          matchesSearch(user.role, search)
      ),
    [adminPanelData.users, search]
  );

  const expenses = useMemo(
    () =>
      adminPanelData.expenses.filter(
        (expense) =>
          matchesSearch(expense.userName, search) ||
          matchesSearch(expense.userEmail, search) ||
          matchesSearch(expense.category, search) ||
          matchesSearch(expense.description, search)
      ),
    [adminPanelData.expenses, search]
  );

  const organizations = useMemo(
    () =>
      adminPanelData.organizations.filter(
        (organization) =>
          matchesSearch(organization.name, search) ||
          matchesSearch(organization.description, search) ||
          matchesSearch(organization.headName, search) ||
          matchesSearch(organization.headEmail, search)
      ),
    [adminPanelData.organizations, search]
  );

  const requests = useMemo(
    () =>
      adminPanelData.requests.filter(
        (request) =>
          matchesSearch(request.employeeName, search) ||
          matchesSearch(request.organizationName, search) ||
          matchesSearch(request.status, search) ||
          matchesSearch(request.reason, search)
      ),
    [adminPanelData.requests, search]
  );

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Admin access is required for this panel.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">Browse users, expenses, requests, and organizations from one place</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{adminPanelData.users.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{adminPanelData.expenses.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{adminPanelData.organizations.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{adminPanelData.requests.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Browse</CardTitle>
          <CardDescription>Use the global search to narrow the active dataset</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-search">Search</Label>
            <Input
              id="admin-search"
              placeholder="Search names, emails, orgs, categories, request reasons..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-4">
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="expenses" className="mt-4">
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{expense.userName}</div>
                            <div className="text-xs text-muted-foreground">{expense.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline">{expense.recurrence}</Badge>
                            {Boolean(expense.reminderEnabled) && (
                              <div className="text-xs text-muted-foreground">
                                reminder {expense.reminderDaysBefore} day{expense.reminderDaysBefore !== 1 ? 's' : ''} before
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">${expense.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed By</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.employeeName}</TableCell>
                        <TableCell>{request.organizationName}</TableCell>
                        <TableCell>{request.reason}</TableCell>
                        <TableCell><Badge variant="outline">{request.status}</Badge></TableCell>
                        <TableCell>{request.respondedByName || 'Unreviewed'}</TableCell>
                        <TableCell className="text-right font-medium">${request.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="organizations" className="mt-4">
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Head</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((organization) => (
                      <TableRow key={organization.id}>
                        <TableCell className="font-medium">{organization.name}</TableCell>
                        <TableCell>{organization.description}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{organization.headName}</div>
                            <div className="text-xs text-muted-foreground">{organization.headEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(organization.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
