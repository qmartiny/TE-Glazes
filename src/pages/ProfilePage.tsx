import { Link, useNavigate, useParams } from 'react-router';
import { AddComboButton } from '../components/AddComboButton';
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
  const { user, profile: myProfile } = useAuth();
  const navigate = useNavigate();
  const isMe = user?.id === id;
  const { data, error, loading } = useAsync(() => backend.getProfile(id), [id]);
  // Your own profile is already loaded, so it shows straight away.
  const profile = (isMe && myProfile) || data;

  if (loading && !profile) return <div className="spinner" aria-label="Loading" />;
  if (error && !profile) return <div className="notice notice-error">Couldn't load this profile: {error}</div>;
  if (!profile) return <NotFoundPage what="profile" />;

  async function onSignOut() {
    await backend.signOut();
    navigate('/', { replace: true });
  }

  return (
    <>
      <section className="profile-head">
        <div className="avatar" aria-hidden="true">
          {initials(profile.displayName)}
        </div>
        <div>
          <h1 className="page-title">{profile.displayName}</h1>
          <p className="section-supporting">
            {profile.studio ? `${profile.studio} · ` : ''}
            Member since {formatDate(profile.createdAt)}
          </p>
          {profile.bio && <p className="bio">{profile.bio}</p>}
        </div>
        {isMe && (
          <Link to="/account" className="btn btn-outlined profile-edit">
            <Icon name="settings" /> Settings
          </Link>
        )}
      </section>

      <ProfileResults userId={profile.id} isMe={isMe} name={profile.displayName} />

      {isMe && user && (
        <section className="account-extra">
          <p className="section-supporting">Signed in as {user.email}</p>
          <button type="button" className="btn btn-outlined" onClick={onSignOut}>
            <Icon name="logout" /> Sign out
          </button>
        </section>
      )}
    </>
  );
}

/** A member's own posts, newest first (shared and, for yourself, private). Studio tiles live on Test tiles. */
function ProfileResults({ userId, isMe, name }: { userId: string; isMe: boolean; name: string }) {
  const { results, error, retry } = useResults();
  if (error && !results) return <LoadError error={error} retry={retry} />;
  if (!results) return <GridSkeleton />;

  const mine = results.filter((r) => r.userId === userId && !r.official);
  const tiles = results.filter((r) => r.userId === userId && r.official).length;
  const tilesNote = tiles > 0 && (
    <p className="section-supporting profile-tiles">
      <Icon name="verified" /> Posted {tiles} <Link to="/tiles">studio test {tiles === 1 ? 'tile' : 'tiles'}</Link>
    </p>
  );
  if (!mine.length) {
    if (tiles > 0) return tilesNote;
    return isMe ? (
      <div className="empty">
        <Icon name="palette" className="empty-icon" />
        <p>Nothing here yet.</p>
        <AddComboButton className="btn btn-filled">
          <Icon name="add" /> Add your first glaze
        </AddComboButton>
      </div>
    ) : (
      <div className="empty">
        <p>{name} hasn’t shared any glazes yet.</p>
      </div>
    );
  }

  const privateCount = isMe ? mine.filter((r) => r.isPrivate).length : 0;
  return (
    <section aria-labelledby="profile-combos">
      <div className="section-head">
        <h2 id="profile-combos" className="section-title">
          {isMe ? 'My glazes' : 'Glazes'}
        </h2>
        <p className="section-supporting">
          {mine.length} {mine.length === 1 ? 'result' : 'results'}
          {privateCount > 0 && ` · ${privateCount} private`}
        </p>
      </div>
      {tilesNote}
      <CardGrid
        items={mine}
        listKey={`profile|${userId}`}
        itemKey={(r) => r.id}
        render={(r) => <ResultCard result={r} />}
      />
    </section>
  );
}
