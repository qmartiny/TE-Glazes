import { Link } from 'react-router';
import { MEMBERS_ONLY } from '../config';

/** What's stored, who sees it and how to delete it. */
export function PrivacyPage() {
  return (
    <article className="narrow prose">
      <h1 className="page-title">Privacy</h1>

      <h2 className="section-title">What’s stored</h2>
      <ul>
        <li>
          Your email and password, to sign in. Passwords are handled by our database provider (Supabase) and never
          visible to anyone.
        </li>
        <li>Your name, studio and “about you”, if you add them.</li>
        <li>What you post: photos, clays, glazes, kiln and notes.</li>
      </ul>

      <h2 className="section-title">Who can see it</h2>
      <ul>
        <li>
          {MEMBERS_ONLY ? 'Only signed-in members' : 'Anyone with the link'} can see members’ names, studios and shared
          posts.
        </li>
        <li>Private posts are only shown to you.</li>
        <li>
          Photos are stored under long random links, so they can’t be found without signing in, but anyone given an
          exact image link could open it.
        </li>
        <li>Your email is never shown.</li>
      </ul>

      <h2 className="section-title">Photos</h2>
      <p>
        Photos are resized on your phone before they’re uploaded, which also removes their location and camera details.
      </p>

      <h2 className="section-title">Visits</h2>
      <p>
        We count visits with Cloudflare Web Analytics, which doesn’t use cookies or follow you to other sites. No ads.
        Your browser keeps you signed in and remembers settings like the theme.
      </p>

      <h2 className="section-title">Deleting</h2>
      <ul>
        <li>Delete a post from its page.</li>
        <li>
          Delete your account in <Link to="/account">Settings</Link>: your profile, posts and photos are removed for
          good.
        </li>
        <li>The studio team can remove posts that break the studio’s rules.</li>
      </ul>

      <h2 className="section-title">Who runs this</h2>
      <p>Members of the studio community. It’s not an official studio site. Questions? Ask the studio team.</p>
    </article>
  );
}
