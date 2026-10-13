import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { AddComboButton } from '../components/AddComboButton';
import { CardGrid, GridSkeleton, GroupCard, LoadError } from '../components/Cards';
import { FilterBar } from '../components/FilterBar';
import { Icon } from '../components/Icon';
import { SearchBox } from '../components/SearchBox';
import { backend } from '../lib/api';
import { computeFacets, filterGroups, filtersFromParams, groupResults, hasFilters, paramsFromFilters } from '../lib/filters';
import { usesStudioMaterialsOnly } from '../lib/layers';
import { useResults } from '../lib/results';
import { useAsync } from '../lib/useAsync';
import type { ComboFilters } from '../types';

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const { results, error, retry } = useResults();
  const profiles = useAsync(() => backend.listProfiles(), []);

  // Studio glazes only, unless the link says ?glazes=all.
  const allGlazes = params.get('glazes') === 'all';

  // Studio test tiles have their own page. Combos with a custom glaze, slip or oxide are kept apart.
  const [studioGroups, otherGroups] = useMemo(() => {
    if (!results) return [null, null];
    const posts = results.filter((r) => !r.official);
    return [
      groupResults(posts.filter((r) => usesStudioMaterialsOnly(r.layers))),
      groupResults(posts.filter((r) => !usesStudioMaterialsOnly(r.layers))),
    ];
  }, [results]);
  const groups = useMemo(
    () => (studioGroups && otherGroups ? (allGlazes ? [...studioGroups, ...otherGroups] : studioGroups) : null),
    [studioGroups, otherGroups, allGlazes],
  );
  const filtersKey = `${paramsFromFilters(filters)}|${allGlazes}`;
  const shown = useMemo(
    () =>
      groups
        ? filterGroups(groups, filters).sort((a, b) =>
            b.group.results[0].createdAt.localeCompare(a.group.results[0].createdAt),
          )
        : null,
    [groups, filters],
  );
  // How many more would show with other glazes, so nobody wonders where theirs went.
  const hidden = useMemo(
    () => (!allGlazes && otherGroups ? filterGroups(otherGroups, filters).length : 0),
    [allGlazes, otherGroups, filters],
  );
  const facets = useMemo(() => (groups ? computeFacets(groups, filters) : null), [groups, filters]);
  const names = useMemo(() => new Map((profiles.data ?? []).map((p) => [p.id, p.displayName])), [profiles.data]);

  // flushSync: apply right away so a quick second tap builds on the new filters, not the old ones.
  const setFilters = (next: ComboFilters, all = allGlazes) => {
    const p = paramsFromFilters(next);
    if (all) p.set('glazes', 'all');
    setParams(p, { replace: true, flushSync: true });
  };
  const showAll = (
    <button type="button" className="link-btn" onClick={() => setFilters(filters, true)}>
      {hidden} more with other glazes
    </button>
  );

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
        {hidden > 0 && showAll}
      </div>
    ) : (
      <div className="empty">
        <Icon name="palette" className="empty-icon" />
        <p>No combos yet.</p>
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
      <FilterBar
        filters={filters}
        facets={facets}
        profiles={profiles.data ?? []}
        onChange={setFilters}
        studioOnly={!allGlazes}
        onStudioOnly={(only) => setFilters(filters, !only)}
      />
      {shown && (
        <p className="result-count">
          {shown.length} {shown.length === 1 ? 'combo' : 'combos'}
          {hidden > 0 && shown.length > 0 && <> · {showAll}</>}
        </p>
      )}
      {body}
    </>
  );
}
