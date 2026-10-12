import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { invalidateComboCache } from '../components/ComboList';
import { LockIcon, ShareIcon } from '../components/Icons';
import { PhotoGallery } from '../components/PhotoGallery';
import { backend } from '../lib/api';
import { comboTitle, firingLabel, paramsFromFilters } from '../lib/filters';
import { formatDate } from '../lib/format';
import { errorMessage, useAsync } from '../lib/useAsync';
import type { ComboFilters } from '../types';
import { NotFoundPage } from './NotFoundPage';

const browseLink = (filters: ComboFilters) => `/?${paramsFromFilters(filters)}`;

export function ComboPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: combo, error, loading } = useAsync(() => backend.getCombo(id), [id, user?.id]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  if (loading && !combo) return <div className="spinner" aria-label="Loading" />;
  if (error) return <div className="notice notice-error">Couldn't load this combo: {error}</div>;
  if (!combo) return <NotFoundPage what="combo" />;

  const title = comboTitle(combo);
  const isOwner = user?.id === combo.userId;

  async function onDelete() {
    if (!combo) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await backend.deleteCombo(combo);
      invalidateComboCache();
      navigate(`/u/${combo.userId}`, { replace: true });
    } catch (err) {
      setDeleting(false);
      setDeleteError(`Couldn't delete: ${errorMessage(err)}`);
    }
  }

  async function onShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareNote('Link copied');
      }
    } catch {
      // Share sheet dismissed, or clipboard blocked — nothing to do.
    }
  }

  return (
    <article className="combo">
      <div className="combo-media">
        {combo.photos.length ? (
          <PhotoGallery photos={combo.photos} alt={title} />
        ) : (
          <div className="card-noimg combo-noimg">No photo yet</div>
        )}
      </div>

      <div className="combo-info">
        <header>
          <h1>{title}</h1>
          <p className="byline">
            {combo.author ? <Link to={`/u/${combo.userId}`}>{combo.author.displayName}</Link> : 'Unknown potter'}
            {' · '}
            {formatDate(combo.createdAt)}
            {combo.isPrivate && (
              <span className="badge badge-inline">
                <LockIcon /> Private
              </span>
            )}
          </p>
        </header>

        <section aria-labelledby="glazes-h">
          <h2 id="glazes-h" className="section-label">
            Glazes <span className="muted">(in the order applied)</span>
          </h2>
          <ol className="layers">
            {combo.layers.map((layer, i) => (
              <li key={i}>
                <span className="layer-num">{i + 1}</span>
                <Link to={browseLink({ glaze: layer.glaze })} className="layer-glaze">
                  {layer.glaze}
                </Link>
                {layer.application && <span className="muted"> · {layer.application}</span>}
              </li>
            ))}
          </ol>
        </section>

        <dl className="facts">
          <div>
            <dt>Clay</dt>
            <dd>
              <Link to={browseLink({ clay: combo.clay })}>{combo.clay}</Link>
            </dd>
          </div>
          <div>
            <dt>Firing</dt>
            <dd>
              <Link to={browseLink({ firing: combo.firing })}>{firingLabel(combo.firing)}</Link>
            </dd>
          </div>
          {combo.studio && (
            <div>
              <dt>Studio</dt>
              <dd>
                <Link to={browseLink({ studio: combo.studio })}>{combo.studio}</Link>
              </dd>
            </div>
          )}
        </dl>

        {combo.description && (
          <section aria-labelledby="notes-h">
            <h2 id="notes-h" className="section-label">
              Notes
            </h2>
            <p className="notes">{combo.description}</p>
          </section>
        )}

        <div className="actions">
          <button type="button" className="btn" onClick={onShare}>
            <ShareIcon /> {shareNote ?? 'Share'}
          </button>
          {isOwner && !confirming && (
            <>
              <Link to={`/c/${combo.id}/edit`} className="btn">
                Edit
              </Link>
              <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
                Delete
              </button>
            </>
          )}
          {isOwner && confirming && (
            <div className="confirm" role="alertdialog" aria-labelledby="confirm-text">
              <p id="confirm-text">Delete this combo and its photos? This can’t be undone.</p>
              <button type="button" className="btn btn-danger" onClick={onDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={deleting}>
                Cancel
              </button>
            </div>
          )}
        </div>
        {deleteError && (
          <p className="form-error" role="alert">
            {deleteError}
          </p>
        )}
      </div>
    </article>
  );
}
