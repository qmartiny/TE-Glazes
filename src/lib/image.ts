import type { PreparedPhoto } from '../types';

const FULL_SIZE = 1600;
const THUMB_SIZE = 600;

/** Scale (width, height) down to fit inside a max×max box, never up. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    throw new Error(
      "Couldn't read that photo. Try a JPEG or PNG (on iPhone, pick it from Photos rather than Files).",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
  return img;
}

function render(img: HTMLImageElement, max: number, quality: number) {
  const size = fitWithin(img.naturalWidth, img.naturalHeight, max);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this photo.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // <img> applies the photo's EXIF rotation, so phone photos come out upright.
  ctx.drawImage(img, 0, 0, size.width, size.height);
  return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve({ blob, ...size }) : reject(new Error('Your browser could not process this photo.')),
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Phone photos are often 5–10 MB. Shrink them in the browser before
 * uploading: a 1600px version for the detail view and a 600px thumbnail
 * for the grid. Both are small JPEGs, which keeps storage and data use low.
 */
export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const img = await loadImage(file);
  const full = await render(img, FULL_SIZE, 0.82);
  const thumb = await render(img, THUMB_SIZE, 0.78);
  return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
}
