import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { handOffPhotos } from '../lib/photoHandoff';

interface Props {
  /**
   * The form to open: "/new", or "/new?like=…" to start from a combo's layers.
   * A function is read when the photos are picked, for a target that changes on the page.
   */
  to?: string | (() => string);
  className: string;
  /** Accessible name, for buttons without visible text (the FAB). */
  label?: string;
  children: ReactNode;
}

/**
 * Starts a new post with the photo picker, since every post needs a photo, then
 * opens the form with those photos in. Signed out (or before setting up a
 * profile) it's a plain link, which goes through sign-in first.
 */
export function AddComboButton({ to = '/new', className, label, children }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  if (!user || !profile) {
    return (
      <Link to={typeof to === 'string' ? to : to()} className={className} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <label className={`${className} file-trigger`}>
      {children}
      <input
        type="file"
        accept="image/*"
        multiple
        aria-label={label}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (!files.length) return;
          handOffPhotos(files);
          navigate(typeof to === 'string' ? to : to());
        }}
      />
    </label>
  );
}
