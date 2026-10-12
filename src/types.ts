export type Firing = 'oxidation' | 'reduction';

export interface Profile {
  id: string;
  displayName: string;
  studio: string | null;
  bio: string | null;
  createdAt: string;
}

export interface ProfileInput {
  displayName: string;
  studio: string | null;
  bio: string | null;
}

/** One glaze in a combination. Layers are ordered: index 0 goes on first. */
export interface GlazeLayer {
  glaze: string;
  application: string | null;
}

/**
 * A stored photo. `path`/`thumb` are backend-specific references; turn them
 * into URLs with `backend.photoUrl()`.
 */
export interface Photo {
  path: string;
  thumb: string;
  width: number;
  height: number;
}

export interface Combo {
  id: string;
  userId: string;
  author: Pick<Profile, 'id' | 'displayName' | 'studio'> | null;
  title: string | null;
  clay: string;
  firing: Firing;
  studio: string | null;
  layers: GlazeLayer[];
  description: string | null;
  photos: Photo[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComboInput {
  title: string | null;
  clay: string;
  firing: Firing;
  studio: string | null;
  layers: GlazeLayer[];
  description: string | null;
  photos: Photo[];
  isPrivate: boolean;
}

export interface ComboFilters {
  clay?: string;
  glaze?: string;
  firing?: Firing;
  studio?: string;
  user?: string;
}

/** Lightweight row used to build filter dropdowns with counts. */
export interface FacetRow {
  userId: string;
  clay: string;
  firing: Firing;
  studio: string | null;
  layers: GlazeLayer[];
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  studio: string | null;
}

/** A photo that has been resized in the browser and is ready to upload. */
export interface PreparedPhoto {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}
