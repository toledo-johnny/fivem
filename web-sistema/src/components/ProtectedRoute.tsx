import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const { canAccessAdmin, isAuthenticated, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <LoadingScreen message="Validando acesso" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && !canAccessAdmin) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname, restricted: 'admin' }} />;
  }

  return <>{children}</>;
}
