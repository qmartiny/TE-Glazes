import { useEffect, useRef, useState } from 'react';
import { MAX_PHOTOS } from '../config';
import { backend } from '../lib/api';
import { preparePhoto } from '../lib/image';
import { errorMessage } from '../lib/useAsync';
import type { Photo, PreparedPhoto } from '../types';
import { CameraIcon, CloseIcon } from './Icons';

export type PhotoDraft =
  | { key: string; kind: 'existing'; photo: Photo }
  | { key: string; kind: 'new'; prepared: PreparedPhoto; preview: string };

let nextKey = 0;
export const existingPhoto = (photo: Photo): PhotoDraft => ({ key: `p${nextKey++}`, kind: 'existing', photo });

interface Props {
  photos: PhotoDraft[];
  onChange: (photos: PhotoDraft[]) => void;
}

export function PhotoPicker({ photos, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Free the in-memory previews when they're no longer shown.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const live = new Set(photos.flatMap((p) => (p.kind === 'new' ? [p.preview] : [])));
    for (const url of previews.current) if (!live.has(url)) URL.revokeObjectURL(url);
    previews.current = live;
  }, [photos]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const room = MAX_PHOTOS - photos.length;
    const picked = [...files].slice(0, room);
    const added: PhotoDraft[] = [];
    try {
      for (const file of picked) {
        const prepared = await preparePhoto(file);
        added.push({ key: `p${nextKey++}`, kind: 'new', prepared, preview: URL.createObjectURL(prepared.thumb) });
      }
      if (files.length > room) setError(`You can add up to ${MAX_PHOTOS} photos.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      onChange([...photos, ...added]);
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  const makeCover = (i: number) => onChange([photos[i], ...photos.filter((_, j) => j !== i)]);

  return (
    <div>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <div key={p.key} className="photo-tile">
            <img src={p.kind === 'new' ? p.preview : backend.photoUrl(p.photo.thumb)} alt={`Photo ${i + 1}`} />
            <button
              type="button"
              className="photo-remove"
              aria-label={`Remove photo ${i + 1}`}
              disabled={busy}
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
            >
              <CloseIcon />
            </button>
            {i === 0 ? (
              <span className="photo-cover">Cover</span>
            ) : (
              <button
                type="button"
                className="photo-cover photo-cover-btn"
                disabled={busy}
                onClick={() => makeCover(i)}
              >
                Make cover
              </button>
            )}
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className={`photo-add${busy ? ' busy' : ''}`}>
            <CameraIcon />
            <span>{busy ? 'Preparing…' : photos.length ? 'Add more' : 'Add photos'}</span>
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
