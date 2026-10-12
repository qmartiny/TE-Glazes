import { CLAYS, FIRINGS, GLAZES, OXIDES, SLIPS, STUDIOS } from '../config';
import { buildOptions, hasFilters, type Facets, type FilterKey, type Option } from '../lib/filters';
import type { ComboFilters, Profile } from '../types';

interface PillProps {
  label: string;
  value: string | undefined;
  valueLabel?: string;
  options: Option[];
  onChange: (value: string | undefined) => void;
}

function PillSelect({ label, value, valueLabel, options, onChange }: PillProps) {
  return (
    <label className={`pill${value ? ' pill-active' : ''}`}>
      <span className="pill-text">{value ? (valueLabel ?? value) : label}</span>
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
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
}

export function FilterBar({ filters, facets, profiles, onChange }: Props) {
  const empty = new Map<string, number>();
  const counts = (key: FilterKey) => facets?.[key] ?? empty;
  const set = (key: FilterKey) => (value: string | undefined) => onChange({ ...filters, [key]: value });

  const firingOptions = FIRINGS.map((f) => ({ value: f.value, label: f.label, count: counts('firing').get(f.value) ?? 0 }));
  const userOptions = profiles
    .filter((p) => counts('user').has(p.id) || p.id === filters.user)
    .map((p) => ({ value: p.id, label: p.displayName, count: counts('user').get(p.id) ?? 0 }));
  const selectedUser = profiles.find((p) => p.id === filters.user);

  return (
    <div className="filterbar" role="group" aria-label="Filters">
      <PillSelect
        label="Glaze"
        value={filters.glaze}
        options={buildOptions(GLAZES, counts('glaze'), filters.glaze)}
        onChange={set('glaze')}
      />
      <PillSelect
        label="Clay"
        value={filters.clay}
        options={buildOptions(CLAYS, counts('clay'), filters.clay)}
        onChange={set('clay')}
      />
      <PillSelect
        label="Firing"
        value={filters.firing}
        valueLabel={FIRINGS.find((f) => f.value === filters.firing)?.label}
        options={firingOptions}
        onChange={set('firing')}
      />
      <PillSelect
        label="Slip"
        value={filters.slip}
        options={buildOptions(SLIPS, counts('slip'), filters.slip)}
        onChange={set('slip')}
      />
      <PillSelect
        label="Oxide"
        value={filters.oxide}
        options={buildOptions(OXIDES, counts('oxide'), filters.oxide)}
        onChange={set('oxide')}
      />
      {STUDIOS.length > 1 && (
        <PillSelect
          label="Studio"
          value={filters.studio}
          options={buildOptions(STUDIOS, counts('studio'), filters.studio)}
          onChange={set('studio')}
        />
      )}
      <PillSelect
        label="Potter"
        value={filters.user}
        valueLabel={selectedUser?.displayName ?? 'Potter'}
        options={userOptions}
        onChange={set('user')}
      />
      {hasFilters(filters) && (
        <button type="button" className="pill pill-clear" onClick={() => onChange({})}>
          Clear
        </button>
      )}
    </div>
  );
}
