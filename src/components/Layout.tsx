import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME } from '../config';
import { backend } from '../lib/api';
import { Icon, Logo, type IconName } from './Icon';
import { SnackbarHost } from './Snackbar';

interface Destination {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

// Pages where adding a combo makes no sense right now (or you're already doing it).
const NO_FAB = [/^\/new$/, /^\/c\/[^/]+\/edit$/, /^\/signin$/, /^\/account$/, /^\/reset-password$/];

export function Layout() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const destinations: Destination[] = user
    ? [
        { to: '/', label: 'Browse', icon: 'grid_view', end: true },
        { to: `/u/${user.id}`, label: 'My combos', icon: 'palette' },
        { to: '/account', label: 'Profile', icon: 'account_circle' },
      ]
    : [
        { to: '/', label: 'Browse', icon: 'grid_view', end: true },
        { to: '/signin', label: 'Sign in', icon: 'login' },
      ];
  const topLevel = destinations.some((d) => d.to === pathname);
  const showFab = !NO_FAB.some((re) => re.test(pathname));

  // The top app bar picks up a tint once the page scrolls under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function goBack() {
    // React Router keeps its own history index; fall back to Browse on a fresh tab.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  }

  const fab = (
    <Link to="/new" className="fab" aria-label="Add a combo">
      <Icon name="add" />
    </Link>
  );

  return (
    <div className="app">
      <nav className="nav-rail" aria-label="Main">
        {showFab ? fab : <span className="fab-placeholder" />}
        <div className="nav-rail-items">
          {destinations.map((d) => (
            <NavLink key={d.to} to={d.to} end={d.end} className="nav-item">
              {({ isActive }) => (
                <>
                  <span className="nav-indicator">
                    <Icon name={d.icon} filled={isActive} />
                  </span>
                  <span className="nav-label">{d.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="app-body">
        <header className={`top-app-bar${scrolled ? ' scrolled' : ''}`}>
          {!topLevel && (
            <button type="button" className="icon-btn" aria-label="Back" onClick={goBack}>
              <Icon name="arrow_back" />
            </button>
          )}
          <Link to="/" className="top-app-bar-title">
            <Logo />
            <span>{APP_NAME}</span>
          </Link>
        </header>

        {backend.mode === 'demo' && (
          <div className="demo-banner" role="note">
            Demo mode: anything you add is saved in this browser only.
          </div>
        )}

        <main className="page">{loading ? <div className="spinner" aria-label="Loading" /> : <Outlet />}</main>

        <footer className="footer">A community glaze notebook for studio members. Not an official studio site.</footer>
      </div>

      {showFab && <div className="fab-compact">{fab}</div>}

      <nav className="nav-bar" aria-label="Main">
        {destinations.map((d) => (
          <NavLink key={d.to} to={d.to} end={d.end} className="nav-item">
            {({ isActive }) => (
              <>
                <span className="nav-indicator">
                  <Icon name={d.icon} filled={isActive} />
                </span>
                <span className="nav-label">{d.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <SnackbarHost />
      <ScrollRestoration />
    </div>
  );
}
