import { useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { backend } from '../lib/api';
import type { Photo } from '../types';
import { Icon } from './Icon';

/**
 * Opens the photos full screen, like a shop's product photos: pinch or double-tap
 * to zoom into the glaze, drag to look around, swipe between photos, swipe down
 * or tap ✕ to close. The viewer is only downloaded the first time it's used.
 */
async function openViewer(photos: Photo[], alt: (i: number) => string, index: number, track: HTMLDivElement) {
  const [{ default: PhotoSwipe }] = await Promise.all([import('photoswipe'), import('photoswipe/style.css')]);
  const imgs = [...track.querySelectorAll('img')];
  const pswp = new PhotoSwipe({
    dataSource: photos.map((photo, i) => {
      const src = backend.photoUrl(photo.path);
      return { src, msrc: src, width: photo.width, height: photo.height, alt: alt(i), element: imgs[i] };
    }),
    index,
    bgOpacity: 0.95,
    showHideAnimationType: 'zoom',
    closeTitle: 'Close',
    zoomTitle: 'Zoom',
    arrowPrevTitle: 'Previous photo',
    arrowNextTitle: 'Next photo',
    indexIndicatorSep: ' of ',
    errorMsg: 'This photo couldn’t be loaded.',
    returnFocus: false, // done below, on the photo you ended on
  });
  // The strip shows photos whole (letterboxed), so zoom from where the photo actually is.
  pswp.addFilter('thumbBounds', (bounds, _item, i) => {
    const img = imgs[i];
    const photo = photos[i];
    if (!img || !photo) return bounds!; // PhotoSwipe fades instead when there are none
    const r = img.getBoundingClientRect();
    const scale = Math.min(r.width / photo.width, r.height / photo.height);
    const w = photo.width * scale;
    return { x: r.left + (r.width - w) / 2, y: r.top + (r.height - photo.height * scale) / 2, w };
  });
  // Close on the photo you ended on.
  pswp.on('close', () => track.scrollTo({ left: pswp.currIndex * track.clientWidth }));
  pswp.on('destroy', () => track.querySelectorAll('a')[pswp.currIndex]?.focus({ preventScroll: true }));
  pswp.init();
}

/** Swipeable photo strip (scroll-snap), with dots. Tap a photo to zoom in. */
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
  const photoAlt = (i: number) => (photos.length > 1 ? `${alt} — photo ${i + 1} of ${photos.length}` : alt);
  const onOpen = (e: MouseEvent, i: number) => {
    // Ctrl/⌘-click still opens the image itself in a new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || !track.current) return;
    e.preventDefault();
    openViewer(photos, photoAlt, i, track.current).catch(() => window.open(backend.photoUrl(photos[i].path)));
  };

  // Size the frame to the cover photo (within reason) so it isn't letterboxed.
  const cover = photos[0];
  const ratio = Math.min(1.5, Math.max(0.75, cover.width / cover.height || 1));

  return (
    <div className="gallery">
      <div className="gallery-track" ref={track} onScroll={onScroll} style={{ '--ratio': ratio } as CSSProperties}>
        {photos.map((photo, i) => {
          const url = backend.photoUrl(photo.path);
          return (
            <a
              key={i}
              className="gallery-item"
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Zoom in: ${photoAlt(i)}`}
              onClick={(e) => onOpen(e, i)}
            >
              <img
                src={url}
                width={photo.width}
                height={photo.height}
                alt={photoAlt(i)}
                decoding="async"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              <span className="gallery-zoom">
                <Icon name="zoom_in" />
              </span>
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
