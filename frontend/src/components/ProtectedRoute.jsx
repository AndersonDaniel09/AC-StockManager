import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function ProtectedRoute({
  children,
  adminOnly = false,
  requireSell = false,
  requireEdit = false,
  requireSellOrEdit = false,
  adminRedirect = null,
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (requireSell && user.role !== 'ADMIN' && !user.canSell) return <Navigate to="/" replace />;
  if (requireEdit && user.role !== 'ADMIN' && !user.canEditProducts) return <Navigate to="/" replace />;
  if (requireSellOrEdit && user.role !== 'ADMIN' && !user.canSell && !user.canEditProducts) return <Navigate to="/" replace />;
  if (adminRedirect && user.role === 'ADMIN') return <Navigate to={adminRedirect} replace />;

  return children;
}
