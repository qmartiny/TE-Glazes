import type {
  AuthUser,
  Combo,
  ComboFilters,
  ComboInput,
  FacetRow,
  Photo,
  PreparedPhoto,
  Profile,
  ProfileInput,
  SignUpInput,
} from '../../types';

export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

/**
 * Everything the UI needs from storage. Two implementations:
 *  - supabase.ts: the real shared backend
 *  - local.ts:    demo mode, data kept in this browser only
 */
export interface Backend {
  readonly mode: 'supabase' | 'demo';

  getUser(): Promise<AuthUser | null>;
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  /** Resolves to true when the user must confirm their email before signing in. */
  signUp(input: SignUpInput): Promise<boolean>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;

  getProfile(id: string): Promise<Profile | null>;
  listProfiles(): Promise<Profile[]>;
  saveProfile(id: string, input: ProfileInput): Promise<Profile>;

  listCombos(filters: ComboFilters, offset: number, limit: number): Promise<Page<Combo>>;
  getCombo(id: string): Promise<Combo | null>;
  listFacetRows(): Promise<FacetRow[]>;
  createCombo(userId: string, input: ComboInput): Promise<Combo>;
  updateCombo(id: string, input: ComboInput): Promise<Combo>;
  deleteCombo(combo: Combo): Promise<void>;

  uploadPhoto(userId: string, photo: PreparedPhoto): Promise<Photo>;
  deletePhotos(photos: Photo[]): Promise<void>;
  photoUrl(path: string): string;
}
