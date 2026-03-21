import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-center text-center py-5">Loading...</div>;
  }

  if (!user || !user.is_platform_admin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
