import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { AddComboButton } from '../components/AddComboButton';
import { CardGrid, GridSkeleton, GroupCard, LoadError } from '../components/Cards';
import { FilterBar } from '../components/FilterBar';
import { Icon } from '../components/Icon';
import { SearchBox } from '../components/SearchBox';
import { backend } from '../lib/api';
import { computeFacets, filterGroups, filtersFromParams, groupResults, hasFilters, paramsFromFilters } from '../lib/filters';
import { useResults } from '../lib/results';
import { useAsync } from '../lib/useAsync';
import type { ComboFilters } from '../types';

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const { results, error, retry } = useResults();
  const profiles = useAsync(() => backend.listProfiles(), []);

  // Studio test tiles have their own page.
  const groups = useMemo(() => (results ? groupResults(results.filter((r) => !r.official)) : null), [results]);
  const filtersKey = paramsFromFilters(filters).toString();
  const shown = useMemo(() => (groups ? filterGroups(groups, filters) : null), [groups, filters]);
  const facets = useMemo(() => (groups ? computeFacets(groups, filters) : null), [groups, filters]);
  const names = useMemo(() => new Map((profiles.data ?? []).map((p) => [p.id, p.displayName])), [profiles.data]);

  // flushSync: apply right away so a quick second tap builds on the new filters, not the old ones.
  const setFilters = (next: ComboFilters) =>
    setParams(paramsFromFilters(next), { replace: true, flushSync: true });

  let body;
  if (error && !shown) body = <LoadError error={error} retry={retry} />;
  else if (!shown) body = <GridSkeleton />;
  else if (!shown.length)
    body = hasFilters(filters) ? (
      <div className="empty">
        <Icon name="search_off" className="empty-icon" />
        <p>No combos match {filters.q ? 'this search' : 'these filters'}.</p>
        <button className="btn btn-tonal" onClick={() => setFilters({})}>
          Clear filters
        </button>
      </div>
    ) : (
      <div className="empty">
        <Icon name="palette" className="empty-icon" />
        <p>No combos yet. Be the first to share one!</p>
        <AddComboButton className="btn btn-filled">
          <Icon name="add" /> Add a combo
        </AddComboButton>
      </div>
    );
  else
    body = (
      <CardGrid
        items={shown}
        listKey={`browse|${filtersKey}`}
        itemKey={(item) => item.group.key}
        render={(item) => <GroupCard group={item.group} results={item.results} names={names} />}
      />
    );

  return (
    <>
      <section className="intro">
        <h1 className="page-title">Glaze combinations</h1>
      </section>

      <SearchBox
        facets={facets}
        names={names}
        filters={filters}
        onPick={(key, value) => setFilters({ ...filters, [key]: value })}
      />
      <FilterBar filters={filters} facets={facets} profiles={profiles.data ?? []} onChange={setFilters} />
      {shown && (
        <p className="result-count">
          {shown.length} {shown.length === 1 ? 'combo' : 'combos'}
        </p>
      )}
      {body}
    </>
  );
}
