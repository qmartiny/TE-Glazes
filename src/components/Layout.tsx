import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME } from '../config';
import { backend } from '../lib/api';
import { GridIcon, Logo, PlusIcon, UserIcon } from './Icons';

export function Layout() {
  const { user, profile, loading } = useAuth();
  const meLink = user ? `/u/${user.id}` : '/signin';

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <Logo />
            <span>{APP_NAME}</span>
          </Link>
          <nav className="topnav" aria-label="Main">
            <NavLink to="/" end>
              Browse
            </NavLink>
            {user && <NavLink to={meLink}>My combos</NavLink>}
            {user ? (
              <NavLink to="/account">{profile?.displayName ?? 'Account'}</NavLink>
            ) : (
              <NavLink to="/signin">Sign in</NavLink>
            )}
            <Link to="/new" className="btn btn-primary btn-small">
              <PlusIcon /> Add combo
            </Link>
          </nav>
        </div>
      </header>

      {backend.mode === 'demo' && (
        <div className="demo-banner" role="note">
          <strong>Demo mode</strong> — anything you add is saved in this browser only.
        </div>
      )}

      <main className="page">
        {loading ? <div className="spinner" aria-label="Loading" /> : <Outlet />}
      </main>

      <footer className="footer">
        A community glaze notebook for studio members. Not an official studio site.
      </footer>

      <nav className="tabbar" aria-label="Main">
        <NavLink to="/" end>
          <GridIcon />
          <span>Browse</span>
        </NavLink>
        <NavLink to="/new" className="tab-add">
          <span className="tab-add-circle">
            <PlusIcon />
          </span>
          <span>Add</span>
        </NavLink>
        <NavLink to={user ? meLink : '/signin'}>
          <UserIcon />
          <span>{user ? 'Me' : 'Sign in'}</span>
        </NavLink>
      </nav>

      <ScrollRestoration />
    </div>
  );
}
