import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { normName } from '../lib/layers';
import { matchOptions } from '../lib/search';
import { Icon } from './Icon';

interface Props {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  required?: boolean;
  /** Overrides the visible label for screen readers (e.g. "Layer 2: slip"). */
  'aria-label'?: string;
  /**
   * Lets people use a name that isn't listed, e.g. a commercial underglaze.
   * The text says what that means, e.g. "Not a studio glaze".
   */
  custom?: string;
}

interface Item {
  value: string;
  custom: boolean;
}

/**
 * A searchable dropdown: tap to see the whole list, or type a few letters to
 * narrow it down. With `custom`, anything typed can be used as it is.
 */
export function PickerField({ id, label, value, options, onChange, required, custom, ...rest }: Props) {
  const [text, setText] = useState(value);
  // What's been typed since the field was opened; null shows the whole list.
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const picking = useRef(false);
  const listId = useId();

  // Follow changes from outside (e.g. the Test tiles page switching clay) unless typing.
  useEffect(() => {
    if (document.activeElement !== input.current) setText(value);
  }, [value]);

  useEffect(() => {
    list.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const typed = (query ?? '').trim();
  const listed = (name: string) => options.find((o) => normName(o) === normName(name));
  const items: Item[] = (typed ? matchOptions(typed, options) : options).map((o) => ({ value: o, custom: false }));
  if (custom !== undefined && typed && !listed(typed)) items.push({ value: typed, custom: true });
  const showList = open && items.length > 0;

  function pick(item: Item) {
    picking.current = true;
    setText(item.value);
    onChange(item.value);
    setQuery(null);
    setOpen(false);
    setActive(-1);
    input.current?.blur(); // hide the phone keyboard
    picking.current = false;
  }

  /** Leaving the field: a typed name that matches a listed one becomes that one; anything else stays (if allowed). */
  function commit() {
    if (picking.current || query === null) return;
    const name = text.trim();
    const match = listed(name);
    if (match) {
      setText(match);
      onChange(match);
    } else if (custom !== undefined) {
      setText(name);
      onChange(name);
    } else {
      setText(value);
    }
    setQuery(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && showList) {
      e.preventDefault(); // don't submit the form
      const item = items[active >= 0 ? active : 0];
      if (item && (active >= 0 || typed)) pick(item);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const isCustom = custom !== undefined && value.trim() !== '' && !listed(value);

  return (
    <div className="picker">
      <div className="picker-field">
        <label className="tf">
          <input
            ref={input}
            id={id}
            type="text"
            role="combobox"
            aria-label={rest['aria-label']}
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={80}
            required={required}
            placeholder=" "
            value={text}
            onFocus={(e) => {
              setQuery(null);
              setOpen(true);
              setActive(-1);
              e.currentTarget.setSelectionRange(0, e.currentTarget.value.length);
            }}
            onClick={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              commit();
            }}
            onChange={(e) => {
              setText(e.target.value);
              setQuery(e.target.value);
              setOpen(true);
              setActive(e.target.value.trim() ? 0 : -1);
              if (custom !== undefined) onChange(e.target.value);
            }}
            onKeyDown={onKeyDown}
          />
          <span className="tf-label">
            {label}
            {required && ' *'}
          </span>
          <Icon name="arrow_drop_down" className="tf-trailing" />
        </label>
        {showList && (
          // preventDefault keeps focus in the input, so a tap picks before the list closes
          <ul
            ref={list}
            id={listId}
            role="listbox"
            className="search-menu picker-menu"
            onMouseDown={(e) => e.preventDefault()}
          >
            {items.map((item, i) => (
              <li
                key={`${item.custom ? '+' : ''}${item.value}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : undefined}
                onClick={() => pick(item)}
              >
                {item.custom && <Icon name="add" />}
                <span className="search-option-label">{item.custom ? `Use “${item.value}”` : item.value}</span>
                {item.custom && <span className="search-option-meta">{custom}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {isCustom && <span className="tf-supporting">{custom}</span>}
    </div>
  );
}
