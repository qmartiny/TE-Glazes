import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { invalidateComboCache } from '../components/ComboList';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { showSnackbar } from '../components/Snackbar';
import { PhotoGallery } from '../components/PhotoGallery';
import { backend } from '../lib/api';
import { comboTitle, firingLabel, paramsFromFilters } from '../lib/filters';
import { formatDate } from '../lib/format';
import { errorMessage, useAsync } from '../lib/useAsync';
import { LAYER_TYPES, layerTypeInfo } from '../lib/layers';
import type { ComboFilters, Layer } from '../types';
import { NotFoundPage } from './NotFoundPage';

const browseLink = (filters: ComboFilters) => `/?${paramsFromFilters(filters)}`;

/** "Glazes", or "Glazes & slips" etc. when the combo uses more than glaze. */
function sectionTitle(layers: Layer[]) {
  const types = LAYER_TYPES.filter((t) => layers.some((l) => l.type === t.type));
  if (types.length === 1 && types[0].type === 'glaze') return 'Glazes';
  const names = types.map((t) => `${t.label.toLowerCase()}s`);
  const text = names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ComboPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: combo, error, loading } = useAsync(() => backend.getCombo(id), [id, user?.id]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      showSnackbar('Combo deleted');
      navigate(`/u/${combo.userId}`, { replace: true });
    } catch (err) {
      setDeleting(false);
      setDeleteError(`Couldn't delete: ${errorMessage(err)}`);
    }
  }

  async function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return; // closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showSnackbar('Link copied');
    } catch {
      showSnackbar('Copy the address from your browser to share it');
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
          <h1 className="page-title">{title}</h1>
          <p className="byline">
            {combo.author ? <Link to={`/u/${combo.userId}`}>{combo.author.displayName}</Link> : 'Unknown potter'}
            {' · '}
            {formatDate(combo.createdAt)}
          </p>
          {combo.isPrivate && (
            <p className="private-note">
              <Icon name="lock" /> Private: only you can see this
            </p>
          )}
        </header>

        <div className="chip-row chip-row-wrap" aria-label="Clay and firing">
          <Link to={browseLink({ clay: combo.clay })} className="chip chip-assist">
            <Icon name="texture" className="chip-leading chip-icon-primary" />
            <span className="chip-text">{combo.clay}</span>
          </Link>
          <Link to={browseLink({ firing: combo.firing })} className="chip chip-assist">
            <Icon name="local_fire_department" className="chip-leading chip-icon-primary" />
            <span className="chip-text">{firingLabel(combo.firing)}</span>
          </Link>
        </div>

        <section aria-labelledby="layers-h">
          <h2 id="layers-h" className="section-title">
            {sectionTitle(combo.layers)} <span className="section-hint">in the order applied</span>
          </h2>
          <ul className="list">
            {combo.layers.map((layer, i) => (
              <li key={i}>
                <Link to={browseLink({ [layer.type]: layer.name })} className="list-item">
                  <span className="list-avatar">{i + 1}</span>
                  <span className="list-text">
                    <span className="list-headline">{layer.name}</span>
                    <span className="list-supporting">
                      {[layerTypeInfo(layer.type).label, layer.application].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {combo.description && (
          <section aria-labelledby="notes-h">
            <h2 id="notes-h" className="section-title">
              Notes
            </h2>
            <p className="notes">{combo.description}</p>
          </section>
        )}

        <div className="actions">
          <button type="button" className="btn btn-tonal" onClick={onShare}>
            <Icon name="share" /> Share
          </button>
          {isOwner && (
            <>
              <Link to={`/c/${combo.id}/edit`} className="btn btn-outlined">
                <Icon name="edit" /> Edit
              </Link>
              <button type="button" className="btn btn-text btn-danger" onClick={() => setConfirming(true)}>
                <Icon name="delete" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={confirming}
        headline="Delete this combo?"
        onClose={() => !deleting && setConfirming(false)}
        actions={
          <>
            <button type="button" className="btn btn-text" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="btn btn-text btn-danger" onClick={onDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p>The combo and its photos will be removed for good.</p>
        {deleteError && (
          <p className="form-error" role="alert">
            {deleteError}
          </p>
        )}
      </Dialog>
    </article>
  );
}
