import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Plus, Building2, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export function OrganizationsPage() {
  const {
    organizations,
    employees,
    moneyRequests,
    users,
    createOrganization,
    currentUser,
    isAdmin,
    isOrgHead,
    canManageOrg,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    headId: currentUser?.id || '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      headId: currentUser?.id || '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name || !formData.description) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await createOrganization(formData);
      toast.success('Organization created successfully');
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error?.message || 'Failed to create organization');
    }
  };

  const getEmployeeCount = (organizationId) =>
    employees.filter((employee) => employee.organizationId === organizationId).length;

  const pendingRequestCount = moneyRequests.filter((request) => request.status === 'pending').length;
  const connectedOrganizationIds = new Set(
    employees
      .filter((employee) => employee.email?.toLowerCase() === currentUser?.email?.toLowerCase())
      .map((employee) => employee.organizationId)
  );
  const employeeConnectionsCount = connectedOrganizationIds.size;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Manage all organizations and assign ownership'
              : isOrgHead
                ? 'Manage the organizations in your workspace'
                : 'Organizations you belong to'}
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
                {isOrgHead ? 'Create Workspace Organization' : 'Create Organization'}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
                <DialogDescription>
                  Set up a new organization or project to track business expenses
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g., Tech Startup Inc."
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of your organization"
                      value={formData.description}
                      onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                      required
                      rows={3}
                    />
                  </div>

                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="headId">Organization Head</Label>
                      <Select
                        value={formData.headId}
                        onValueChange={(value) => setFormData({ ...formData, headId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select head" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((user) => user.role === 'organization_head' || user.role === 'admin')
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} - {user.role}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button type="submit">Create Organization</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(isOrgHead || !canManageOrg) && (
        <Card>
          <CardHeader>
            <CardTitle>{canManageOrg ? 'My Workspace' : 'My Organization Access'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {canManageOrg ? 'Organizations' : 'Connected Organizations'}
              </p>
              <p className="text-2xl font-semibold">
                {canManageOrg ? organizations.length : employeeConnectionsCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {canManageOrg ? 'Team Members' : 'Employee Profiles'}
              </p>
              <p className="text-2xl font-semibold">{employees.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-semibold">{pendingRequestCount}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Organizations Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isOrgHead
                ? 'Create your first workspace organization to start tracking business expenses'
                : !canManageOrg
                  ? 'You are not connected to any organizations yet'
                : 'Create your first organization to start tracking business expenses'}
            </p>
            {canManageOrg && (
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {isOrgHead ? 'Create Workspace Organization' : 'Create Organization'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <Card key={organization.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{organization.name}</CardTitle>
                      {organization.headId === currentUser?.id && (
                        <Badge variant="secondary" className="mt-1">
                          {isOrgHead ? 'Workspace Owner' : 'Owner'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{organization.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {getEmployeeCount(organization.id)} employee{getEmployeeCount(organization.id) !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Created {new Date(organization.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
