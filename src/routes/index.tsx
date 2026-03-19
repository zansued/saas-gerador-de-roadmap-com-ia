import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import RoadmapPage from '../pages/RoadmapPage';
import SubscriptionPage from '../pages/SubscriptionPage';
import Login from '../components/Login';
import Register from '../components/Register';
import { useAuth } from '../hooks/useAuth';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingFallback from '../components/LoadingFallback';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiresSubscription?: boolean }> = ({ children, requiresSubscription = false }) => {
  const { user, subscriptionStatus, isLoading, error } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen">Erro de autenticação. Tente novamente.</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiresSubscription && subscriptionStatus !== 'active') {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode; redirectTo?: string }> = ({ children, redirectTo }) => {
  const { user, isLoading, error } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (error) {
    return <>{children}</>;
  }

  if (user && redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <PublicRoute redirectTo="/roadmaps">
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute redirectTo="/roadmaps">
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/roadmaps"
            element={
              <ProtectedRoute>
                <RoadmapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roadmaps/new"
            element={
              <ProtectedRoute requiresSubscription>
                <RoadmapPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roadmaps/:id"
            element={
              <ProtectedRoute>
                <RoadmapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default AppRoutes;