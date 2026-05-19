import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { AppProvider, useApp } from './context/AppContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

function AuthWrapper() {
  const { isAuthenticated, isAuthLoading } = useApp();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, [isAuthenticated, isAuthLoading]);

  return null;
}

function AppContent() {
  return (
    <>
      <AuthWrapper />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
