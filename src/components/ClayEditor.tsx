import { CLAYS } from '../config';
import { evenSplit, MAX_CLAYS } from '../lib/clays';
import { TextField } from './Fields';
import { Icon } from './Icon';
import { PickerField } from './PickerField';

export interface ClayDraft {
  key: string;
  name: string;
  /** As typed; only used for mixes. */
  percent: string;
}

let nextKey = 0;
export const newClay = (name = '', percent: number | null = null): ClayDraft => ({
  key: `c${nextKey++}`,
  name,
  percent: percent === null ? '' : String(percent),
});

/** Re-split evenly after adding or removing a clay, unless the shares were typed in by hand. */
function resplit(before: ClayDraft[], after: ClayDraft[]): ClayDraft[] {
  if (after.length < 2) return after.map((c) => ({ ...c, percent: '' }));
  const even = evenSplit(before.length).map(String);
  const untouched = before.every((c, i) => c.percent === '' || (before.length > 1 && c.percent === even[i]));
  if (!untouched) return after;
  const split = evenSplit(after.length);
  return after.map((c, i) => ({ ...c, percent: String(split[i]) }));
}

interface Props {
  clays: ClayDraft[];
  onChange: (clays: ClayDraft[]) => void;
}

/** One clay, or a mix of several with optional percentages (e.g. 50% Craft Crank + 50% Reclaim). */
export function ClayEditor({ clays, onChange }: Props) {
  const mixing = clays.length > 1;
  const update = (i: number, patch: Partial<ClayDraft>) =>
    onChange(clays.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <div className="clay-editor">
      {clays.map((clay, i) => (
        <div key={clay.key} className={mixing ? 'clay-row' : undefined}>
          <PickerField
            id={i === 0 ? 'clay' : `clay-${i + 1}`}
            label={mixing ? `Clay ${i + 1}` : 'Clay'}
            value={clay.name}
            options={CLAYS}
            onChange={(name) => update(i, { name })}
            custom="Not a studio clay"
            required
          />
          {mixing && (
            <>
              <TextField
                label="%"
                aria-label={`Clay ${i + 1} percentage`}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={clay.percent}
                onChange={(e) => update(i, { percent: e.target.value.replace(/\D/g, '') })}
              />
              <button
                type="button"
                className="icon-btn clay-remove"
                aria-label={`Remove clay ${i + 1}`}
                onClick={() =>
                  onChange(
                    resplit(
                      clays,
                      clays.filter((_, j) => j !== i),
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
      {mixing && <p className="section-supporting">Percentages are optional. If you add them, make them total 100%.</p>}
      {clays.length < MAX_CLAYS && (
        <div className="chip-row">
          <button
            type="button"
            className="chip chip-assist"
            onClick={() => onChange(resplit(clays, [...clays, newClay()]))}
          >
            <Icon name="add" className="chip-leading" />
            <span className="chip-text">{mixing ? 'Add another clay' : 'Mix with another clay'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
