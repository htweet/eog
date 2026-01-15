import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'requester' | 'voucher' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, userRole, isAdmin } = useAuth();
  const location = useLocation();
  const [hasShownToast, setHasShownToast] = useState(false);

  // Check role access
  useEffect(() => {
    if (!loading && user && requiredRole && !hasShownToast) {
      const hasAccess = 
        isAdmin || 
        userRole === requiredRole ||
        (requiredRole === 'admin' && isAdmin);

      if (!hasAccess) {
        toast.error("Access Denied", {
          description: "Redirecting to your dashboard...",
        });
        setHasShownToast(true);
      }
    }
  }, [loading, user, requiredRole, userRole, isAdmin, hasShownToast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (requiredRole) {
    const hasAccess = 
      isAdmin || 
      userRole === requiredRole ||
      (requiredRole === 'admin' && isAdmin);

    if (!hasAccess) {
      // Redirect to appropriate dashboard
      if (userRole === 'voucher') {
        return <Navigate to="/dashboard/voucher" replace />;
      } else if (userRole === 'requester') {
        return <Navigate to="/dashboard/requester" replace />;
      } else if (isAdmin) {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
