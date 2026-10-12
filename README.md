# Glaze Book

A small, mobile-friendly website where members of a pottery studio share the glaze combinations they use: think a very simplified [Glazy](https://glazy.org/) for one community.

- **Share a result**: add photos of pieces or test tiles, the clay, the glazes, slips and oxides in the order applied (with how each was applied), electric or gas kiln, and notes like "Glaze 1 dipped, glaze 2 poured on top, runny!"
- **One page per combo**: results with the same layers in the same order (e.g. Tenmoku, then Midnight Blue) are grouped, like recipes with many people's photos on Glazy. Each member's photos, clay, kiln and notes stay as their own result, so you can compare the same combo on different clays and kilns. The reverse order is a separate combo. "Add your result" on a combo page starts a post with the same layers, and the form says when your layers match a combo that already has results.
- **Search** from one box: as you type, it suggests glazes, slips, oxides, clays, kilns and members (with how many combos each has), and picking one sets that filter. Pressing enter searches the notes instead, e.g. "runny" or "crawled".
- **Browse and filter** by glaze, slip or oxide, clay, kiln (electric or gas) or potter. A combo shows up when at least one result matches (clay and kiln must match the same result). Combos are named after their layers. Filters and searches live in the URL, so a filtered view can be shared as a link.
- **Profiles**: name and studio, plus a page listing each person's results. Mark a result **private** to keep it as a personal note only you can see.
- Anyone with the link can browse. You need an account to post.

It's a static site (React + Vite) backed by [Supabase](https://supabase.com) (free tier) for accounts, data and photo storage. Photos are shrunk in the browser before upload (about 1600px, a few hundred KB), so phone photos upload fast and storage stays small.

## Try it now (demo mode)

```bash
npm install
VITE_DEMO=true npm run dev
```

In **demo mode** the site comes with a few sample combos, and anything you add is saved in your own browser only. That's handy for trying it out or tweaking the design. It's also what you get if no Supabase key is set in `src/config.ts`.

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

## Make it yours

Edit [`src/config.ts`](src/config.ts) to change:

- the studio's **glazes, slips, oxides and clay bodies**
- the studio locations people can pick on their profile, and application methods (dipped, poured, …)
- the site name

These lists fill the dropdowns and filters. People can always pick **Other…** and type something that isn't listed, and those values show up in the filters too.

## Good to know

- **Free tier**: Supabase's free plan includes 1 GB of file storage (thousands of resized photos) and 500 MB of database. Free projects are paused after a week with no activity; you can resume one from the Supabase dashboard.
- **Grouping happens in the browser.** The site loads a short summary of every post (including notes, for search) to group, filter and search them, which is quick for a studio's worth of posts, even thousands. Typed-in "Other…" names group when they match ignoring capitals and spaces.
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
  pages/               browse, combo detail, add/edit form, profile, account, sign in
  components/          cards, filter pills, photo picker, glaze layer editor, …
  lib/api/             data layer: supabase.ts (real) and local.ts (demo mode)
  lib/image.ts         in-browser photo resizing
supabase/schema.sql    tables, storage bucket and access rules
```
