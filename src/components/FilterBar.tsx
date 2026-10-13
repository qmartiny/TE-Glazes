import { useEffect, useRef } from 'react';
import { CLAYS, FIRINGS, GLAZES, OXIDES, SLIPS } from '../config';
import {
  buildOptions,
  hasFilters,
  paramsFromFilters,
  type FacetKey,
  type Facets,
  type FilterKey,
  type Option,
} from '../lib/filters';
import type { ComboFilters, Profile } from '../types';
import { Icon } from './Icon';

interface ChipProps {
  label: string;
  value: string | undefined;
  valueLabel?: string;
  options: Option[];
  onChange: (value: string | undefined) => void;
}

/** M3 filter chip with a menu: a native <select> laid over the chip opens the phone's picker. */
function FilterChip({ label, value, valueLabel, options, onChange }: ChipProps) {
  return (
    <label className={`chip chip-filter${value ? ' selected' : ''}`}>
      {value && <Icon name="check" className="chip-leading" />}
      <span className="chip-text">{value ? (valueLabel ?? value) : label}</span>
      <Icon name="arrow_drop_down" className="chip-trailing" />
      <select aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Any {label.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
    </label>
  );
}

interface Props {
  filters: ComboFilters;
  facets: Facets | null;
  profiles: Profile[];
  onChange: (filters: ComboFilters) => void;
  /** Only combos made from the studio's glazes, slips and oxides. */
  studioOnly: boolean;
  onStudioOnly: (only: boolean) => void;
}

export function FilterBar({ filters, facets, profiles, onChange, studioOnly, onStudioOnly }: Props) {
  // When filters change, scroll the chips back to the start so the active ones are in view.
  const row = useRef<HTMLDivElement>(null);
  const key = paramsFromFilters(filters).toString();
  useEffect(() => {
    row.current?.scrollTo({ left: 0 });
  }, [key]);
  const empty = new Map<string, number>();
  const counts = (key: FacetKey) => facets?.[key] ?? empty;
  const set = (key: FilterKey) => (value: string | undefined) => onChange({ ...filters, [key]: value });

  const firingOptions = FIRINGS.map((f) => ({ value: f.value, label: f.label, count: counts('firing').get(f.value) ?? 0 }));
  const userOptions = profiles
    .filter((p) => counts('user').has(p.id) || p.id === filters.user)
    .map((p) => ({ value: p.id, label: p.displayName, count: counts('user').get(p.id) ?? 0 }));
  const selectedUser = profiles.find((p) => p.id === filters.user);

  return (
    <div className="chip-row" role="group" aria-label="Filters" ref={row}>
      {filters.q && (
        <button
          type="button"
          className="chip chip-filter selected"
          aria-label={`Remove search for “${filters.q}”`}
          onClick={() => onChange({ ...filters, q: undefined })}
        >
          <Icon name="search" className="chip-leading" />
          <span className="chip-text">“{filters.q}”</span>
          <Icon name="close" className="chip-trailing" />
        </button>
      )}
      <button
        type="button"
        className={`chip chip-filter${studioOnly ? ' selected' : ''}`}
        aria-pressed={studioOnly}
        onClick={() => onStudioOnly(!studioOnly)}
      >
        {studioOnly && <Icon name="check" className="chip-leading" />}
        <span className="chip-text">Studio glazes only</span>
      </button>
      <FilterChip
        label="Glaze"
        value={filters.glaze}
        options={buildOptions(GLAZES, counts('glaze'), filters.glaze)}
        onChange={set('glaze')}
      />
      <FilterChip
        label="Clay"
        value={filters.clay}
        options={buildOptions(CLAYS, counts('clay'), filters.clay)}
        onChange={set('clay')}
      />
      <FilterChip
        label="Kiln"
        value={filters.firing}
        valueLabel={FIRINGS.find((f) => f.value === filters.firing)?.label}
        options={firingOptions}
        onChange={set('firing')}
      />
      <FilterChip
        label="Slip"
        value={filters.slip}
        options={buildOptions(SLIPS, counts('slip'), filters.slip)}
        onChange={set('slip')}
      />
      <FilterChip
        label="Oxide"
        value={filters.oxide}
        options={buildOptions(OXIDES, counts('oxide'), filters.oxide)}
        onChange={set('oxide')}
      />
      <FilterChip
        label="Potter"
        value={filters.user}
        valueLabel={selectedUser?.displayName ?? 'Potter'}
        options={userOptions}
        onChange={set('user')}
      />
      {hasFilters(filters) && (
        <button type="button" className="chip chip-assist" onClick={() => onChange({})}>
          <Icon name="close" className="chip-leading" />
          <span className="chip-text">Clear</span>
        </button>
      )}
    </div>
  );
}
