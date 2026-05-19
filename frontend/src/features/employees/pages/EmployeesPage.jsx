import React, { useState } from 'react';
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
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Plus, Trash2, Users, Mail, Briefcase, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

export function EmployeesPage() {
  const {
    employees,
    organizations,
    addEmployee,
    removeEmployee,
    moneyRequests,
    currentUser,
    isAdmin,
    isOrgHead,
    canManageOrg,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    organizationId: '',
    name: '',
    email: '',
    role: '',
  });

  const resetForm = () => {
    setFormData({
      organizationId: '',
      name: '',
      email: '',
      role: '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.organizationId || !formData.name || !formData.email || !formData.role) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await addEmployee(formData);
      toast.success('Employee added successfully');
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error?.message || 'Failed to add employee');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
      await removeEmployee(id);
      toast.success('Employee removed successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove employee');
    }
  };

  const getOrganizationName = (organizationId) =>
    organizations.find((item) => item.id === organizationId)?.name || 'Unknown';

  const getEmployeeRequestCount = (employeeId) =>
    moneyRequests.filter((request) => request.employeeId === employeeId).length;

  const getInitials = (name) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Manage every employee across the system'
              : isOrgHead
                ? 'Manage employees in the organizations assigned to you'
                : 'Your employee profile and work summary'}
          </p>
        </div>

        {canManageOrg && (
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
                Add Employee
              </Button>
            </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>Add a team member to your organization</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Select
                    value={formData.organizationId}
                    onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {(isAdmin
                        ? organizations
                        : organizations.filter((organization) => organization.headId === currentUser?.id)
                      ).map((organization) => (
                        <SelectItem key={organization.id} value={organization.id}>
                          {organization.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    type="text"
                    placeholder="e.g., Developer, Designer"
                    value={formData.role}
                    onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit">Add Employee</Button>
              </DialogFooter>
            </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'All employees across the system'
              : isOrgHead
                ? 'Employees assigned to your organizations'
                : 'Your own profile only'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Employees Yet</h3>
              <p className="text-muted-foreground text-center mb-4">Add your first employee to get started</p>
              {canManageOrg && (
                <Button onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Requests</TableHead>
                    {canManageOrg && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getOrganizationName(employee.organizationId)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          {employee.role}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(employee.joinedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getEmployeeRequestCount(employee.id)} requests</Badge>
                      </TableCell>
                      {canManageOrg && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(employee.id, employee.name)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Across all organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {moneyRequests.filter((request) => request.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
            <p className="text-xs text-muted-foreground">Total groups</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
