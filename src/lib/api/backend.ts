import type {
  AuthUser,
  Combo,
  ComboInput,
  Photo,
  PreparedPhoto,
  Profile,
  ProfileInput,
  ResultSummary,
  SignUpInput,
} from '../../types';

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
  /** Whether new accounts need the studio's sign-up code. */
  signupCodeRequired(): Promise<boolean>;
  /** Checks a sign-up code before signing up, so the form can say if it's wrong. */
  checkSignupCode(code: string): Promise<boolean>;
  /**
   * Removes the signed-in member's photos, posts, profile and account for good.
   * Call signOut() afterwards (after leaving pages that need signing in).
   */
  deleteAccount(): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;

  getProfile(id: string): Promise<Profile | null>;
  listProfiles(): Promise<Profile[]>;
  saveProfile(id: string, input: ProfileInput): Promise<Profile>;
  /** Whether this member can post studio test tiles. */
  isStudioAdmin(userId: string): Promise<boolean>;

  /** Every post the viewer can see, without notes or author details. Newest first. */
  listResults(): Promise<ResultSummary[]>;
  getCombo(id: string): Promise<Combo | null>;
  getCombos(ids: string[]): Promise<Combo[]>;
  createCombo(userId: string, input: ComboInput): Promise<Combo>;
  updateCombo(id: string, input: ComboInput): Promise<Combo>;
  deleteCombo(combo: Combo): Promise<void>;

  uploadPhoto(userId: string, photo: PreparedPhoto): Promise<Photo>;
  deletePhotos(photos: Photo[]): Promise<void>;
  photoUrl(path: string): string;
}
