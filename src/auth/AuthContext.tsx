import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { backend } from '../lib/api';
import type { AuthUser, Profile } from '../types';

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  /** True until we know whether someone is signed in (and have their profile). */
  loading: boolean;
  setProfile: (profile: Profile) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userKnown, setUserKnown] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const apply = (next: AuthUser | null) => {
      if (!active) return;
      // Keep the same object when the user hasn't changed (token refreshes etc.).
      setUser((prev) => (prev?.id === next?.id ? prev : next));
      setUserKnown(true);
    };
    backend.getUser().then(apply, () => apply(null));
    const unsubscribe = backend.onAuthChange(apply);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileFor(null);
      return;
    }
    let active = true;
    backend
      .getProfile(user.id)
      .catch(() => null)
      .then((p) => {
        if (!active) return;
        setProfile(p);
        setProfileFor(user.id);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const updateProfile = useCallback((p: Profile) => {
    setProfile(p);
    setProfileFor(p.id);
  }, []);

  const loading = !userKnown || (user !== null && profileFor !== user.id);

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile: updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
