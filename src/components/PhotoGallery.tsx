import { useRef, useState, type CSSProperties } from 'react';
import { backend } from '../lib/api';
import type { Photo } from '../types';

/** Swipeable photo strip (scroll-snap), with dots. Tap a photo for full size. */
export function PhotoGallery({ photos, alt }: { photos: Photo[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (!photos.length) return null;

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (i: number) => {
    const el = track.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  // Size the frame to the cover photo (within reason) so it isn't letterboxed.
  const cover = photos[0];
  const ratio = Math.min(1.5, Math.max(0.75, cover.width / cover.height || 1));

  return (
    <div className="gallery">
      <div
        className="gallery-track"
        ref={track}
        onScroll={onScroll}
        style={{ '--ratio': ratio } as CSSProperties}
      >
        {photos.map((photo, i) => {
          const url = backend.photoUrl(photo.path);
          return (
            <a key={i} className="gallery-item" href={url} target="_blank" rel="noreferrer">
              <img
                src={url}
                width={photo.width}
                height={photo.height}
                alt={photos.length > 1 ? `${alt} — photo ${i + 1} of ${photos.length}` : alt}
                decoding="async"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </a>
          );
        })}
      </div>
      {photos.length > 1 && (
        <div className="gallery-dots">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === index ? 'active' : ''}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
