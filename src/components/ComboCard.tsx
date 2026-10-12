import { Link } from 'react-router';
import { backend } from '../lib/api';
import { comboTitle, firingLabel } from '../lib/filters';
import { layerLabel } from '../lib/layers';
import type { Combo } from '../types';
import { Icon } from './Icon';

export function ComboCard({ combo, showAuthor = true }: { combo: Combo; showAuthor?: boolean }) {
  const cover = combo.photos[0];
  return (
    <Link to={`/c/${combo.id}`} className="card combo-card">
      <div className="card-media">
        {cover ? (
          <img src={backend.photoUrl(cover.thumb)} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="card-noimg">No photo</div>
        )}
        {combo.isPrivate && (
          <span className="media-badge media-badge-start">
            <Icon name="lock" /> Private
          </span>
        )}
        {combo.photos.length > 1 && (
          <span className="media-badge media-badge-end">
            <Icon name="photo_library" /> {combo.photos.length}
          </span>
        )}
      </div>
      <div className="card-content">
        <h3 className="card-title">{comboTitle(combo)}</h3>
        {combo.title && <p className="card-text">{combo.layers.map(layerLabel).join(' + ')}</p>}
        <p className="card-text">
          {combo.clay} · {firingLabel(combo.firing)}
        </p>
        {showAuthor && combo.author && <p className="card-author">{combo.author.displayName}</p>}
      </div>
    </Link>
  );
}
