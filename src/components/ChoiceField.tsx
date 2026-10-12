import { useState } from 'react';

const OTHER = '__other__';

interface Props {
  id: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder: string;
  otherPlaceholder?: string;
  required?: boolean;
  'aria-label'?: string;
}

/** A dropdown of the studio's usual options, plus "Other…" to type anything. */
export function ChoiceField({ id, value, options, onChange, placeholder, otherPlaceholder, required, ...rest }: Props) {
  const [custom, setCustom] = useState(() => value !== '' && !options.includes(value));

  return (
    <div className="choice">
      <select
        id={id}
        aria-label={rest['aria-label']}
        value={custom ? OTHER : value}
        required={required && !custom}
        onChange={(e) => {
          const next = e.target.value;
          setCustom(next === OTHER);
          onChange(next === OTHER ? '' : next);
        }}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={OTHER}>Other…</option>
      </select>
      {custom && (
        <input
          type="text"
          value={value}
          required={required}
          maxLength={80}
          autoFocus
          placeholder={otherPlaceholder ?? 'Type a name'}
          aria-label={`${rest['aria-label'] ?? placeholder} (other)`}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
