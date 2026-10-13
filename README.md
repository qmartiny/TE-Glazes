# Glaze Book

A small, mobile-friendly website where members of a pottery studio share the glaze combinations they use: think a very simplified [Glazy](https://glazy.org/) for one community.

- **Share a result**: tap + and it goes straight to your photos (or camera) to pick pictures of pieces or test tiles. Then the form asks, in the order you make it, for the clay (or a mix, e.g. 50% Craft Crank + 50% Reclaim), the glazes, slips and oxides in the order applied (with how each was applied), electric or gas kiln, and notes like "Glaze 1 dipped, glaze 2 poured on top, runny!" The glaze and clay pickers list the studio's own in alphabetical order; type a few letters to narrow them down. Anything else (a commercial underglaze, say) can be typed in and used as it is: it's marked "not a studio glaze" and has no studio test tiles. Names other members have already typed are suggested too ("Used by members"), and typing one with different capitals or spacing takes the same spelling, so the same product groups together.
- **One page per combo**: results with the same layers in the same order (e.g. Tenmoku, then Midnight Blue) are grouped, like recipes with many people's photos on Glazy. Each member's photos, clay, kiln and notes stay as their own result, so you can compare the same combo on different clays and kilns. The reverse order is a separate combo. "Add your result" on a combo page starts a post with the same layers, and the form says when your layers match a combo that already has results.
- **Studio test tiles**: the studio fires a tile of every glaze on every clay, in both kilns. The Test tiles tab shows one kiln at a time, **by clay** (pick a clay and see every glaze on it side by side, including which are still missing) or **by glaze** (one glaze on every clay). The tab remembers where you left off, and starts on the clay you post with. Tapping a tile opens that glaze's page, where all its studio tiles sit in a strip (one per clay and kiln) above members' results. Only the studio team can post tiles (see below), and after each one the form goes straight back to the grid for the next. Tiles stay off Browse and out of profiles' glaze logs.
- **A page for each glaze**, like a material page on Glazy: tap a glaze on any combo page to see the studio's test tiles of it (one per clay and kiln) and every combo members have made with it.
- **Search** from one box: as you type, it suggests glazes, slips, oxides, clays, kilns and members (with how many combos each has), and picking one sets that filter. Pressing enter searches the notes instead, e.g. "runny" or "crawled".
- **Browse and filter** by glaze, slip or oxide, clay, kiln (electric or gas) or potter. Browse starts on **Studio glazes only** (combos made only from the studio's glazes, slips and oxides) and says how many more use other glazes; tap the chip to see everything. A combo shows up when at least one result matches (clay and kiln must match the same result). A clay mix shows up under each of its clays. Combos are named after their layers. Filters and searches live in the URL, so a filtered view can be shared as a link.
- **Profiles**: name and studio, plus each person's glazes. Once you're signed in, "Sign in" in the menu becomes **My profile** (with your initials): **My glazes**, your own glaze log with everything you've posted, shared and private, plus Settings and Sign out. Settings has your profile and a light/dark theme (Auto follows your phone or computer; the choice is saved on that device). Mark a result **private** to keep it as a personal note only you can see.
- Anyone with the link can browse. You need an account to post.

It's a static site (React + Vite) backed by [Supabase](https://supabase.com) (free tier) for accounts, data and photo storage. Photos are shrunk in the browser before upload (about 1600px, a few hundred KB), so phone photos upload fast and storage stays small.

## Try it now (demo mode)

```bash
npm install
VITE_DEMO=true npm run dev
```

In **demo mode** the site comes with a few sample combos and studio test tiles, and anything you add is saved in your own browser only. Everyone counts as studio team there, so you can try adding tiles. That's handy for trying it out or tweaking the design. It's also what you get if no Supabase key is set in `src/config.ts`.

## Put it online for the studio

About 15 minutes, all free.

### 1. Create the database (Supabase)

1. Sign up at [supabase.com](https://supabase.com) and create a new project (choose the London region).
2. Open **SQL Editor**, paste in the whole of [`supabase/schema.sql`](supabase/schema.sql), and press **Run**. This creates the tables, the photo storage bucket and the access rules. It's safe to run again later.
3. Go to **Authentication → Sign In / Providers → Email**:
   - The simplest option is to switch **Confirm email** off. People can then sign up and start posting straight away.
   - If you want email confirmation or **password-reset emails**, set up custom SMTP under **Authentication → Emails** (for example with [Resend](https://resend.com)'s free tier). Supabase's built-in email sender is only meant for testing and won't reliably reach your members.
4. Go to **Authentication → URL Configuration**. Set **Site URL** to your site's address (step 3 below) and add `https://YOUR-SITE-ADDRESS/**` under **Redirect URLs**.
5. Under **Project Settings → API Keys**, copy the **Project URL** and the **anon / publishable key** (never the secret / service_role key). The anon key is meant to be public; the access rules in the database protect the data.

### 2. Connect the site to it

Put the Project URL and the anon / publishable key into `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of [`src/config.ts`](src/config.ts). (Alternatively set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as environment variables, or as GitHub Actions variables under **Settings → Secrets and variables → Actions → Variables**; those override `config.ts`.)

### 3. Publish the site (GitHub Pages)

1. In this GitHub repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push or merge to `main`. The workflow runs the tests, builds the site and publishes it at `https://<your-github-username>.github.io/TE-Glazes/`.

GitHub Pages on a private repository needs a paid GitHub plan. Netlify, Vercel or Cloudflare Pages work just as well: build command `npm run build`, output folder `dist`.

On a phone, members can use **Share → Add to Home Screen** to get an app-like icon.

## Add the studio team (test tiles)

Studio test tiles can only be posted by people on the studio team. To add someone, have them sign up first, then run this in the **SQL Editor** with their email:

```sql
insert into public.studio_admins (user_id)
select id from auth.users where email = 'someone@example.com';
```

To remove them: `delete from public.studio_admins where user_id = (select id from auth.users where email = 'someone@example.com');`

The team then gets an **Add tile** button on the Test tiles page for every glaze that doesn't have a tile yet on the chosen clay and kiln (it opens the photo picker, then a form already set to that glaze, clay and kiln). That form has a **Studio test tile** switch (already on); it also shows when editing a tile, but not on the team's own posts made with +.

## Make it yours

Edit [`src/config.ts`](src/config.ts) to change:

- the studio's **glazes, slips, oxides and clay bodies**
- the studio locations people can pick on their profile, and application methods (dipped, poured, …)
- the site name

These lists fill the pickers and filters, in alphabetical order. People can also type a name that isn't listed and pick **Use "…"**; those count as not the studio's own, so they're left out of Browse's Studio glazes only view and get no studio test tiles.

## Good to know

- **Free tier**: Supabase's free plan includes 1 GB of file storage (thousands of resized photos) and 500 MB of database. Free projects are paused after a week with no activity; you can resume one from the Supabase dashboard.
- **Grouping happens in the browser.** The site loads a short summary of every post (including notes, for search) to group, filter and search them, which is quick for a studio's worth of posts, even thousands. Typed-in names group when they match ignoring capitals and spaces, and a typed name that matches a studio one becomes the studio's spelling.
- **Updating**: when an update changes the database (the pull request will say so), run [`supabase/schema.sql`](supabase/schema.sql) again in the SQL Editor *before* merging. It keeps existing posts and fills in anything new.
- **Private results** are hidden from everyone else in the app. Their photo files sit in a public bucket under long random names, so they can't be found by browsing, but anyone given the exact image link could open it.
- **Members only?** To require sign-in just to browse, change the two `select` policies in `schema.sql` (on `profiles` and `combinations`) to `to authenticated`, then re-run it.
- **Password reset links** must be opened on the same device and browser that requested them.

## Development

```bash
npm run dev        # local dev server, using the Supabase project in src/config.ts
VITE_DEMO=true npm run dev   # same, but with demo data kept in your browser
npm test           # unit tests
npm run build      # type-check and build to dist/
```

`.env.local` (see `.env.example`) overrides the Supabase settings in `config.ts`, e.g. to point local development at a separate test project.

```
src/
  config.ts            studio lists: glazes, clays, studios, …
  pages/               browse, test tiles, combo detail, add/edit form, profile, settings, sign in
  components/          cards, filter pills, photo picker, clay and glaze layer editors, …
  lib/api/             data layer: supabase.ts (real) and local.ts (demo mode)
  lib/image.ts         in-browser photo resizing
supabase/schema.sql    tables, storage bucket and access rules
```
