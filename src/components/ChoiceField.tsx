import { useState } from 'react';
import { SelectField, TextField } from './Fields';

const OTHER = '__other__';

interface Props {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder: string;
  otherLabel?: string;
  required?: boolean;
  /** Overrides the visible label for screen readers (e.g. "Layer 2: slip"). */
  'aria-label'?: string;
}

/** A dropdown of the studio's usual options, plus "Other…" to type anything. */
export function ChoiceField({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  otherLabel,
  required,
  ...rest
}: Props) {
  const [custom, setCustom] = useState(() => value !== '' && !options.includes(value));
  const ariaLabel = rest['aria-label'];

  return (
    <div className="choice">
      <SelectField
        id={id}
        label={label}
        aria-label={ariaLabel}
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
      </SelectField>
      {custom && (
        <TextField
          label={otherLabel ?? `${label} name`}
          aria-label={ariaLabel ? `${ariaLabel} (other)` : undefined}
          value={value}
          required={required}
          maxLength={80}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
