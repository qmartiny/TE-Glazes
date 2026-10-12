import { Link } from 'react-router';
import { Icon } from '../components/Icon';

export function NotFoundPage({ what = 'page' }: { what?: string }) {
  return (
    <div className="empty">
      <Icon name="search_off" className="empty-icon" />
      <h1 className="page-title">Not found</h1>
      <p>This {what} doesn’t exist, was deleted, or is private.</p>
      <Link to="/" className="btn btn-tonal">
        Back to browsing
      </Link>
    </div>
  );
}
