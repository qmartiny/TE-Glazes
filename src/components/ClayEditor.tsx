import { useMemo } from 'react';
import { CLAYS } from '../config';
import { evenSplit, MAX_CLAYS, parseParts, partsToPercents, percentsToParts } from '../lib/clays';
import { memberNames } from '../lib/layers';
import { useResults } from '../lib/results';
import { TextField } from './Fields';
import { Icon } from './Icon';
import { PickerField } from './PickerField';

/** How a mix is measured: percentages adding up to 100, or parts (e.g. 1 part to 4). */
export type MixMode = 'percent' | 'parts';

export interface ClayDraft {
  key: string;
  name: string;
  /** As typed; only used for mixes. */
  percent: string;
  parts: string;
}

let nextKey = 0;
export const newClay = (name = '', percent: number | null = null, parts?: number): ClayDraft => ({
  key: `c${nextKey++}`,
  name,
  percent: percent === null ? '' : String(percent),
  parts: parts === undefined ? '' : String(parts),
});

/** The parts as numbers if every clay has a valid one. */
function allParts(clays: ClayDraft[]): number[] | null {
  const parts = clays.map((c) => parseParts(c.parts));
  return parts.every((p) => !Number.isNaN(p)) ? parts : null;
}

/** Re-split evenly after adding or removing a clay, unless the shares were typed in by hand. */
function resplit(before: ClayDraft[], after: ClayDraft[], mode: MixMode): ClayDraft[] {
  if (after.length < 2) return after.map((c) => ({ ...c, percent: '', parts: '' }));
  if (mode === 'parts') {
    // Starting a mix, or still 1 part each: the new clay gets 1 part too.
    const even = before.length < 2 || before.every((c) => c.parts === '1');
    return after.map((c) => ({ ...c, parts: c.parts || (even ? '1' : '') }));
  }
  const even = evenSplit(before.length).map(String);
  const untouched = before.every((c, i) => c.percent === '' || (before.length > 1 && c.percent === even[i]));
  if (!untouched) return after;
  const split = evenSplit(after.length);
  return after.map((c, i) => ({ ...c, percent: String(split[i]) }));
}

interface Props {
  clays: ClayDraft[];
  onChange: (clays: ClayDraft[]) => void;
  mode: MixMode;
  onModeChange: (mode: MixMode) => void;
}

/**
 * One clay, or a mix of several with optional shares, as percentages
 * (50% Craft Crank + 50% Reclaim) or parts (1 part Craft Crank to 4 parts Reclaim).
 */
export function ClayEditor({ clays, onChange, mode, onModeChange }: Props) {
  const { results } = useResults();
  const usedClays = useMemo(() => memberNames(results ?? [], CLAYS).clay, [results]);
  const mixing = clays.length > 1;
  const update = (i: number, patch: Partial<ClayDraft>) =>
    onChange(clays.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  /** Switching carries the numbers over: 20% / 80% ⇄ 1 part / 4 parts. */
  function switchMode(next: MixMode) {
    if (next === mode) return;
    if (next === 'parts') {
      const percents = clays.map((c) => Number(c.percent));
      const complete = clays.every((c) => c.percent !== '') && percents.reduce((a, b) => a + b, 0) === 100;
      const parts = complete ? percentsToParts(percents) : null;
      onChange(clays.map((c, i) => ({ ...c, parts: parts ? String(parts[i]) : '' })));
    } else {
      const parts = allParts(clays);
      const percents = parts ? partsToPercents(parts) : null;
      onChange(clays.map((c, i) => ({ ...c, percent: percents ? String(percents[i]) : '' })));
    }
    onModeChange(next);
  }

  const parts = mode === 'parts' && mixing ? allParts(clays) : null;
  const percents = parts && partsToPercents(parts);

  return (
    <div className="clay-editor">
      {mixing && (
        <div className="segmented clay-mode" role="radiogroup" aria-label="Measure the mix in">
          {(['percent', 'parts'] as const).map((m) => (
            <label key={m} className={`segment${mode === m ? ' selected' : ''}`}>
              <input type="radio" name="clay-mode" value={m} checked={mode === m} onChange={() => switchMode(m)} />
              {mode === m && <Icon name="check" />}
              {m === 'percent' ? 'Percent' : 'Parts'}
            </label>
          ))}
        </div>
      )}
      {clays.map((clay, i) => (
        <div key={clay.key} className={mixing ? 'clay-row' : undefined}>
          <PickerField
            id={i === 0 ? 'clay' : `clay-${i + 1}`}
            label={mixing ? `Clay ${i + 1}` : 'Clay'}
            value={clay.name}
            options={CLAYS}
            onChange={(name) => update(i, { name })}
            custom="Not a studio clay"
            suggestions={usedClays}
            required
          />
          {mixing && (
            <>
              {mode === 'parts' ? (
                <TextField
                  label="Parts"
                  aria-label={`Clay ${i + 1} parts`}
                  inputMode="decimal"
                  maxLength={6}
                  value={clay.parts}
                  onChange={(e) => update(i, { parts: e.target.value.replace(/[^0-9.,]/g, '') })}
                />
              ) : (
                <TextField
                  label="%"
                  aria-label={`Clay ${i + 1} percentage`}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={clay.percent}
                  onChange={(e) => update(i, { percent: e.target.value.replace(/\D/g, '') })}
                />
              )}
              <button
                type="button"
                className="icon-btn clay-remove"
                aria-label={`Remove clay ${i + 1}`}
                onClick={() =>
                  onChange(
                    resplit(
                      clays,
                      clays.filter((_, j) => j !== i),
                      mode,
                    ),
                  )
                }
              >
                <Icon name="close" />
              </button>
            </>
          )}
        </div>
      ))}
      {mixing && mode === 'percent' && (
        <p className="section-supporting">Percentages are optional. If you add them, make them total 100%.</p>
      )}
      {mixing && mode === 'parts' && (
        <p className="section-supporting" role="status">
          {percents
            ? `That’s ${clays.map((c, i) => `${percents[i]}% ${c.name.trim() || `clay ${i + 1}`}`).join(' + ')}.`
            : 'Parts are optional, e.g. 1 and 4 for one part to four.'}
        </p>
      )}
      {clays.length < MAX_CLAYS && (
        <div className="chip-row">
          <button
            type="button"
            className="chip chip-assist"
            onClick={() => onChange(resplit(clays, [...clays, newClay()], mode))}
          >
            <Icon name="add" className="chip-leading" />
            <span className="chip-text">{mixing ? 'Add another clay' : 'Mix with another clay'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
