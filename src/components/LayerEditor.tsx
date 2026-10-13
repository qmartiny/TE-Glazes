import { APPLICATIONS } from '../config';
import { LAYER_TYPES, layerTypeInfo } from '../lib/layers';
import type { LayerType } from '../types';
import { SelectField } from './Fields';
import { Icon } from './Icon';
import { PickerField } from './PickerField';

export interface LayerDraft {
  key: string;
  type: LayerType;
  name: string;
  application: string;
}

const MAX_LAYERS = 8;
let nextKey = 0;
export const newLayer = (type: LayerType = 'glaze', name = '', application = ''): LayerDraft => ({
  key: `l${nextKey++}`,
  type,
  name,
  application,
});

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
      {layers.map((layer, i) => {
        const info = layerTypeInfo(layer.type);
        return (
          <div key={layer.key} className="layer-card">
            <div className="layer-card-head">
              <span className="layer-num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="layer-card-title">{info.label}</span>
              {layers.length > 1 && (
                <span className="layer-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Move layer ${i + 1} earlier`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <Icon name="arrow_upward" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Move layer ${i + 1} later`}
                    disabled={i === layers.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <Icon name="arrow_downward" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove layer ${i + 1}`}
                    onClick={() => onChange(layers.filter((_, j) => j !== i))}
                  >
                    <Icon name="close" />
                  </button>
                </span>
              )}
            </div>
            <div className="layer-fields">
              <PickerField
                id={`layer-${layer.key}`}
                label={`Which ${info.label.toLowerCase()}`}
                aria-label={`Layer ${i + 1}: ${info.label.toLowerCase()}`}
                value={layer.name}
                options={info.options}
                custom={`Not a studio ${info.label.toLowerCase()}`}
                required
                onChange={(name) => update(i, { name })}
              />
              <SelectField
                label="How applied"
                aria-label={`How layer ${i + 1} was applied`}
                value={layer.application}
                onChange={(e) => update(i, { application: e.target.value })}
              >
                <option value="">Not specified</option>
                {APPLICATIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        );
      })}
      {layers.length < MAX_LAYERS && (
        <div className="chip-row chip-row-wrap" role="group" aria-label="Add a layer">
          {LAYER_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              className="chip chip-assist"
              aria-label={`Add ${t.label.toLowerCase()}`}
              onClick={() => onChange([...layers, newLayer(t.type)])}
            >
              <Icon name="add" className="chip-leading" />
              <span className="chip-text">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
