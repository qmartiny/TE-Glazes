// "Add a combo" opens the photo picker first, then the form. The picked files
// wait here in between (same page, so they don't need saving anywhere).
let pending: File[] = [];

export function handOffPhotos(files: File[]): void {
  pending = files;
}

export function peekHandedOffPhotos(): File[] {
  return pending;
}

export function clearHandedOffPhotos(): void {
  pending = [];
}
