import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import {
  LayoutDashboard,
  Wallet,
  Building2,
  Users,
  FileText,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';

export function AppLayout() {
  const { currentUser, logout, viewMode, setViewMode, moneyRequests, canManageOrg, canAccessWork, isAdmin } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pendingRequests = moneyRequests.filter((r) => r.status === 'pending').length;

  const navigation = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    {
      name: 'Personal Expenses',
      path: '/personal-expenses',
      icon: Wallet,
      show: viewMode === 'personal',
    },
    {
      name: 'Organizations',
      path: '/organizations',
      icon: Building2,
      show: viewMode === 'work' && canAccessWork,
    },
    {
      name: 'Employees',
      path: '/employees',
      icon: Users,
      show: viewMode === 'work' && canManageOrg,
    },
    {
      name: 'Money Requests',
      path: '/money-requests',
      icon: FileText,
      badge: pendingRequests > 0 ? pendingRequests : undefined,
      show: viewMode === 'work' && canAccessWork,
    },
    { name: 'Reports', path: '/reports', icon: FileText, show: viewMode === 'personal' || canAccessWork },
    { name: 'Admin Panel', path: '/admin', icon: Shield, show: isAdmin },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const visibleNavigation = navigation.filter((item) => item.show !== false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-semibold">ExpenseTracker</h1>
        <p className="text-sm text-muted-foreground mt-1">{currentUser?.name}</p>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* View Mode Toggle */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-2">VIEW MODE</p>
          <div className={`grid gap-2 ${canAccessWork ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Button
              variant={viewMode === 'personal' ? 'default' : 'outline'}
              className="w-full"
              onClick={() => {
                setViewMode('personal');
                setMobileOpen(false);
              }}
            >
              Personal
            </Button>
            {canAccessWork && (
              <Button
                variant={viewMode === 'work' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => {
                  setViewMode('work');
                  setMobileOpen(false);
                }}
              >
                Work
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <Badge variant="destructive" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r flex-col">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu />
          </Button>
          <h1 className="font-semibold">ExpenseTracker</h1>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
