import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { AddComboButton } from '../components/AddComboButton';
import { CardGrid, GridSkeleton, GroupCard, LoadError } from '../components/Cards';
import { Icon } from '../components/Icon';
import { TileStrip } from '../components/TileStrip';
import { CLAYS, GLAZES } from '../config';
import { backend } from '../lib/api';
import { filterGroups, groupResults, paramsFromFilters } from '../lib/filters';
import { normName } from '../lib/layers';
import { useResults } from '../lib/results';
import { isStudioTile, sortStudioTiles } from '../lib/tiles';
import { useAsync } from '../lib/useAsync';

/**
 * One glaze, like a material page on Glazy: what it looks like on its own
 * (the studio's test tiles) and the combos members have made with it.
 */
export function GlazePage() {
  const { name: param = '' } = useParams();
  const { results, error, retry } = useResults();
  const profiles = useAsync(() => backend.listProfiles(), []);
  const names = useMemo(() => new Map((profiles.data ?? []).map((p) => [p.id, p.displayName])), [profiles.data]);

  const key = normName(param);
  // Show the studio's spelling when it's one of theirs.
  const name = GLAZES.find((g) => normName(g) === key) ?? param;

  const tiles = useMemo(
    () =>
      results
        ? sortStudioTiles(
            results.filter((r) => isStudioTile(r) && normName(r.layers[0].name) === key),
            CLAYS,
          )
        : [],
    [results, key],
  );
  const combos = useMemo(
    () => (results ? filterGroups(groupResults(results.filter((r) => !r.official)), { glaze: name }) : null),
    [results, name],
  );

  let body;
  if (error && !combos) body = <LoadError error={error} retry={retry} />;
  else if (!combos) body = <GridSkeleton />;
  else if (!combos.length)
    body = (
      <div className="empty">
        <Icon name="palette" className="empty-icon" />
        <p>Nobody has shared a combo with {name} yet.</p>
        <AddComboButton className="btn btn-filled">
          <Icon name="add" /> Add a combo
        </AddComboButton>
      </div>
    );
  else
    body = (
      <CardGrid
        items={combos}
        listKey={`glaze|${key}`}
        itemKey={(item) => item.group.key}
        render={(item) => <GroupCard group={item.group} results={item.results} names={names} />}
      />
    );

  return (
    <article className="glaze-page">
      <header className="intro">
        <h1 className="page-title">{name}</h1>
        <p className="section-supporting">Glaze</p>
      </header>

      <section className="studio-tiles" aria-labelledby="glaze-tiles-h">
        <div className="section-head">
          <h2 id="glaze-tiles-h" className="section-title">
            Studio test tiles
          </h2>
          {tiles.length > 0 && (
            <Link to={`/tiles?${new URLSearchParams({ glaze: name })}`} className="section-link">
              See all on Test tiles
            </Link>
          )}
        </div>
        {tiles.length ? (
          <TileStrip tiles={tiles} />
        ) : (
          results && <p className="section-supporting">The studio hasn’t added a test tile of {name} yet.</p>
        )}
      </section>

      <section aria-labelledby="glaze-combos-h">
        <div className="section-head">
          <h2 id="glaze-combos-h" className="section-title">
            Combos with {name}
          </h2>
          {combos && combos.length > 0 && (
            <Link to={`/?${paramsFromFilters({ glaze: name })}`} className="section-link">
              Filter in Browse
            </Link>
          )}
        </div>
        {body}
      </section>
    </article>
  );
}
