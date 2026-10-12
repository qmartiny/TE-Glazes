import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ComboList } from '../components/ComboList';
import { FilterBar } from '../components/FilterBar';
import { APP_TAGLINE } from '../config';
import { backend } from '../lib/api';
import { computeFacets, filtersFromParams, hasFilters, matchesFilters, paramsFromFilters } from '../lib/filters';
import { useAsync } from '../lib/useAsync';
import type { ComboFilters } from '../types';

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const { user } = useAuth();
  const facetRows = useAsync(() => backend.listFacetRows(), [user?.id]);
  const profiles = useAsync(() => backend.listProfiles(), []);

  const rows = facetRows.data;
  const facets = rows ? computeFacets(rows, filters) : null;
  const total = rows?.filter((r) => matchesFilters(r, filters)).length;
  // flushSync: apply right away so a quick second tap builds on the new filters, not the old ones.
  const setFilters = (next: ComboFilters) =>
    setParams(paramsFromFilters(next), { replace: true, flushSync: true });

  return (
    <>
      <section className="intro">
        <h1>Glaze combinations</h1>
        <p className="muted">{APP_TAGLINE}. Filter by glaze, clay, firing or potter.</p>
      </section>

      <FilterBar filters={filters} facets={facets} profiles={profiles.data ?? []} onChange={setFilters} />
      {total !== undefined && (
        <p className="result-count">
          {total} {total === 1 ? 'combo' : 'combos'}
        </p>
      )}

      <ComboList
        filters={filters}
        empty={
          hasFilters(filters) ? (
            <div className="empty">
              <p>No combos match these filters.</p>
              <button className="btn" onClick={() => setFilters({})}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="empty">
              <p>No combos yet — be the first to share one!</p>
              <Link to="/new" className="btn btn-primary">
                Add a combo
              </Link>
            </div>
          )
        }
      />
    </>
  );
}
