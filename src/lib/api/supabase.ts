import { createClient, type User } from '@supabase/supabase-js';
import type {
  AuthUser,
  Combo,
  ComboInput,
  Firing,
  Photo,
  Profile,
  ResultSummary,
} from '../../types';
import { clayLabel, normalizeClays } from '../clays';
import { normalizeLayers } from '../layers';
import type { Backend } from './backend';

const BUCKET = 'photos';
const COMBO_SELECT = '*, author:profiles(id, display_name, studio)';
// Everything but the author. (`*` also keeps browsing working if a newer column hasn't been added yet.)
const RESULT_SELECT = '*';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProfileRow {
  id: string;
  display_name: string;
  studio: string | null;
  bio: string | null;
  created_at: string;
}

interface ComboRow {
  id: string;
  user_id: string;
  clay: string; // a readable label; `clays` has the details
  clays: unknown; // see normalizeClays()
  firing: Firing;
  layers: unknown; // see normalizeLayers()
  description: string | null;
  photos: Photo[];
  is_private: boolean;
  official?: boolean;
  created_at: string;
  updated_at: string;
  author: Pick<ProfileRow, 'id' | 'display_name' | 'studio'> | null;
}

type ResultRow = Pick<
  ComboRow,
  | 'id'
  | 'user_id'
  | 'clay'
  | 'clays'
  | 'firing'
  | 'layers'
  | 'description'
  | 'photos'
  | 'is_private'
  | 'official'
  | 'created_at'
>;

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    studio: row.studio,
    bio: row.bio,
    createdAt: row.created_at,
  };
}

function toCombo(row: ComboRow): Combo {
  return {
    id: row.id,
    userId: row.user_id,
    author: row.author
      ? { id: row.author.id, displayName: row.author.display_name, studio: row.author.studio }
      : null,
    clays: normalizeClays(row.clays, row.clay),
    firing: row.firing,
    layers: normalizeLayers(row.layers),
    description: row.description,
    photos: row.photos ?? [],
    isPrivate: row.is_private,
    official: row.official ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromInput(input: ComboInput) {
  return {
    clay: clayLabel(input.clays).slice(0, 300),
    clays: input.clays,
    firing: input.firing,
    layers: input.layers,
    description: input.description,
    photos: input.photos,
    is_private: input.isPrivate,
    official: input.official,
  };
}

function toAuthUser(user: User | null | undefined): AuthUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null;
}

/** The address of this page without the #/route, used for email links. */
function siteUrl() {
  return window.location.origin + window.location.pathname;
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  fail(result.error);
  return result.data;
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb = createClient(url, anonKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const bucket = () => sb.storage.from(BUCKET);

  async function deletePhotos(photos: Photo[]) {
    if (!photos.length) return;
    // Best effort: a leftover file costs a little storage, nothing more.
    const { error } = await bucket().remove(photos.flatMap((p) => [p.path, p.thumb]));
    if (error) console.warn('Could not delete photos', error);
  }

  return {
    mode: 'supabase',

    async getUser() {
      const { data } = await sb.auth.getSession();
      return toAuthUser(data.session?.user);
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toAuthUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      fail((await sb.auth.signInWithPassword({ email, password })).error);
    },

    async signUp({ email, password, displayName, studio, code }) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        // The database checks the code before creating the account, and doesn't keep it.
        options: { data: { display_name: displayName, studio, signup_code: code }, emailRedirectTo: siteUrl() },
      });
      if (error?.message.includes('Database error saving new user')) {
        throw new Error("Couldn't create the account. Check the sign-up code.");
      }
      fail(error);
      return !data.session;
    },

    async signupCodeRequired() {
      // Not required if schema.sql hasn't been re-run yet (the function isn't there).
      const { data, error } = await sb.rpc('signup_code_required');
      return !error && data === true;
    },

    async checkSignupCode(code) {
      const { data, error } = await sb.rpc('check_signup_code', { code });
      return error ? true : data === true; // if unsure, let the sign-up itself decide
    },

    async deleteAccount() {
      const { data } = await sb.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) throw new Error('Please sign in first.');
      // Photos first (the database can't remove stored files), then the account,
      // which takes the profile and posts with it.
      for (let round = 0; round < 100; round++) {
        const files = check(await bucket().list(userId, { limit: 100 })) ?? [];
        if (!files.length) break;
        fail((await bucket().remove(files.map((f) => `${userId}/${f.name}`))).error);
      }
      fail((await sb.rpc('delete_my_account')).error);
    },

    async signOut() {
      fail((await sb.auth.signOut()).error);
    },

    async requestPasswordReset(email) {
      fail((await sb.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}#/reset-password` })).error);
    },

    async updatePassword(password) {
      fail((await sb.auth.updateUser({ password })).error);
    },

    async getProfile(id) {
      if (!UUID_RE.test(id)) return null;
      const row = check(await sb.from('profiles').select('*').eq('id', id).maybeSingle());
      return row ? toProfile(row as ProfileRow) : null;
    },

    async listProfiles() {
      const rows = check(await sb.from('profiles').select('*').order('display_name'));
      return (rows as ProfileRow[]).map(toProfile);
    },

    async saveProfile(id, input) {
      const row = check(
        await sb
          .from('profiles')
          .upsert({ id, display_name: input.displayName, studio: input.studio, bio: input.bio })
          .select()
          .single(),
      );
      return toProfile(row as ProfileRow);
    },

    async isStudioAdmin(userId) {
      // Not an admin if the table isn't there yet (schema.sql not re-run).
      const { data, error } = await sb.from('studio_admins').select('user_id').eq('user_id', userId).maybeSingle();
      return !error && data !== null;
    },

    async listResults() {
      // PostgREST returns at most 1000 rows per request, so read in pages.
      const PAGE = 1000;
      const rows: ResultRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const page = check(
          await sb
            .from('combinations')
            .select(RESULT_SELECT)
            .order('created_at', { ascending: false })
            .order('id')
            .range(from, from + PAGE - 1),
        ) as unknown as ResultRow[];
        rows.push(...page);
        if (page.length < PAGE) break;
      }
      return rows.map(
        (r): ResultSummary => ({
          id: r.id,
          userId: r.user_id,
          clays: normalizeClays(r.clays, r.clay),
          firing: r.firing,
          layers: normalizeLayers(r.layers),
          description: r.description,
          photos: r.photos ?? [],
          isPrivate: r.is_private,
          official: r.official ?? false,
          createdAt: r.created_at,
        }),
      );
    },

    async getCombo(id) {
      if (!UUID_RE.test(id)) return null;
      const row = check(await sb.from('combinations').select(COMBO_SELECT).eq('id', id).maybeSingle());
      return row ? toCombo(row as unknown as ComboRow) : null;
    },

    async getCombos(ids) {
      const valid = ids.filter((id) => UUID_RE.test(id));
      if (!valid.length) return [];
      const rows = check(await sb.from('combinations').select(COMBO_SELECT).in('id', valid));
      return (rows as unknown as ComboRow[]).map(toCombo);
    },

    async createCombo(userId, input) {
      const row = check(
        await sb
          .from('combinations')
          .insert({ ...fromInput(input), user_id: userId })
          .select(COMBO_SELECT)
          .single(),
      );
      return toCombo(row as unknown as ComboRow);
    },

    async updateCombo(id, input) {
      const row = check(
        await sb.from('combinations').update(fromInput(input)).eq('id', id).select(COMBO_SELECT).single(),
      );
      return toCombo(row as unknown as ComboRow);
    },

    async deleteCombo(combo) {
      check(await sb.from('combinations').delete().eq('id', combo.id));
      await deletePhotos(combo.photos);
    },

    async uploadPhoto(userId, photo) {
      const id = crypto.randomUUID();
      const path = `${userId}/${id}.jpg`;
      const thumb = `${userId}/${id}_thumb.jpg`;
      const options = { contentType: 'image/jpeg', cacheControl: '31536000' };
      await Promise.all([
        bucket().upload(path, photo.full, options).then((r) => fail(r.error)),
        bucket().upload(thumb, photo.thumb, options).then((r) => fail(r.error)),
      ]);
      return { path, thumb, width: photo.width, height: photo.height };
    },

    deletePhotos,

    photoUrl(path) {
      return bucket().getPublicUrl(path).data.publicUrl;
    },
  };
}
