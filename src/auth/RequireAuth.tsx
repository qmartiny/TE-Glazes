import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { MEMBERS_ONLY } from '../config';
import { useAuth } from './AuthContext';

/** Sends signed-out visitors to sign in (and back here afterwards). */
export function RequireAuth({ children, needsProfile = false }: { children: ReactNode; needsProfile?: boolean }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const path = location.pathname + location.search;
  const here = encodeURIComponent(path);

  if (!user) return <Navigate to={path === '/' ? '/signin' : `/signin?next=${here}`} replace />;
  // Combos are linked to a profile, so make sure there is one first.
  if (needsProfile && !profile) return <Navigate to={`/account?next=${here}`} replace />;
  return <>{children}</>;
}

/** The pages only members can see, when the site is members-only. */
export function MembersOnly() {
  return MEMBERS_ONLY ? (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  ) : (
    <Outlet />
  );
}
