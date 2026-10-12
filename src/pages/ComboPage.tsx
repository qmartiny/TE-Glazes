import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AddComboButton } from '../components/AddComboButton';
import { useAuth } from '../auth/AuthContext';
import { comboLink } from '../components/Cards';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { PhotoGallery } from '../components/PhotoGallery';
import { showSnackbar } from '../components/Snackbar';
import { backend } from '../lib/api';
import { firingLabel, groupResults, groupTitle, paramsFromFilters, type ComboGroup } from '../lib/filters';
import { formatDate } from '../lib/format';
import { comboKey, LAYER_TYPES, layerLabel, layerTypeInfo } from '../lib/layers';
import { invalidateResults, useResults } from '../lib/results';
import { errorMessage, useAsync } from '../lib/useAsync';
import type { Combo, ComboFilters, Layer } from '../types';
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

/**
 * A combination and everyone's results for it. Reached as /combo/<key>, or
 * as /c/<id> for one person's result (shown first).
 */
export function ComboPage() {
  const { id, key } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { results, error, retry } = useResults();
  const [deleting, setDeleting] = useState<Combo | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const group = useMemo((): ComboGroup | null | undefined => {
    if (!results) return undefined;
    let wanted = key;
    if (!wanted) {
      const result = results.find((r) => r.id === id);
      if (!result) return null;
      wanted = comboKey(result.layers);
    }
    return groupResults(results).find((g) => g.key === wanted) ?? null;
  }, [results, key, id]);

  const ids = group?.results.map((r) => r.id) ?? [];
  const full = useAsync(() => (ids.length ? backend.getCombos(ids) : Promise.resolve([])), [ids.join(',')]);

  if (error && !results) return <div className="notice notice-error">Couldn't load this combo: {error}</div>;
  if (group === undefined) return <div className="spinner" aria-label="Loading" />;
  if (group === null) return <NotFoundPage what="combo" />;

  const title = groupTitle(group);
  const people = new Set(group.results.map((r) => r.userId)).size;
  // The result you followed a link to comes first, then newest first.
  const combos = [...(full.data ?? [])].sort(
    (a, b) => Number(b.id === id) - Number(a.id === id) || b.createdAt.localeCompare(a.createdAt),
  );

  async function onShare() {
    const url = `${window.location.origin}${window.location.pathname}#${comboLink(group!.key)}`;
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

  async function onDelete() {
    if (!deleting || !group) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await backend.deleteCombo(deleting);
      invalidateResults();
      setDeleting(null);
      showSnackbar('Result deleted');
      if (group.results.length > 1) {
        navigate(comboLink(group.key), { replace: true });
        retry();
      } else {
        navigate(`/u/${deleting.userId}`, { replace: true });
      }
    } catch (err) {
      setDeleteError(`Couldn't delete: ${errorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="combo-group">
      <div className="combo-overview">
        <header>
          <h1 className="page-title">{title}</h1>
          <p className="byline">
            {group.results.length} {group.results.length === 1 ? 'result' : 'results'} from {people}{' '}
            {people === 1 ? 'member' : 'members'}
          </p>
        </header>

        <section aria-labelledby="layers-h">
          <h2 id="layers-h" className="section-title">
            {sectionTitle(group.layers)} <span className="section-hint">in the order applied</span>
          </h2>
          <ul className="list">
            {group.layers.map((layer, i) => (
              <li key={i}>
                <Link to={browseLink({ [layer.type]: layer.name })} className="list-item">
                  <span className="list-avatar">{i + 1}</span>
                  <span className="list-text">
                    <span className="list-headline">{layer.name}</span>
                    <span className="list-supporting">{layerTypeInfo(layer.type).label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="actions">
          {user && (
            <AddComboButton to={`/new?like=${group.results[0].id}`} className="btn btn-filled">
              <Icon name="add" /> Add your result
            </AddComboButton>
          )}
          <button type="button" className="btn btn-tonal" onClick={onShare}>
            <Icon name="share" /> Share
          </button>
        </div>
      </div>

      <section className="results" aria-labelledby="results-h">
        <h2 id="results-h" className="section-title">
          {group.results.length === 1 ? 'Result' : 'Results'}
        </h2>
        {full.error && <p className="form-error">Couldn't load the results: {full.error}</p>}
        {full.loading && !full.data && <div className="spinner" aria-label="Loading" />}
        {combos.map((combo) => (
          <ResultBlock
            key={combo.id}
            combo={combo}
            highlighted={combo.id === id && group.results.length > 1}
            isOwner={user?.id === combo.userId}
            onDelete={() => setDeleting(combo)}
          />
        ))}
      </section>

      <Dialog
        open={deleting !== null}
        headline="Delete your result?"
        onClose={() => !busy && setDeleting(null)}
        actions={
          <>
            <button type="button" className="btn btn-text" onClick={() => setDeleting(null)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-text btn-danger" onClick={onDelete} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p>
          Your photos and notes will be removed for good.
          {group.results.length > 1 && ' Other members’ results for this combo stay.'}
        </p>
        {deleteError && (
          <p className="form-error" role="alert">
            {deleteError}
          </p>
        )}
      </Dialog>
    </article>
  );
}

function ResultBlock({
  combo,
  highlighted,
  isOwner,
  onDelete,
}: {
  combo: Combo;
  highlighted: boolean;
  isOwner: boolean;
  onDelete: () => void;
}) {
  const applied = combo.layers.filter((l) => l.application);
  return (
    <article className={`result${highlighted ? ' highlight' : ''}`} aria-label={`Result by ${combo.author?.displayName}`}>
      <div className="result-media">
        {combo.photos.length ? (
          <PhotoGallery photos={combo.photos} alt={groupTitle(combo)} />
        ) : (
          <div className="card-noimg combo-noimg">No photo</div>
        )}
      </div>
      <div className="result-info">
        <p className="byline">
          {combo.author ? <Link to={`/u/${combo.userId}`}>{combo.author.displayName}</Link> : 'A member'}
          {' · '}
          {formatDate(combo.createdAt)}
        </p>
        {combo.isPrivate && (
          <p className="private-note">
            <Icon name="lock" /> Private: only you can see this
          </p>
        )}

        <div className="chip-row chip-row-wrap" aria-label="Clay and kiln">
          <Link to={browseLink({ clay: combo.clay })} className="chip chip-assist">
            <Icon name="texture" className="chip-leading chip-icon-primary" />
            <span className="chip-text">{combo.clay}</span>
          </Link>
          <Link to={browseLink({ firing: combo.firing })} className="chip chip-assist">
            <Icon name="local_fire_department" className="chip-leading chip-icon-primary" />
            <span className="chip-text">{firingLabel(combo.firing)}</span>
          </Link>
        </div>

        {applied.length > 0 && (
          <p className="result-how">
            {applied.map((l) => `${layerLabel(l)} ${l.application!.toLowerCase()}`).join(' · ')}
          </p>
        )}
        {combo.description && <p className="notes">{combo.description}</p>}

        {isOwner && (
          <div className="actions">
            <Link to={`/c/${combo.id}/edit`} className="btn btn-outlined">
              <Icon name="edit" /> Edit
            </Link>
            <button type="button" className="btn btn-text btn-danger" onClick={onDelete}>
              <Icon name="delete" /> Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
