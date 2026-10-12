import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ClayEditor, newClay, type ClayDraft } from '../components/ClayEditor';
import { LayerEditor, newLayer, type LayerDraft } from '../components/LayerEditor';
import { existingPhoto, PhotoPicker, type PhotoDraft } from '../components/PhotoPicker';
import { TextArea } from '../components/Fields';
import { Icon } from '../components/Icon';
import { showSnackbar } from '../components/Snackbar';
import { FIRINGS } from '../config';
import { backend } from '../lib/api';
import { mixProblem, normalizeClays } from '../lib/clays';
import { comboKey, layerLabel } from '../lib/layers';
import { invalidateResults, useResults } from '../lib/results';
import { readPref, writePref } from '../lib/format';
import { clearHandedOffPhotos, peekHandedOffPhotos } from '../lib/photoHandoff';
import { errorMessage, useAsync } from '../lib/useAsync';
import type { ClayPart, Combo, ComboInput, Firing, Photo } from '../types';
import { NotFoundPage } from './NotFoundPage';

interface LastUsed {
  clays?: ClayPart[];
  clay?: string; // saved before clay mixes
}

export function ComboFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const existing = useAsync(() => (id ? backend.getCombo(id) : Promise.resolve(null)), [id]);
  // "Add your result" on a combo page passes ?like=<post> to start with the same layers;
  // "Add tile" on the Test tiles page passes ?tile=<glaze>&clay=<clay>&firing=<kiln>.
  const like = id ? null : params.get('like');
  const tile = id || like ? null : params.get('tile');
  const tileFiring = FIRINGS.find((f) => f.value === params.get('firing'))?.value;
  const tileClay = params.get('clay') ?? undefined;
  const template = useAsync(() => (like ? backend.getCombo(like) : Promise.resolve(null)), [like]);

  if (id) {
    if (existing.loading) return <div className="spinner" aria-label="Loading" />;
    if (existing.error) return <div className="notice notice-error">{existing.error}</div>;
    if (!existing.data) return <NotFoundPage what="combo" />;
    if (existing.data.userId !== user?.id) {
      return <div className="notice">You can only edit your own combos.</div>;
    }
  }
  if (like && template.loading) return <div className="spinner" aria-label="Loading" />;
  return (
    <ComboForm
      key={id ?? `new-${like ?? ''}-${tile ?? ''}`}
      initial={id ? (existing.data ?? null) : null}
      template={like ? (template.data ?? null) : null}
      tile={tile ? { glaze: tile, clay: tileClay, firing: tileFiring } : null}
    />
  );
}

interface TileStart {
  glaze: string;
  clay?: string;
  firing?: Firing;
}

function ComboForm({
  initial,
  template,
  tile,
}: {
  initial: Combo | null;
  template: Combo | null;
  tile: TileStart | null;
}) {
  const { user, isStudioAdmin } = useAuth();
  const navigate = useNavigate();
  const last = initial ? null : readPref<LastUsed>('last');

  const [photos, setPhotos] = useState<PhotoDraft[]>(() => initial?.photos.map(existingPhoto) ?? []);
  // Photos picked before the form opened, from the + button or "Add your result".
  const [handedOff] = useState(() => (initial ? [] : peekHandedOffPhotos()));
  useEffect(() => clearHandedOffPhotos(), []);
  const [layers, setLayers] = useState<LayerDraft[]>(() =>
    initial
      ? initial.layers.map((l) => newLayer(l.type, l.name, l.application ?? ''))
      : template
        ? template.layers.map((l) => newLayer(l.type, l.name))
        : tile
          ? [newLayer('glaze', tile.glaze)]
          : [newLayer()],
  );
  const [clays, setClays] = useState<ClayDraft[]>(() => {
    const start =
      initial?.clays ?? (tile?.clay ? [{ name: tile.clay, percent: null }] : normalizeClays(last?.clays, last?.clay));
    return start.length ? start.map((c) => newClay(c.name, start.length > 1 ? c.percent : null)) : [newClay()];
  });
  const [firing, setFiring] = useState<Firing>(initial?.firing ?? tile?.firing ?? FIRINGS[0].value);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [official, setOfficial] = useState(initial?.official ?? (tile !== null && isStudioAdmin));
  const canPostTiles = isStudioAdmin || official;
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tell people when their layers match a combo others have already posted.
  const { results } = useResults();
  const named = layers.filter((l) => l.name.trim());
  const draftKey = named.length && named.length === layers.length ? comboKey(named) : null;
  const sameCombo =
    draftKey && results
      ? results.filter((r) => r.id !== initial?.id && !r.official && comboKey(r.layers) === draftKey)
      : [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const cleanLayers = layers
      .map((l) => ({ type: l.type, name: l.name.trim(), application: l.application || null }))
      .filter((l) => l.name);
    if (!photos.length) return setError('Add at least one photo of the result.');
    const cleanClays: ClayPart[] = clays
      .map((c) => ({ name: c.name.trim(), percent: clays.length > 1 && c.percent ? Number(c.percent) : null }))
      .filter((c) => c.name);
    if (!cleanClays.length) return setError('Choose the clay.');
    if (cleanClays.length < clays.length) return setError('Choose each clay in the mix, or remove the empty one.');
    const mixError = mixProblem(cleanClays.map((c) => c.percent));
    if (mixError) return setError(mixError);
    if (!cleanLayers.length) return setError('Add at least one glaze, slip or oxide.');
    if (official && (cleanLayers.length !== 1 || cleanLayers[0].type !== 'glaze')) {
      return setError('A studio test tile is one glaze on its own.');
    }

    setError(null);
    const uploaded: Photo[] = [];
    try {
      const finalPhotos: Photo[] = [];
      const toUpload = photos.filter((p) => p.kind === 'new').length;
      for (const draft of photos) {
        if (draft.kind === 'existing') {
          finalPhotos.push(draft.photo);
          continue;
        }
        setStatus(`Uploading photo ${uploaded.length + 1} of ${toUpload}…`);
        const photo = await backend.uploadPhoto(user.id, draft.prepared);
        uploaded.push(photo);
        finalPhotos.push(photo);
      }

      setStatus('Saving…');
      const input: ComboInput = {
        clays: cleanClays,
        firing,
        layers: cleanLayers,
        description: description.trim() || null,
        photos: finalPhotos,
        isPrivate: isPrivate && !official,
        official,
      };
      const saved = initial ? await backend.updateCombo(initial.id, input) : await backend.createCombo(user.id, input);

      if (initial) {
        const kept = new Set(finalPhotos.map((p) => p.path));
        await backend.deletePhotos(initial.photos.filter((p) => !kept.has(p.path)));
      }
      if (!input.official) writePref('last', { clays: input.clays } satisfies LastUsed);
      invalidateResults();
      if (tile && input.official && !initial) {
        // Back to the tiles, ready for the next one.
        showSnackbar(`${input.layers[0].name} tile added`);
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx > 0) navigate(-1);
        else
          navigate(`/tiles?${new URLSearchParams({ clay: input.clays[0].name, firing: input.firing })}`, {
            replace: true,
          });
      } else {
        navigate(`/c/${saved.id}`, { replace: true });
      }
    } catch (err) {
      await backend.deletePhotos(uploaded).catch(() => undefined);
      setError(`Couldn't save: ${errorMessage(err)}`);
      setStatus(null);
    }
  }

  const saving = status !== null;

  return (
    <form className="form" onSubmit={onSubmit}>
      <h1 className="page-title">
        {official
          ? initial
            ? 'Edit studio test tile'
            : 'Add a studio test tile'
          : initial
            ? 'Edit your result'
            : template
              ? 'Add your result'
              : 'Add a combo'}
      </h1>

      {/* Photos first (the + button opens the photo picker), then clay, what went on it and the firing. */}
      <fieldset disabled={saving}>
        <section className="form-section">
          <h2 className="section-title">Photos</h2>
          <p className="section-supporting">Finished pieces or test tiles. The first photo is the cover.</p>
          <PhotoPicker photos={photos} onChange={setPhotos} initialFiles={handedOff} />
        </section>

        <section className="form-section">
          <h2 className="section-title">Clay</h2>
          <ClayEditor clays={clays} onChange={setClays} />
        </section>

        <section className="form-section">
          <h2 className="section-title">Glazes, slips &amp; oxides</h2>
          <p className="section-supporting">
            In the order you applied them. Add a slip or oxide only if you used one; one that went under the glaze
            comes before it.
          </p>
          <LayerEditor layers={layers} onChange={setLayers} />
          {sameCombo.length > 0 && (
            <p className="info-banner" role="status">
              <Icon name="photo_library" />
              <span>
                {layers.map(layerLabel).join(' + ')} already has {sameCombo.length}{' '}
                {sameCombo.length === 1 ? 'result' : 'results'} from members. Yours will be added to the same combo,
                so people can compare.
              </span>
            </p>
          )}
        </section>

        <section className="form-section">
          <h2 className="section-title">Kiln</h2>
          <div className="segmented" role="radiogroup" aria-label="Kiln">
            {FIRINGS.map((f) => (
              <label key={f.value} className={`segment${firing === f.value ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="firing"
                  value={f.value}
                  checked={firing === f.value}
                  onChange={() => setFiring(f.value)}
                />
                {firing === f.value && <Icon name="check" />}
                {f.label}
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2 className="section-title">Notes</h2>
          <TextArea
            label="How you did it"
            rows={5}
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            supportingText="e.g. Tenmoku dipped 3 sec, Midnight Blue poured over the top. Careful, runny!"
          />
          {canPostTiles && (
            <label className="switch-row">
              <span className="switch-text">
                <span>Studio test tile</span>
                <span className="switch-supporting">
                  Shows on the Test tiles page instead of Browse. One glaze on its own.
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={official}
                onChange={(e) => setOfficial(e.target.checked)}
              />
            </label>
          )}
          {!official && (
            <label className="switch-row">
              <span className="switch-text">
                <span>Keep private</span>
                <span className="switch-supporting">Only you can see it. Handy for your own notes.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
            </label>
          )}
        </section>
      </fieldset>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <Link to={initial ? `/c/${initial.id}` : '/'} className="btn btn-text">
          Cancel
        </Link>
        <button type="submit" className="btn btn-filled" disabled={saving}>
          {status ?? (initial ? 'Save changes' : official ? 'Add tile' : isPrivate ? 'Save combo' : 'Share combo')}
        </button>
      </div>
      {saving && <div className="linear-progress" role="progressbar" aria-label={status ?? 'Saving'} />}
    </form>
  );
}
