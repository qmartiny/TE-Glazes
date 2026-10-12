import { Link, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { CardGrid, GridSkeleton, LoadError, ResultCard } from '../components/Cards';
import { Icon } from '../components/Icon';
import { backend } from '../lib/api';
import { formatDate, initials } from '../lib/format';
import { useResults } from '../lib/results';
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
          <h1 className="page-title">{isMe ? 'My combos' : profile.displayName}</h1>
          <p className="section-supporting">
            {isMe && `${profile.displayName} · `}
            {profile.studio ? `${profile.studio} · ` : ''}
            Member since {formatDate(profile.createdAt)}
          </p>
          {profile.bio && <p className="bio">{profile.bio}</p>}
        </div>
        {isMe && (
          <Link to="/account" className="btn btn-outlined profile-edit">
            <Icon name="edit" /> Edit profile
          </Link>
        )}
      </section>

      <ProfileResults userId={profile.id} isMe={isMe} name={profile.displayName} />
    </>
  );
}

/** A member's own posts, newest first (shared and, for yourself, private). */
function ProfileResults({ userId, isMe, name }: { userId: string; isMe: boolean; name: string }) {
  const { results, error, retry } = useResults();
  if (error && !results) return <LoadError error={error} retry={retry} />;
  if (!results) return <GridSkeleton />;

  const mine = results.filter((r) => r.userId === userId);
  if (!mine.length) {
    return isMe ? (
      <div className="empty">
        <Icon name="palette" className="empty-icon" />
        <p>You haven’t added any combos yet. Everything you add, shared or private, shows up here.</p>
        <Link to="/new" className="btn btn-filled">
          <Icon name="add" /> Add your first combo
        </Link>
      </div>
    ) : (
      <div className="empty">
        <p>{name} hasn’t shared any combos yet.</p>
      </div>
    );
  }
  return (
    <CardGrid
      items={mine}
      listKey={`profile|${userId}`}
      itemKey={(r) => r.id}
      render={(r) => <ResultCard result={r} />}
    />
  );
}
