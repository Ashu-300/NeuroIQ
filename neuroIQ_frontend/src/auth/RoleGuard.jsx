import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { getDashboardPath } from '../utils/roles';

/**
 * Restricts routes based on user role
 */
const RoleGuard = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to user's dashboard if role not allowed
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return children;
};

export default RoleGuard;
