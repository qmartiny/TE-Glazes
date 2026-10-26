import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AddComboButton } from '../components/AddComboButton';
import { useAuth } from '../auth/AuthContext';
import { comboLink, glazeLink } from '../components/Cards';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { PhotoGallery } from '../components/PhotoGallery';
import { showSnackbar } from '../components/Snackbar';
import { TileStrip } from '../components/TileStrip';
import { CLAYS } from '../config';
import { backend } from '../lib/api';
import { firingLabel, groupResults, groupTitle, paramsFromFilters, type ComboGroup } from '../lib/filters';
import { partsLabel } from '../lib/clays';
import { formatDate } from '../lib/format';
import { comboKey, isStudioMaterial, LAYER_TYPES, layerLabel, layerTypeInfo } from '../lib/layers';
import { invalidateResults, useResults } from '../lib/results';
import { canBeStudioTile, sortStudioTiles } from '../lib/tiles';
import { errorMessage, useAsync } from '../lib/useAsync';
import type { ClayPart, Combo, ComboFilters, Layer } from '../types';
import { NotFoundPage } from './NotFoundPage';

const browseLink = (filters: ComboFilters) => `/?${paramsFromFilters(filters)}`;

/** One clay of a mix: "50% Reclaim", or "1 part Craft Crank (20%)" when it was given in parts. */
function mixShare(c: ClayPart) {
  if (c.parts) return `${partsLabel(c.parts)} ${c.name}${c.percent ? ` (${c.percent}%)` : ''}`;
  return c.percent ? `${c.percent}% ${c.name}` : c.name;
}

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
 * as /c/<id> for one person's result (shown first). A studio test tile at
 * /c/<id> gets a page of its own: the tile, then the glaze's other tiles.
 */
export function ComboPage() {
  const { id, key } = useParams();
  const { user, isStudioAdmin } = useAuth();
  const navigate = useNavigate();
  const { results, error, retry } = useResults();
  const [deleting, setDeleting] = useState<Combo | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

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
  // Studio test tiles (one per clay and kiln, so there can be many) get a compact strip;
  // members' results are shown in full below it.
  const studioTiles = sortStudioTiles(
    group.results.filter((r) => r.official),
    CLAYS,
  );
  const memberResults = group.results.filter((r) => !r.official);
  const people = new Set(memberResults.map((r) => r.userId)).size;
  // Opened from Test tiles or a glaze's page. Members' results with the glaze are on the glaze's page.
  const tileView = !!id && canBeStudioTile(group.layers) && studioTiles.some((t) => t.id === id);
  const openTile = full.data?.find((c) => c.id === id && c.official);
  // The result you followed a link to comes first, then newest first.
  const combos = (full.data ?? [])
    .filter((c) => !c.official)
    .sort((a, b) => Number(b.id === id) - Number(a.id === id) || b.createdAt.localeCompare(a.createdAt));
  const byline = [
    memberResults.length &&
      `${memberResults.length} ${memberResults.length === 1 ? 'result' : 'results'} from ${people} ${people === 1 ? 'member' : 'members'}`,
    studioTiles.length && `${studioTiles.length} studio test ${studioTiles.length === 1 ? 'tile' : 'tiles'}`,
  ]
    .filter(Boolean)
    .join(' · ');

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

  // Your own result, or (for the studio team) removing someone else's shared post.
  const mine = deleting?.userId === user?.id;
  const canRemove = (c: Combo) => isStudioAdmin && c.userId !== user?.id && !c.isPrivate;
  // The team can also move someone's post of one glaze to the test tiles, or back.
  const canMove = (c: Combo) => canRemove(c) && (c.official || canBeStudioTile(c.layers));

  async function onMove(c: Combo) {
    setMoving(true);
    try {
      await backend.setStudioTile(c.id, !c.official);
      invalidateResults();
      retry();
      full.reload();
      showSnackbar(c.official ? 'Moved to Browse' : 'Moved to test tiles');
    } catch (err) {
      showSnackbar(`Couldn't move it: ${errorMessage(err)}`);
    } finally {
      setMoving(false);
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
      showSnackbar(mine ? 'Result deleted' : 'Post removed');
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (tileView) {
        if (idx > 0)
          navigate(-1); // back to the tiles
        else navigate('/tiles', { replace: true });
      } else if (group.results.length > 1) {
        navigate(comboLink(group.key), { replace: true });
        retry();
      } else {
        navigate(mine ? `/u/${deleting.userId}` : '/', { replace: true });
      }
    } catch (err) {
      setDeleteError(`Couldn't delete: ${errorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }

  const dialog = (
    <Dialog
      open={deleting !== null}
      headline={mine ? 'Delete your result?' : `Remove ${deleting?.author?.displayName ?? 'this member'}’s post?`}
      onClose={() => !busy && setDeleting(null)}
      actions={
        <>
          <button type="button" className="btn btn-text" onClick={() => setDeleting(null)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-text btn-danger" onClick={onDelete} disabled={busy}>
            {busy ? 'Deleting…' : mine ? 'Delete' : 'Remove'}
          </button>
        </>
      }
    >
      <p>
        {mine ? 'Your' : 'Their'} photos and notes will be removed for good.
        {group.results.length > 1 && !tileView && ' Other members’ results for this combo stay.'}
      </p>
      {deleteError && (
        <p className="form-error" role="alert">
          {deleteError}
        </p>
      )}
    </Dialog>
  );

  if (tileView) {
    const others = studioTiles.filter((t) => t.id !== id);
    return (
      <article className="combo-group">
        <h1 className="page-title">{title}</h1>
        <section className="results" aria-label="Studio test tile">
          {full.error && <p className="form-error">Couldn't load this tile: {full.error}</p>}
          {openTile ? (
            <ResultBlock
              combo={openTile}
              highlighted={false}
              isOwner={user?.id === openTile.userId}
              canRemove={canRemove(openTile)}
              onDelete={() => setDeleting(openTile)}
              onMove={canMove(openTile) ? () => onMove(openTile) : undefined}
              moving={moving}
            />
          ) : (
            !full.error && <div className="spinner" aria-label="Loading" />
          )}
        </section>
        {others.length > 0 && (
          <section className="studio-tiles" aria-labelledby="other-tiles-h">
            <h2 id="other-tiles-h" className="section-title">
              Other {title} tiles
            </h2>
            <TileStrip tiles={others} replace />
          </section>
        )}
        <p className="tiles-glaze-link">
          <Link to={glazeLink(title)}>
            Combos with {title}
            <Icon name="chevron_right" />
          </Link>
        </p>
        {dialog}
      </article>
    );
  }

  // One layer needs no numbering or order.
  const single = group.layers.length === 1;

  return (
    <article className="combo-group">
      <div className="combo-overview">
        <header>
          <h1 className="page-title">{title}</h1>
          <p className="byline">{byline}</p>
        </header>

        <section aria-labelledby="layers-h">
          <h2 id="layers-h" className="section-title">
            {single ? layerTypeInfo(group.layers[0].type).label : sectionTitle(group.layers)}
            {!single && <span className="section-hint"> in the order applied</span>}
          </h2>
          <ul className="list">
            {group.layers.map((layer, i) => (
              <li key={i}>
                {/* A glaze opens its own page (test tiles and combos); slips and oxides open Browse. */}
                <Link
                  to={layer.type === 'glaze' ? glazeLink(layer.name) : browseLink({ [layer.type]: layer.name })}
                  className="list-item"
                >
                  {!single && <span className="list-avatar">{i + 1}</span>}
                  <span className="list-text">
                    <span className="list-headline">{layer.name}</span>
                    <span className="list-supporting">
                      {layerTypeInfo(layer.type).label}
                      {!isStudioMaterial(layer) && ` · not a studio ${layerTypeInfo(layer.type).label.toLowerCase()}`}
                    </span>
                  </span>
                  <Icon name="chevron_right" className="list-trailing" />
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

      <section className="results" aria-label="Results">
        {full.error && <p className="form-error">Couldn't load the results: {full.error}</p>}
        {studioTiles.length > 0 && (
          <div className="studio-tiles">
            <h2 className="section-title">Studio test tiles</h2>
            <TileStrip tiles={studioTiles} />
          </div>
        )}
        {memberResults.length > 0 && (
          <h2 className="section-title">
            {memberResults.length === 1 ? 'Result' : 'Results'}
            {studioTiles.length > 0 && <span className="section-hint"> from members</span>}
          </h2>
        )}
        {full.loading && !full.data && <div className="spinner" aria-label="Loading" />}
        {combos.map((combo) => (
          <ResultBlock
            key={combo.id}
            combo={combo}
            highlighted={combo.id === id && memberResults.length > 1}
            isOwner={user?.id === combo.userId}
            canRemove={canRemove(combo)}
            onDelete={() => setDeleting(combo)}
            onMove={canMove(combo) ? () => onMove(combo) : undefined}
            moving={moving}
          />
        ))}
      </section>

      {dialog}
    </article>
  );
}

function ResultBlock({
  combo,
  highlighted,
  isOwner,
  canRemove,
  onDelete,
  onMove,
  moving = false,
}: {
  combo: Combo;
  highlighted: boolean;
  isOwner: boolean;
  /** The studio team can remove other people's shared posts. */
  canRemove: boolean;
  onDelete: () => void;
  /** The studio team can move someone's post to the test tiles, or back. */
  onMove?: () => void;
  moving?: boolean;
}) {
  const applied = combo.layers.filter((l) => l.application);
  return (
    <article
      className={`result${highlighted ? ' highlight' : ''}`}
      aria-label={`Result by ${combo.author?.displayName}`}
    >
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
        {combo.official && (
          <p className="private-note">
            <Icon name="verified" /> Studio test tile
          </p>
        )}
        {combo.isPrivate && (
          <p className="private-note">
            <Icon name="lock" /> Private: only you can see this
          </p>
        )}

        <div className="chip-row chip-row-wrap" aria-label="Clay and kiln">
          {combo.clays.map((c) => (
            <Link key={c.name} to={browseLink({ clay: c.name })} className="chip chip-assist">
              <Icon name="texture" className="chip-leading chip-icon-primary" />
              <span className="chip-text">{combo.clays.length > 1 ? mixShare(c) : c.name}</span>
            </Link>
          ))}
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
        {canRemove && (
          <div className="actions">
            {onMove && (
              <button type="button" className="btn btn-outlined" onClick={onMove} disabled={moving}>
                <Icon name={combo.official ? 'grid_view' : 'grid_on'} />{' '}
                {combo.official ? 'Move to Browse' : 'Move to test tiles'}
              </button>
            )}
            <button type="button" className="btn btn-text btn-danger" onClick={onDelete}>
              <Icon name="delete" /> Remove (studio team)
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
