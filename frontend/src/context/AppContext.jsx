import React, { createContext, useContext, useEffect, useState } from 'react';

const AppContext = createContext(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_STORAGE_KEY = 'authToken';

function isAdminRole(user) {
  return user?.role === 'admin';
}

function isEmployeeRole(user) {
  return user?.role === 'employee';
}

function isOrgHeadRole(user) {
  return user?.role === 'organization_head';
}

function hasWorkAccess(user) {
  return isAdminRole(user) || isOrgHeadRole(user) || isEmployeeRole(user);
}

function canManageOrganizations(user) {
  return isAdminRole(user) || isOrgHeadRole(user);
}

function canManageUsers(user) {
  return isAdminRole(user);
}

async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // Keep default message when backend does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authToken, setAuthToken] = useState(localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [viewMode, setViewMode] = useState('personal');
  const [personalExpenses, setPersonalExpenses] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [moneyRequests, setMoneyRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [adminPanelData, setAdminPanelData] = useState({
    users: [],
    expenses: [],
    organizations: [],
    requests: [],
  });

  const syncSessionFromServer = async (token) => {
    if (!token) return;

    const meResponse = await apiRequest('/auth/me', { token });
    setCurrentUser(meResponse.user);
    setIsAuthenticated(true);
    await fetchInitialData(token, meResponse.user);
  };

  const clearSession = () => {
    setAuthToken('');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setPersonalExpenses([]);
    setOrganizations([]);
    setEmployees([]);
    setMoneyRequests([]);
    setUsers([]);
    setAdminPanelData({
      users: [],
      expenses: [],
      organizations: [],
      requests: [],
    });
    setIsAuthLoading(false);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const fetchInitialData = async (token, user) => {
    const expensesResponse = await apiRequest('/expenses', { token });
    setPersonalExpenses(expensesResponse.data);

    if (!hasWorkAccess(user)) {
      setOrganizations([]);
      setEmployees([]);
      setMoneyRequests([]);
      setUsers([]);
      setViewMode('personal');
      return;
    }

    const [organizationsResponse, employeesResponse, requestsResponse] = await Promise.all([
      apiRequest('/organizations', { token }),
      apiRequest('/employees', { token }),
      apiRequest('/money-requests', { token }),
    ]);

    setOrganizations(organizationsResponse.data);
    setEmployees(employeesResponse.data);
    setMoneyRequests(requestsResponse.data);

    if (isAdminRole(user)) {
      const adminPanelResponse = await apiRequest('/admin/panel', { token });
      setUsers(adminPanelResponse.data.users);
      setAdminPanelData(adminPanelResponse.data);
      return;
    }

    setUsers([]);
    setAdminPanelData({
      users: [],
      expenses: [],
      organizations: [],
      requests: [],
    });
  };

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const meResponse = await apiRequest('/auth/me', { token });
        setAuthToken(token);
        setCurrentUser(meResponse.user);
        setIsAuthenticated(true);
        await fetchInitialData(token, meResponse.user);
      } catch {
        clearSession();
        return;
      }

      setIsAuthLoading(false);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        const meResponse = await apiRequest('/auth/me', { token: authToken });
        if (cancelled) return;

        const roleChanged = meResponse.user?.role !== currentUser?.role;
        setCurrentUser(meResponse.user);

        if (roleChanged) {
          await fetchInitialData(authToken, meResponse.user);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      }
    };

    const handleFocus = () => {
      sync();
    };

    const intervalId = window.setInterval(sync, 30000);
    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, authToken, currentUser?.role]);

  const login = async (email, password) => {
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      const token = response.token;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setAuthToken(token);
      setCurrentUser(response.user);
      setIsAuthenticated(true);
      setIsAuthLoading(false);

      await fetchInitialData(token, response.user);
      return true;
    } catch (error) {
      clearSession();
      throw error;
    }
  };

  const logout = () => {
    clearSession();
  };

  const signup = async (name, email, password) => {
    try {
      const response = await apiRequest('/auth/signup', {
        method: 'POST',
        body: { name, email, password },
      });

      const token = response.token;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setAuthToken(token);
      setCurrentUser(response.user);
      setIsAuthenticated(true);
      setIsAuthLoading(false);

      await fetchInitialData(token, response.user);
      return true;
    } catch (error) {
      clearSession();
      throw error;
    }
  };

  const addPersonalExpense = async (expense) => {
    if (!authToken) throw new Error('Not authenticated');

    const response = await apiRequest('/expenses', {
      method: 'POST',
      token: authToken,
      body: expense,
    });

    setPersonalExpenses((previous) => [response.data, ...previous]);
  };

  const updatePersonalExpense = async (id, expense) => {
    if (!authToken) throw new Error('Not authenticated');

    const response = await apiRequest(`/expenses/${id}`, {
      method: 'PATCH',
      token: authToken,
      body: expense,
    });

    setPersonalExpenses((previous) =>
      previous.map((item) => (item.id === id ? response.data : item))
    );
  };

  const deletePersonalExpense = async (id) => {
    if (!authToken) throw new Error('Not authenticated');

    await apiRequest(`/expenses/${id}`, {
      method: 'DELETE',
      token: authToken,
    });

    setPersonalExpenses((previous) => previous.filter((item) => item.id !== id));
  };

  const createOrganization = async (organization) => {
    if (!authToken) throw new Error('Not authenticated');

    const response = await apiRequest('/organizations', {
      method: 'POST',
      token: authToken,
      body: organization,
    });

    setOrganizations((previous) => [...previous, response.data]);
  };

  const addEmployee = async (employee) => {
    if (!authToken) throw new Error('Not authenticated');

    const response = await apiRequest('/employees', {
      method: 'POST',
      token: authToken,
      body: employee,
    });

    setEmployees((previous) => [...previous, response.data]);
  };

  const removeEmployee = async (id) => {
    if (!authToken) throw new Error('Not authenticated');

    await apiRequest(`/employees/${id}`, {
      method: 'DELETE',
      token: authToken,
    });

    setEmployees((previous) => previous.filter((item) => item.id !== id));
  };

  const createMoneyRequest = async (request) => {
    if (!authToken) throw new Error('Not authenticated');

    const response = await apiRequest('/money-requests', {
      method: 'POST',
      token: authToken,
      body: request,
    });

    setMoneyRequests((previous) => [response.data, ...previous]);
  };

  const updateRequestStatus = async (id, status, note) => {
    if (!authToken) throw new Error('Not authenticated');

    const response = await apiRequest(`/money-requests/${id}/status`, {
      method: 'PATCH',
      token: authToken,
      body: { status, ...(note ? { note } : {}) },
    });

    setMoneyRequests((previous) =>
      previous.map((item) => (item.id === id ? response.data : item))
    );
  };

  const updateUserRole = async (id, role) => {
    if (!authToken) throw new Error('Not authenticated');

    const response = await apiRequest(`/users/${id}/role`, {
      method: 'PATCH',
      token: authToken,
      body: { role },
    });

    setUsers((previous) => previous.map((item) => (item.id === id ? response.data : item)));

    await syncSessionFromServer(authToken);
  };

  const isAdmin = isAdminRole(currentUser);
  const isOrgHead = isOrgHeadRole(currentUser);
  const isEmployee = isEmployeeRole(currentUser);
  const canAccessWork = hasWorkAccess(currentUser);
  const canManageOrg = canManageOrganizations(currentUser);
  const canManageUsersFlag = canManageUsers(currentUser);
  const currentEmployee = employees.find(
    (employee) => employee.email?.toLowerCase() === currentUser?.email?.toLowerCase()
  ) || null;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAuthLoading,
        isAdmin,
        isOrgHead,
        isEmployee,
        canAccessWork,
        canManageOrg,
        canManageUsers: canManageUsersFlag,
        currentEmployee,
        viewMode,
        personalExpenses,
        organizations,
        employees,
        moneyRequests,
        users,
        adminPanelData,
        login,
        logout,
        signup,
        setViewMode,
        addPersonalExpense,
        updatePersonalExpense,
        deletePersonalExpense,
        createOrganization,
        addEmployee,
        removeEmployee,
        createMoneyRequest,
        updateRequestStatus,
        updateUserRole,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
