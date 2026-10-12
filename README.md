# TE Glazes

A small, mobile-friendly website where members of a pottery studio share the glaze combinations they use: think a very simplified [Glazy](https://glazy.org/) for one community.

- **Share a combo**: add photos of pieces or test tiles, the clay, glaze 1, glaze 2, and so on (in the order applied, with how each was applied), oxidation or reduction, and notes like "Glaze 1 dipped, glaze 2 poured on top, runny!"
- **Browse and filter** by glaze (matches any layer), clay, firing, studio or potter. Filters live in the URL, so a filtered view can be shared as a link.
- **Profiles**: name and studio, plus a page listing each person's combos. Mark a combo **private** to keep it as a personal note only you can see.
- Anyone with the link can browse. You need an account to post.

It's a static site (React + Vite) backed by [Supabase](https://supabase.com) (free tier) for accounts, data and photo storage. Photos are shrunk in the browser before upload (about 1600px, a few hundred KB), so phone photos upload fast and storage stays small.

## Try it now (demo mode)

```bash
npm install
npm run dev
```

Without Supabase settings the site runs in **demo mode**: it comes with a few sample combos, and anything you add is saved in your own browser only. That's handy for trying it out or tweaking the design.

## Put it online for the studio

About 15 minutes, all free.

### 1. Create the database (Supabase)

1. Sign up at [supabase.com](https://supabase.com) and create a new project (choose the London region).
2. Open **SQL Editor**, paste in the whole of [`supabase/schema.sql`](supabase/schema.sql), and press **Run**. This creates the tables, the photo storage bucket and the access rules. It's safe to run again later.
3. Go to **Authentication → Sign In / Providers → Email**:
   - The simplest option is to switch **Confirm email** off. People can then sign up and start posting straight away.
   - If you want email confirmation or **password-reset emails**, set up custom SMTP under **Authentication → Emails** (for example with [Resend](https://resend.com)'s free tier). Supabase's built-in email sender is only meant for testing and won't reliably reach your members.
4. Go to **Authentication → URL Configuration**. Set **Site URL** to your site's address (step 2 below) and add `https://YOUR-SITE-ADDRESS/**` under **Redirect URLs**.
5. Under **Project Settings → API Keys**, copy the **Project URL** and the **anon / publishable key**. The anon key is meant to be public; the access rules in the database protect the data.

### 2. Publish the site (GitHub Pages)

1. In this GitHub repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Go to **Settings → Secrets and variables → Actions → Variables** and add:
   - `VITE_SUPABASE_URL`: the Project URL
   - `VITE_SUPABASE_ANON_KEY`: the anon / publishable key
3. Push or merge to `main`. The workflow runs the tests, builds the site and publishes it at `https://<your-github-username>.github.io/TE-Glazes/`.

GitHub Pages on a private repository needs a paid GitHub plan. Netlify, Vercel or Cloudflare Pages work just as well: build command `npm run build`, output folder `dist`, plus the same two environment variables.

On a phone, members can use **Share → Add to Home Screen** to get an app-like icon.

## Make it yours

Edit [`src/config.ts`](src/config.ts) to change:

- the **studio glaze names** (the current list is a placeholder; swap in your studio's actual glazes)
- clay bodies, studio locations, application methods (dipped, poured, …)
- the site name

These lists fill the dropdowns and filters. People can always pick **Other…** and type something that isn't listed, and those values show up in the filters too.

## Good to know

- **Free tier**: Supabase's free plan includes 1 GB of file storage (thousands of resized photos) and 500 MB of database. Free projects are paused after a week with no activity; you can resume one from the Supabase dashboard.
- **Private combos** are hidden from everyone else in the app. Their photo files sit in a public bucket under long random names, so they can't be found by browsing, but anyone given the exact image link could open it.
- **Members only?** To require sign-in just to browse, change the two `select` policies in `schema.sql` (on `profiles` and `combinations`) to `to authenticated`, then re-run it.
- **Password reset links** must be opened on the same device and browser that requested them.

## Development

```bash
npm run dev        # local dev server (demo mode unless .env.local is set)
npm test           # unit tests
npm run build      # type-check and build to dist/
```

To develop against a real Supabase project, copy `.env.example` to `.env.local` and fill in the two values.

```
src/
  config.ts            studio lists: glazes, clays, studios, …
  pages/               browse, combo detail, add/edit form, profile, account, sign in
  components/          cards, filter pills, photo picker, glaze layer editor, …
  lib/api/             data layer: supabase.ts (real) and local.ts (demo mode)
  lib/image.ts         in-browser photo resizing
supabase/schema.sql    tables, storage bucket and access rules
```
