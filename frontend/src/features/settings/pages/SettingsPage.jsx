import React, { useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';
import { Switch } from '../../../components/ui/switch';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { User, Bell, Shield, Database, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../../components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../../../components/ui/alert-dialog';

export function SettingsPage() {
    const { currentUser, isAdmin, users, updateUserRole } = useApp();
    const isAdminPanelReadOnly = import.meta.env.VITE_ADMIN_PANEL_READ_ONLY === 'true';
    const [profileData, setProfileData] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
    });
    const [roleDrafts, setRoleDrafts] = useState({});
    const [updatingUserId, setUpdatingUserId] = useState('');

    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        requestAlerts: true,
        weeklyReport: false,
        monthlyReport: true,
    });

    const initials = useMemo(() => {
        const name = currentUser?.name || 'User';
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }, [currentUser?.name]);

    const storageUsedKb = useMemo(() => (JSON.stringify(localStorage).length / 1024).toFixed(2), []);

    const handleProfileSave = () => {
        toast.success('Profile updated successfully');
    };

    const handleClearData = () => {
        localStorage.clear();
        toast.success('All data cleared');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    };

    const getDraftRole = (user) => roleDrafts[user.id] || user.role;

    const handleRoleSave = async (user) => {
        if (isAdminPanelReadOnly) {
            toast.error('Admin role management is in read-only mode');
            return;
        }

        const nextRole = getDraftRole(user);
        if (nextRole === user.role) {
            return;
        }

        try {
            setUpdatingUserId(user.id);
            await updateUserRole(user.id, nextRole);
            toast.success(`Updated ${user.name} to ${nextRole}`);
        } catch (error) {
            toast.error(error?.message || 'Failed to update role');
        } finally {
            setUpdatingUserId('');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <User className="w-5 h-5" />
                        <div>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Update your personal details</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="w-20 h-20">
                            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium">{currentUser?.name}</h3>
                            <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                            <Button variant="outline" size="sm" className="mt-2">
                                Change Avatar
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={profileData.name}
                                onChange={(event) => setProfileData({ ...profileData, name: event.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={profileData.email}
                                onChange={(event) => setProfileData({ ...profileData, email: event.target.value })}
                            />
                        </div>
                    </div>

                    <Button onClick={handleProfileSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </Button>
                </CardContent>
            </Card>

            {isAdmin && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Shield className="w-5 h-5" />
                            <div>
                                <CardTitle>Role Assignment</CardTitle>
                                <CardDescription>
                                    {isAdminPanelReadOnly
                                        ? 'Read-only mode: role changes are disabled'
                                        : 'Promote or demote user account roles'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Current Role</TableHead>
                                        <TableHead>New Role</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{user.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={getDraftRole(user)}
                                                    onValueChange={(value) =>
                                                        setRoleDrafts((previous) => ({ ...previous, [user.id]: value }))
                                                    }
                                                    disabled={isAdminPanelReadOnly || user.id === currentUser?.id}
                                                >
                                                    <SelectTrigger className="w-[150px]">
                                                        <SelectValue placeholder="Select role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">user</SelectItem>
                                                        <SelectItem value="employee">employee</SelectItem>
                                                        <SelectItem value="organization_head">organization_head</SelectItem>
                                                        <SelectItem value="admin">admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRoleSave(user)}
                                                    disabled={
                                                        isAdminPanelReadOnly ||
                                                        user.id === currentUser?.id ||
                                                        getDraftRole(user) === user.role ||
                                                        updatingUserId === user.id
                                                    }
                                                >
                                                    {updatingUserId === user.id ? 'Saving...' : 'Save'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Bell className="w-5 h-5" />
                        <div>
                            <CardTitle>Notifications</CardTitle>
                            <CardDescription>Manage how you receive updates</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
                        </div>
                        <Switch
                            checked={notifications.emailNotifications}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Request Alerts</Label>
                            <p className="text-sm text-muted-foreground">Get notified about money request updates</p>
                        </div>
                        <Switch
                            checked={notifications.requestAlerts}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, requestAlerts: checked })}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Weekly Reports</Label>
                            <p className="text-sm text-muted-foreground">Receive weekly expense summaries</p>
                        </div>
                        <Switch
                            checked={notifications.weeklyReport}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Monthly Reports</Label>
                            <p className="text-sm text-muted-foreground">Receive monthly expense analytics</p>
                        </div>
                        <Switch
                            checked={notifications.monthlyReport}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, monthlyReport: checked })}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Shield className="w-5 h-5" />
                        <div>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>Manage your password and security settings</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input id="current-password" type="password" placeholder="********" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" placeholder="********" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input id="confirm-password" type="password" placeholder="********" />
                    </div>

                    <Button onClick={() => toast.success('Password updated successfully')}>Update Password</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Database className="w-5 h-5" />
                        <div>
                            <CardTitle>Data Management</CardTitle>
                            <CardDescription>Manage your application data</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900 p-4">
                        <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">Export Your Data</h4>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                            Download all your expense data in JSON format
                        </p>
                        <Button variant="outline" onClick={() => toast.success('Data exported successfully')}>
                            Export Data
                        </Button>
                    </div>

                    <Separator />

                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 p-4">
                        <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">Clear All Data</h4>
                        <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                            Permanently delete all your expenses, organizations, and requests. This action cannot be undone.
                        </p>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Clear All Data
                                </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete all your data including expenses, organizations, employees,
                                        and money requests. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearData}>Yes, delete everything</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>About</CardTitle>
                    <CardDescription>Application information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-medium">1.0.0</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span className="font-medium">April 17, 2026</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Storage Used</span>
                        <span className="font-medium">{storageUsedKb} KB</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
