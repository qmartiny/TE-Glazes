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
import { normalizeLayers } from '../layers';
import type { Backend } from './backend';

const BUCKET = 'photos';
const COMBO_SELECT = '*, author:profiles(id, display_name, studio)';
const RESULT_SELECT = 'id, user_id, title, clay, firing, layers, photos, is_private, created_at';
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
  title: string | null;
  clay: string;
  firing: Firing;
  layers: unknown; // see normalizeLayers()
  description: string | null;
  photos: Photo[];
  is_private: boolean;
  created_at: string;
  updated_at: string;
  author: Pick<ProfileRow, 'id' | 'display_name' | 'studio'> | null;
}

type ResultRow = Pick<
  ComboRow,
  'id' | 'user_id' | 'title' | 'clay' | 'firing' | 'layers' | 'photos' | 'is_private' | 'created_at'
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
    title: row.title,
    clay: row.clay,
    firing: row.firing,
    layers: normalizeLayers(row.layers),
    description: row.description,
    photos: row.photos ?? [],
    isPrivate: row.is_private,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromInput(input: ComboInput) {
  return {
    title: input.title,
    clay: input.clay,
    firing: input.firing,
    layers: input.layers,
    description: input.description,
    photos: input.photos,
    is_private: input.isPrivate,
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

    async signUp({ email, password, displayName, studio }) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, studio }, emailRedirectTo: siteUrl() },
      });
      fail(error);
      return !data.session;
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
          title: r.title,
          clay: r.clay,
          firing: r.firing,
          layers: normalizeLayers(r.layers),
          photos: r.photos ?? [],
          isPrivate: r.is_private,
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
