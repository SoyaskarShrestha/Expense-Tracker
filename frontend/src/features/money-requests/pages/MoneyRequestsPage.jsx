import React, { useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Plus, Check, X, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';

function RequestTable({ requests, onApprove, onReject, getOrganizationName, canModerate }) {
  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No requests found
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.employeeName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{getOrganizationName(request.organizationId)}</Badge>
                </TableCell>
                <TableCell className="font-bold">${Number(request.amount || 0).toFixed(2)}</TableCell>
                <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(request.requestedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge
                      variant={
                        request.status === 'approved'
                          ? 'default'
                          : request.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {request.status}
                    </Badge>
                    {request.responseNote && (
                      <p className="max-w-[180px] text-xs text-muted-foreground whitespace-normal">
                        {request.responseNote}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {canModerate && request.status === 'pending' ? (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onApprove(request)}>
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onReject(request)}>
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    request.respondedAt && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>{new Date(request.respondedAt).toLocaleDateString()}</div>
                        {request.respondedByName && <div>by {request.respondedByName}</div>}
                      </div>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function MoneyRequestsPage() {
  const {
    moneyRequests,
    employees,
    organizations,
    createMoneyRequest,
    updateRequestStatus,
    isAdmin,
    isOrgHead,
    isEmployee,
    currentEmployee,
    currentUser,
    canManageOrg,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [reviewDialog, setReviewDialog] = useState({ open: false, request: null, status: 'approved' });
  const [reviewNote, setReviewNote] = useState('');
  const [formData, setFormData] = useState({
    organizationId: '',
    employeeId: '',
    amount: '',
    reason: '',
  });

  const resetForm = () => {
    setFormData({
      organizationId: '',
      employeeId: '',
      amount: '',
      reason: '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.organizationId || !formData.amount || !formData.reason) {
      toast.error('Please fill in all fields');
      return;
    }

    const selectedEmployeeId = isEmployee ? currentEmployee?.id : formData.employeeId;
    if (!selectedEmployeeId) {
      toast.error('Employee profile not found for this account');
      return;
    }

    try {
      await createMoneyRequest({
        organizationId: formData.organizationId,
        employeeId: selectedEmployeeId,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
      });

      toast.success('Money request submitted successfully');
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error?.message || 'Failed to submit request');
    }
  };

  const handleApprove = async (id) => {
    setReviewNote('');
    setReviewDialog({ open: true, request: id, status: 'approved' });
  };

  const handleReject = async (id) => {
    setReviewNote('');
    setReviewDialog({ open: true, request: id, status: 'rejected' });
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (reviewDialog.status === 'rejected' && !reviewNote.trim()) {
      toast.error('A rejection note is required');
      return;
    }

    try {
      await updateRequestStatus(
        reviewDialog.request.id,
        reviewDialog.status,
        reviewNote.trim() || undefined
      );
      toast.success(reviewDialog.status === 'approved' ? 'Request approved' : 'Request rejected');
      setReviewDialog({ open: false, request: null, status: 'approved' });
      setReviewNote('');
    } catch (error) {
      toast.error(error?.message || 'Failed to update request');
    }
  };

  const getOrganizationName = (organizationId) =>
    organizations.find((organization) => organization.id === organizationId)?.name || 'Unknown';

  const filteredEmployees = useMemo(
    () =>
      formData.organizationId
        ? employees.filter((employee) => employee.organizationId === formData.organizationId)
        : [],
    [employees, formData.organizationId]
  );

  const organizationOptions = useMemo(() => {
    if (isAdmin) {
      return organizations;
    }

    if (isOrgHead) {
      return organizations.filter((organization) => organization.headId === currentUser?.id);
    }

    const employeeOrgIds = new Set(
      employees
        .filter((employee) => employee.email?.toLowerCase() === currentEmployee?.email?.toLowerCase())
        .map((employee) => employee.organizationId)
    );
    return organizations.filter((organization) => employeeOrgIds.has(organization.id));
  }, [isAdmin, isOrgHead, organizations, employees, currentEmployee, currentUser]);

  const pendingRequests = useMemo(
    () => moneyRequests.filter((request) => request.status === 'pending'),
    [moneyRequests]
  );
  const approvedRequests = useMemo(
    () => moneyRequests.filter((request) => request.status === 'approved'),
    [moneyRequests]
  );
  const rejectedRequests = useMemo(
    () => moneyRequests.filter((request) => request.status === 'rejected'),
    [moneyRequests]
  );

  const totalPending = useMemo(
    () => pendingRequests.reduce((sum, request) => sum + Number(request.amount || 0), 0),
    [pendingRequests]
  );
  const totalApproved = useMemo(
    () => approvedRequests.reduce((sum, request) => sum + Number(request.amount || 0), 0),
    [approvedRequests]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Money Requests</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Review and manage all money requests'
              : isOrgHead
                ? 'Review and manage requests for your organizations'
                : 'Track your own work fund requests'}
          </p>
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
              New Request
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Money Request</DialogTitle>
              <DialogDescription>Submit a request for funds from your organization</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Select
                    value={formData.organizationId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, organizationId: value, employeeId: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationOptions.map((organization) => (
                        <SelectItem key={organization.id} value={organization.id}>
                          {organization.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!isEmployee && (
                  <div className="space-y-2">
                    <Label htmlFor="employee">Employee</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                      disabled={!formData.organizationId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain why you need these funds"
                    value={formData.reason}
                    onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
                    required
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit">Submit Request</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={reviewDialog.open}
          onOpenChange={(isOpen) => {
            setReviewDialog((current) => ({ ...current, open: isOpen, request: isOpen ? current.request : null }));
            if (!isOpen) {
              setReviewNote('');
            }
          }}
        >
              <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewDialog.status === 'approved' ? 'Approve Request' : 'Reject Request'}
              </DialogTitle>
              <DialogDescription>
                {reviewDialog.request
                  ? `${reviewDialog.request.employeeName} · ${getOrganizationName(reviewDialog.request.organizationId)} · $${Number(
                      reviewDialog.request.amount || 0
                    ).toFixed(2)}`
                  : 'Review this money request'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleReviewSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="review-note">
                    {reviewDialog.status === 'rejected' ? 'Rejection Note' : 'Approval Note'}
                  </Label>
                  <Textarea
                    id="review-note"
                    placeholder={
                      reviewDialog.status === 'rejected'
                        ? 'Explain why this request is being rejected'
                        : 'Optional approval context'
                    }
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" variant={reviewDialog.status === 'approved' ? 'default' : 'destructive'}>
                  {reviewDialog.status === 'approved' ? 'Approve Request' : 'Reject Request'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">${totalPending.toFixed(2)} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequests.length}</div>
            <p className="text-xs text-muted-foreground">${totalApproved.toFixed(2)} disbursed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedRequests.length}</div>
            <p className="text-xs text-muted-foreground">Declined requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moneyRequests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>View and manage money requests by status</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">
                Pending
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              <RequestTable
                requests={pendingRequests}
                onApprove={handleApprove}
                onReject={handleReject}
                getOrganizationName={getOrganizationName}
                canModerate={canManageOrg}
              />
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              <RequestTable
                requests={approvedRequests}
                onApprove={handleApprove}
                onReject={handleReject}
                getOrganizationName={getOrganizationName}
                canModerate={canManageOrg}
              />
            </TabsContent>

            <TabsContent value="rejected" className="mt-4">
              <RequestTable
                requests={rejectedRequests}
                onApprove={handleApprove}
                onReject={handleReject}
                getOrganizationName={getOrganizationName}
                canModerate={canManageOrg}
              />
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <RequestTable
                requests={moneyRequests}
                onApprove={handleApprove}
                onReject={handleReject}
                getOrganizationName={getOrganizationName}
                canModerate={canManageOrg}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
