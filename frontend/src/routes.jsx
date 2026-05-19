import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

const AppLayout = lazy(() => import('./layouts/AppLayout').then((module) => ({ default: module.AppLayout })));
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const PersonalExpensesPage = lazy(() => import('./features/personal-expenses/pages/PersonalExpensesPage').then((module) => ({ default: module.PersonalExpensesPage })));
const OrganizationsPage = lazy(() => import('./features/organizations/pages/OrganizationsPage').then((module) => ({ default: module.OrganizationsPage })));
const EmployeesPage = lazy(() => import('./features/employees/pages/EmployeesPage').then((module) => ({ default: module.EmployeesPage })));
const MoneyRequestsPage = lazy(() => import('./features/money-requests/pages/MoneyRequestsPage').then((module) => ({ default: module.MoneyRequestsPage })));
const ReportsPage = lazy(() => import('./features/reports/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const AdminPanelPage = lazy(() => import('./features/admin/pages/AdminPanelPage').then((module) => ({ default: module.AdminPanelPage })));

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/',
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: DashboardPage,
      },
      {
        path: 'personal-expenses',
        Component: PersonalExpensesPage,
      },
      {
        path: 'organizations',
        Component: OrganizationsPage,
      },
      {
        path: 'employees',
        Component: EmployeesPage,
      },
      {
        path: 'money-requests',
        Component: MoneyRequestsPage,
      },
      {
        path: 'reports',
        Component: ReportsPage,
      },
      {
        path: 'settings',
        Component: SettingsPage,
      },
      {
        path: 'admin',
        Component: AdminPanelPage,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
