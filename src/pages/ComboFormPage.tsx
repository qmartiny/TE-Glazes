import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ChoiceField } from '../components/ChoiceField';
import { invalidateComboCache } from '../components/ComboList';
import { LayerEditor, newLayer, type LayerDraft } from '../components/LayerEditor';
import { existingPhoto, PhotoPicker, type PhotoDraft } from '../components/PhotoPicker';
import { CLAYS, FIRINGS, STUDIOS } from '../config';
import { backend } from '../lib/api';
import { readPref, writePref } from '../lib/format';
import { errorMessage, useAsync } from '../lib/useAsync';
import type { Combo, ComboInput, Firing, Photo } from '../types';
import { NotFoundPage } from './NotFoundPage';

interface LastUsed {
  clay: string;
  firing: Firing;
}

export function ComboFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const existing = useAsync(() => (id ? backend.getCombo(id) : Promise.resolve(null)), [id]);

  if (id) {
    if (existing.loading) return <div className="spinner" aria-label="Loading" />;
    if (existing.error) return <div className="notice notice-error">{existing.error}</div>;
    if (!existing.data) return <NotFoundPage what="combo" />;
    if (existing.data.userId !== user?.id) {
      return <div className="notice">You can only edit your own combos.</div>;
    }
  }
  return <ComboForm key={id ?? 'new'} initial={existing.data ?? null} />;
}

function ComboForm({ initial }: { initial: Combo | null }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const last = initial ? null : readPref<LastUsed>('last');

  const [photos, setPhotos] = useState<PhotoDraft[]>(() => initial?.photos.map(existingPhoto) ?? []);
  const [layers, setLayers] = useState<LayerDraft[]>(() =>
    initial ? initial.layers.map((l) => newLayer(l.glaze, l.application ?? '')) : [newLayer()],
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [clay, setClay] = useState(initial?.clay ?? last?.clay ?? '');
  const [firing, setFiring] = useState<Firing | ''>(initial?.firing ?? last?.firing ?? '');
  const [studio, setStudio] = useState(initial?.studio ?? profile?.studio ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const cleanLayers = layers
      .map((l) => ({ glaze: l.glaze.trim(), application: l.application || null }))
      .filter((l) => l.glaze);
    if (!photos.length) return setError('Add at least one photo of the result.');
    if (!cleanLayers.length) return setError('Add at least one glaze.');
    if (!clay.trim()) return setError('Choose the clay.');
    if (!firing) return setError('Choose oxidation or reduction.');

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
        studio: studio.trim() || null,
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
      writePref('last', { clay: input.clay, firing } satisfies LastUsed);
      invalidateComboCache();
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
      <h1>{initial ? 'Edit combo' : 'Add a combo'}</h1>

      <fieldset disabled={saving}>
        <section className="form-section">
          <h2>Photos</h2>
          <p className="hint">Finished pieces or test tiles. The first photo is the cover.</p>
          <PhotoPicker photos={photos} onChange={setPhotos} />
        </section>

        <section className="form-section">
          <h2>Glazes</h2>
          <p className="hint">In the order you applied them — glaze 1 first, then each one on top.</p>
          <LayerEditor layers={layers} onChange={setLayers} />
        </section>

        <section className="form-section">
          <h2>Clay &amp; firing</h2>
          <label className="field">
            <span>Clay</span>
            <ChoiceField
              id="clay"
              value={clay}
              options={CLAYS}
              onChange={setClay}
              placeholder="Choose clay"
              otherPlaceholder="Clay name"
              required
            />
          </label>
          <div className="field" role="radiogroup" aria-labelledby="firing-label">
            <span id="firing-label">Firing</span>
            <div className="segmented">
              {FIRINGS.map((f) => (
                <label key={f.value} className={firing === f.value ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="firing"
                    value={f.value}
                    checked={firing === f.value}
                    required
                    onChange={() => setFiring(f.value)}
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <label className="field">
            <span>
              Studio <span className="muted">(where it was fired)</span>
            </span>
            <ChoiceField
              id="studio"
              value={studio}
              options={STUDIOS}
              onChange={setStudio}
              placeholder="Not specified"
              otherPlaceholder="Studio name"
            />
          </label>
        </section>

        <section className="form-section">
          <h2>Notes</h2>
          <label className="field">
            <span>
              Name <span className="muted">(optional)</span>
            </span>
            <input
              type="text"
              value={title}
              maxLength={120}
              placeholder={layers.map((l) => l.glaze).filter(Boolean).join(' + ') || 'e.g. Blue rim tenmoku'}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span>How you did it</span>
            <textarea
              rows={5}
              value={description}
              maxLength={2000}
              placeholder="e.g. Tenmoku dipped 3 sec, Chun Blue poured over the top. Careful — runny, keep it well above the foot!"
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <span>
              Keep private <span className="muted">— only you can see it (handy for your own notes)</span>
            </span>
          </label>
        </section>
      </fieldset>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <Link to={initial ? `/c/${initial.id}` : '/'} className="btn btn-ghost">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {status ?? (initial ? 'Save changes' : isPrivate ? 'Save combo' : 'Share combo')}
        </button>
      </div>
    </form>
  );
}
