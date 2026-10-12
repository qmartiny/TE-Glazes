import { Link } from 'react-router';
import { backend } from '../lib/api';
import { comboTitle, firingLabel } from '../lib/filters';
import type { Combo } from '../types';
import { LockIcon } from './Icons';

export function ComboCard({ combo, showAuthor = true }: { combo: Combo; showAuthor?: boolean }) {
  const cover = combo.photos[0];
  return (
    <Link to={`/c/${combo.id}`} className="card">
      <div className="card-img">
        {cover ? (
          <img src={backend.photoUrl(cover.thumb)} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="card-noimg">No photo</div>
        )}
        {combo.isPrivate && (
          <span className="badge badge-private">
            <LockIcon /> Private
          </span>
        )}
        {combo.photos.length > 1 && <span className="badge badge-count">{combo.photos.length} photos</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{comboTitle(combo)}</h3>
        {combo.title && (
          <p className="card-glazes">{combo.layers.map((l) => l.glaze).join(' + ')}</p>
        )}
        <p className="card-meta">
          {combo.clay} · {firingLabel(combo.firing)}
        </p>
        {showAuthor && combo.author && <p className="card-author">{combo.author.displayName}</p>}
      </div>
    </Link>
  );
}
