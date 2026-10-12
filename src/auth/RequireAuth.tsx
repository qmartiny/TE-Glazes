import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

/** Sends signed-out visitors to sign in (and back here afterwards). */
export function RequireAuth({ children, needsProfile = false }: { children: ReactNode; needsProfile?: boolean }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const here = encodeURIComponent(location.pathname + location.search);

  if (!user) return <Navigate to={`/signin?next=${here}`} replace />;
  // Combos are linked to a profile, so make sure there is one first.
  if (needsProfile && !profile) return <Navigate to={`/account?next=${here}`} replace />;
  return <>{children}</>;
}
