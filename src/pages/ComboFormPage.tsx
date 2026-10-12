import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ChoiceField } from '../components/ChoiceField';
import { LayerEditor, newLayer, type LayerDraft } from '../components/LayerEditor';
import { existingPhoto, PhotoPicker, type PhotoDraft } from '../components/PhotoPicker';
import { TextArea, TextField } from '../components/Fields';
import { Icon } from '../components/Icon';
import { CLAYS, FIRINGS } from '../config';
import { backend } from '../lib/api';
import { comboKey, layerLabel } from '../lib/layers';
import { invalidateResults, useResults } from '../lib/results';
import { readPref, writePref } from '../lib/format';
import { errorMessage, useAsync } from '../lib/useAsync';
import type { Combo, ComboInput, Firing, Photo } from '../types';
import { NotFoundPage } from './NotFoundPage';

interface LastUsed {
  clay: string;
}

export function ComboFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const existing = useAsync(() => (id ? backend.getCombo(id) : Promise.resolve(null)), [id]);
  // "Add your result" on a combo page passes ?like=<post> to start with the same layers.
  const like = id ? null : params.get('like');
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
      key={id ?? `new-${like ?? ''}`}
      initial={id ? (existing.data ?? null) : null}
      template={like ? (template.data ?? null) : null}
    />
  );
}

function ComboForm({ initial, template }: { initial: Combo | null; template: Combo | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const last = initial ? null : readPref<LastUsed>('last');

  const [photos, setPhotos] = useState<PhotoDraft[]>(() => initial?.photos.map(existingPhoto) ?? []);
  const [layers, setLayers] = useState<LayerDraft[]>(() =>
    initial
      ? initial.layers.map((l) => newLayer(l.type, l.name, l.application ?? ''))
      : template
        ? template.layers.map((l) => newLayer(l.type, l.name))
        : [newLayer()],
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [clay, setClay] = useState(initial?.clay ?? last?.clay ?? '');
  const [firing, setFiring] = useState<Firing>(initial?.firing ?? FIRINGS[0].value);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tell people when their layers match a combo others have already posted.
  const { results } = useResults();
  const named = layers.filter((l) => l.name.trim());
  const draftKey = named.length && named.length === layers.length ? comboKey(named) : null;
  const sameCombo =
    draftKey && results ? results.filter((r) => r.id !== initial?.id && comboKey(r.layers) === draftKey) : [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const cleanLayers = layers
      .map((l) => ({ type: l.type, name: l.name.trim(), application: l.application || null }))
      .filter((l) => l.name);
    if (!photos.length) return setError('Add at least one photo of the result.');
    if (!cleanLayers.length) return setError('Add at least one glaze, slip or oxide.');
    if (!clay.trim()) return setError('Choose the clay.');

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
        title: title.trim() || null,
        clay: clay.trim(),
        firing,
        layers: cleanLayers,
        description: description.trim() || null,
        photos: finalPhotos,
        isPrivate,
      };
      const saved = initial ? await backend.updateCombo(initial.id, input) : await backend.createCombo(user.id, input);

      if (initial) {
        const kept = new Set(finalPhotos.map((p) => p.path));
        await backend.deletePhotos(initial.photos.filter((p) => !kept.has(p.path)));
      }
      writePref('last', { clay: input.clay } satisfies LastUsed);
      invalidateResults();
      navigate(`/c/${saved.id}`, { replace: true });
    } catch (err) {
      await backend.deletePhotos(uploaded).catch(() => undefined);
      setError(`Couldn't save: ${errorMessage(err)}`);
      setStatus(null);
    }
  }

  const saving = status !== null;

  return (
    <form className="form" onSubmit={onSubmit}>
      <h1 className="page-title">{initial ? 'Edit your result' : template ? 'Add your result' : 'Add a combo'}</h1>

      <fieldset disabled={saving}>
        <section className="form-section">
          <h2 className="section-title">Photos</h2>
          <p className="section-supporting">Finished pieces or test tiles. The first photo is the cover.</p>
          <PhotoPicker photos={photos} onChange={setPhotos} />
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
          <h2 className="section-title">Clay &amp; firing</h2>
          <ChoiceField
            id="clay"
            label="Clay"
            value={clay}
            options={CLAYS}
            onChange={setClay}
            placeholder="Choose clay"
            otherLabel="Clay name"
            required
          />
          <div className="segmented" role="radiogroup" aria-label="Firing">
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
          <TextField
            label="Nickname (optional)"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            supportingText="Shown on your result, e.g. Blue rim tenmoku. The combo itself is named after its layers."
          />
          <TextArea
            label="How you did it"
            rows={5}
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            supportingText="e.g. Tenmoku dipped 3 sec, Midnight Blue poured over the top. Careful, runny!"
          />
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
          {status ?? (initial ? 'Save changes' : isPrivate ? 'Save combo' : 'Share combo')}
        </button>
      </div>
      {saving && <div className="linear-progress" role="progressbar" aria-label={status ?? 'Saving'} />}
    </form>
  );
}
