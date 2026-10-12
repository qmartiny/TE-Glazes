import { useRef, useState, type KeyboardEvent } from 'react';
import type { FacetKey, Facets, FilterKey } from '../lib/filters';
import { KIND_LABELS, suggest } from '../lib/search';
import type { ComboFilters } from '../types';
import { Icon, type IconName } from './Icon';

const KIND_ICONS: Record<FacetKey, IconName> = {
  glaze: 'palette',
  slip: 'water_drop',
  oxide: 'science',
  clay: 'texture',
  firing: 'local_fire_department',
  user: 'account_circle',
};

interface Props {
  facets: Facets | null;
  names: Map<string, string>;
  filters: ComboFilters;
  /** Apply a filter: a glaze, clay, member… or free text ("q"). */
  onPick: (key: FilterKey, value: string) => void;
}

/**
 * M3 search bar with autocomplete. Picking a suggestion sets the matching
 * filter chip; pressing enter on free text searches notes.
 */
export function SearchBox({ facets, names, filters, onPick }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);

  const query = text.trim();
  const suggestions = facets ? suggest(query, facets, names, filters) : [];
  const optionCount = suggestions.length + (query ? 1 : 0); // last option: search notes
  const showList = open && query.length > 0;

  function pick(index: number) {
    const s = suggestions[index];
    if (s) onPick(s.kind, s.value);
    else if (query) onPick('q', query);
    setText('');
    setActive(-1);
    setOpen(false);
    input.current?.blur(); // hide the phone keyboard so the results are visible
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && optionCount) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % optionCount);
    } else if (e.key === 'ArrowUp' && optionCount) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? optionCount - 1 : a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0) pick(active);
      else if (query) pick(suggestions.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="search" role="search">
      <div className="search-bar">
        <Icon name="search" />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-label="Search glazes, clays, members and notes"
          aria-expanded={showList}
          aria-controls="search-options"
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `search-option-${active}` : undefined}
          placeholder="Search glazes, clays, members, notes…"
          autoComplete="off"
          enterKeyHint="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {text && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setText('');
              setActive(-1);
              input.current?.focus();
            }}
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      {showList && (
        // preventDefault keeps focus in the input, so a tap picks before the list closes
        <ul id="search-options" role="listbox" className="search-menu" onMouseDown={(e) => e.preventDefault()}>
          {suggestions.map((s, i) => (
            <li
              key={`${s.kind}:${s.value}`}
              id={`search-option-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              onClick={() => pick(i)}
            >
              <Icon name={KIND_ICONS[s.kind]} />
              <span className="search-option-label">{s.label}</span>
              <span className="search-option-meta">
                {KIND_LABELS[s.kind]} · {s.count} {s.count === 1 ? 'combo' : 'combos'}
              </span>
            </li>
          ))}
          <li
            id={`search-option-${suggestions.length}`}
            role="option"
            aria-selected={active === suggestions.length}
            className={active === suggestions.length ? 'active' : undefined}
            onClick={() => pick(suggestions.length)}
          >
            <Icon name="search" />
            <span className="search-option-label">Search notes for “{query}”</span>
          </li>
        </ul>
      )}
    </div>
  );
}
