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

export type LayerType = 'glaze' | 'slip' | 'oxide';

/** One glaze, slip or oxide in a combination. Layers are ordered: index 0 goes on first. */
export interface Layer {
  type: LayerType;
  name: string;
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

/** One clay in what a piece was made of: a single clay, or part of a mix (e.g. 50% Craft Crank). */
export interface ClayPart {
  name: string;
  /** Share of the mix, 1–100. Null for a single clay, or when the mix wasn't measured. */
  percent: number | null;
}

export interface Combo {
  id: string;
  userId: string;
  author: Pick<Profile, 'id' | 'displayName' | 'studio'> | null;
  /** Usually one clay; several for a mix. */
  clays: ClayPart[];
  firing: Firing;
  layers: Layer[];
  description: string | null;
  photos: Photo[];
  isPrivate: boolean;
  /** A studio test tile, posted by the studio team (shown on the Test tiles page, not in Browse). */
  official: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComboInput {
  clays: ClayPart[];
  firing: Firing;
  layers: Layer[];
  description: string | null;
  photos: Photo[];
  isPrivate: boolean;
  official: boolean;
}

export interface ComboFilters {
  /** Free text, matched against notes, clay and layer names. */
  q?: string;
  /** Matches a clay on its own or as part of a mix. */
  clay?: string;
  glaze?: string;
  slip?: string;
  oxide?: string;
  firing?: Firing;
  user?: string;
}

/**
 * One member's post, without the heavy fields. Posts with the same layers in
 * the same order are grouped into a combo (see groupResults()).
 */
export type ResultSummary = Pick<
  Combo,
  'id' | 'userId' | 'clays' | 'firing' | 'layers' | 'description' | 'photos' | 'isPrivate' | 'official' | 'createdAt'
>;

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
