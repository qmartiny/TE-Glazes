import { APPLICATIONS, GLAZES } from '../config';
import { ChoiceField } from './ChoiceField';
import { CloseIcon, DownIcon, UpIcon } from './Icons';

export interface LayerDraft {
  key: string;
  glaze: string;
  application: string;
}

const MAX_LAYERS = 8;
let nextKey = 0;
export const newLayer = (glaze = '', application = ''): LayerDraft => ({ key: `l${nextKey++}`, glaze, application });

interface Props {
  layers: LayerDraft[];
  onChange: (layers: LayerDraft[]) => void;
}

export function LayerEditor({ layers, onChange }: Props) {
  const update = (i: number, patch: Partial<LayerDraft>) =>
    onChange(layers.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, by: number) => {
    const next = [...layers];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };

  return (
    <div className="layers-editor">
      {layers.map((layer, i) => (
        <div key={layer.key} className="layer-row">
          <span className="layer-num" aria-hidden="true">
            {i + 1}
          </span>
          <div className="layer-fields">
            <ChoiceField
              id={`glaze-${layer.key}`}
              aria-label={`Glaze ${i + 1}`}
              value={layer.glaze}
              options={GLAZES}
              placeholder={i === 0 ? 'Choose glaze' : 'Glaze on top'}
              otherPlaceholder="Glaze name"
              required
              onChange={(glaze) => update(i, { glaze })}
            />
            <select
              aria-label={`How glaze ${i + 1} was applied`}
              value={layer.application}
              onChange={(e) => update(i, { application: e.target.value })}
            >
              <option value="">How applied? (optional)</option>
              {APPLICATIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="layer-actions">
            {layers.length > 1 && (
              <>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Move glaze ${i + 1} earlier`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <UpIcon />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Move glaze ${i + 1} later`}
                  disabled={i === layers.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <DownIcon />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove glaze ${i + 1}`}
                  onClick={() => onChange(layers.filter((_, j) => j !== i))}
                >
                  <CloseIcon />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
      {layers.length < MAX_LAYERS && (
        <button type="button" className="btn btn-ghost" onClick={() => onChange([...layers, newLayer()])}>
          + Add another glaze
        </button>
      )}
    </div>
  );
}
