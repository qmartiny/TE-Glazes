import { Link } from 'react-router';

export function NotFoundPage({ what = 'page' }: { what?: string }) {
  return (
    <div className="empty">
      <h1>Not found</h1>
      <p>This {what} doesn’t exist, was deleted, or is private.</p>
      <Link to="/" className="btn">
        Back to browsing
      </Link>
    </div>
  );
}
