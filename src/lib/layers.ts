import { GLAZES, OXIDES, SLIPS } from '../config';
import type { Layer, LayerType } from '../types';

export const LAYER_TYPES: { type: LayerType; label: string; options: readonly string[] }[] = [
  { type: 'glaze', label: 'Glaze', options: GLAZES },
  { type: 'slip', label: 'Slip', options: SLIPS },
  { type: 'oxide', label: 'Oxide', options: OXIDES },
];

export function layerTypeInfo(type: LayerType) {
  return LAYER_TYPES.find((t) => t.type === type) ?? LAYER_TYPES[0];
}

/** "Blue" slip reads as "Blue slip"; "Cobalt Oxide" stays as it is. */
export function layerLabel(layer: Pick<Layer, 'type' | 'name'>): string {
  if (layer.type === 'glaze' || layer.name.toLowerCase().includes(layer.type)) return layer.name;
  return `${layer.name} ${layer.type}`;
}

/**
 * Read layers from storage. Combos saved before slips and oxides existed
 * stored `{ glaze, application }`; treat those as glazes.
 */
export function normalizeLayers(raw: unknown): Layer[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): Layer[] => {
    if (!item || typeof item !== 'object') return [];
    const l = item as Record<string, unknown>;
    const name = typeof l.name === 'string' ? l.name : typeof l.glaze === 'string' ? l.glaze : '';
    if (!name) return [];
    const type: LayerType = l.type === 'slip' || l.type === 'oxide' ? l.type : 'glaze';
    const application = typeof l.application === 'string' && l.application ? l.application : null;
    return [{ type, name, application }];
  });
}
