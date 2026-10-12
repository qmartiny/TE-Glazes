import { useEffect, useState } from 'react';
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME } from '../config';
import { backend } from '../lib/api';
import { initials } from '../lib/format';
import { Icon, Logo, type IconName } from './Icon';
import { AddComboButton } from './AddComboButton';
import { SnackbarHost } from './Snackbar';

interface Destination {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  /** Other pages that belong under this destination. */
  also?: string[];
  /** Shown instead of the icon: your initials, so it's clear you're signed in. */
  avatar?: string;
}

function NavItem({ d, pathname }: { d: Destination; pathname: string }) {
  const active =
    pathname === d.to || (!d.end && pathname.startsWith(`${d.to}/`)) || (d.also?.includes(pathname) ?? false);
  return (
    <Link to={d.to} className={`nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
      <span className="nav-indicator">
        {d.avatar ? (
          <span className="nav-avatar" aria-hidden="true">
            {d.avatar}
          </span>
        ) : (
          <Icon name={d.icon} filled={active} />
        )}
      </span>
      <span className="nav-label">{d.label}</span>
    </Link>
  );
}

// Pages where adding a combo makes no sense right now (or you're already doing it).
const NO_FAB = [/^\/new$/, /^\/c\/[^/]+\/edit$/, /^\/signin$/, /^\/account$/, /^\/reset-password$/];

export function Layout() {
  const { user, profile, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const destinations: Destination[] = user
    ? [
        { to: '/', label: 'Browse', icon: 'grid_view', end: true },
        { to: '/tiles', label: 'Test tiles', icon: 'grid_on' },
        // Before the profile exists, this is where you set it up.
        profile
          ? {
              to: `/u/${user.id}`,
              label: 'My profile',
              icon: 'account_circle',
              also: ['/account'],
              avatar: initials(profile.displayName),
            }
          : { to: '/account', label: 'My profile', icon: 'account_circle' },
      ]
    : [
        { to: '/', label: 'Browse', icon: 'grid_view', end: true },
        { to: '/tiles', label: 'Test tiles', icon: 'grid_on' },
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
    <AddComboButton className="fab" label="Add a combo">
      <Icon name="add" />
    </AddComboButton>
  );

  return (
    <div className="app">
      <nav className="nav-rail" aria-label="Main">
        {showFab ? fab : <span className="fab-placeholder" />}
        <div className="nav-rail-items">
          {destinations.map((d) => (
            <NavItem key={d.to} d={d} pathname={pathname} />
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
          <NavItem key={d.to} d={d} pathname={pathname} />
        ))}
      </nav>

      <SnackbarHost />
      <ScrollRestoration />
    </div>
  );
}
