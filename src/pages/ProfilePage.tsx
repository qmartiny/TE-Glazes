import { Link, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ComboList } from '../components/ComboList';
import { backend } from '../lib/api';
import { formatDate, initials } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { NotFoundPage } from './NotFoundPage';

export function ProfilePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data: profile, error, loading } = useAsync(() => backend.getProfile(id), [id]);
  const isMe = user?.id === id;

  if (loading && !profile) return <div className="spinner" aria-label="Loading" />;
  if (error) return <div className="notice notice-error">Couldn't load this profile: {error}</div>;
  if (!profile) return <NotFoundPage what="profile" />;

  return (
    <>
      <section className="profile-head">
        <div className="avatar" aria-hidden="true">
          {initials(profile.displayName)}
        </div>
        <div>
          <h1>{isMe ? 'My combos' : profile.displayName}</h1>
          <p className="muted">
            {isMe && `${profile.displayName} · `}
            {profile.studio ? `${profile.studio} · ` : ''}
            Member since {formatDate(profile.createdAt)}
          </p>
          {profile.bio && <p className="bio">{profile.bio}</p>}
        </div>
        {isMe && (
          <Link to="/account" className="btn btn-small profile-edit">
            Edit profile
          </Link>
        )}
      </section>

      <ComboList
        filters={{ user: profile.id }}
        showAuthor={false}
        empty={
          isMe ? (
            <div className="empty">
              <p>You haven’t added any combos yet. Your combos — shared or private — will appear here.</p>
              <Link to="/new" className="btn btn-primary">
                Add your first combo
              </Link>
            </div>
          ) : (
            <div className="empty">
              <p>{profile.displayName} hasn’t shared any combos yet.</p>
            </div>
          )
        }
      />
    </>
  );
}
