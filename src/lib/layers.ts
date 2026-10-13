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
/** Whether a glaze, slip or oxide is one of the studio's own (not a custom one someone typed in). */
export function isStudioMaterial(layer: Pick<Layer, 'type' | 'name'>): boolean {
  return layerTypeInfo(layer.type).options.some((o) => normName(o) === normName(layer.name));
}

/** A combo made only from the studio's glazes, slips and oxides. */
export function usesStudioMaterialsOnly(layers: Pick<Layer, 'type' | 'name'>[]): boolean {
  return layers.every(isStudioMaterial);
}

export function layerLabel(layer: Pick<Layer, 'type' | 'name'>): string {
  if (layer.type === 'glaze' || layer.name.toLowerCase().includes(layer.type)) return layer.name;
  return `${layer.name} ${layer.type}`;
}

/** Compare names ignoring case and extra spaces ("mystery  Green" = "Mystery Green"). */
export function normName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Identifies a combination: its layers in order, ignoring how each was applied.
 * "Tenmoku then Midnight Blue" and "Midnight Blue then Tenmoku" are different.
 */
export function comboKey(layers: Pick<Layer, 'type' | 'name'>[]): string {
  return layers.map((l) => `${l.type}:${normName(l.name)}`).join('|');
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
    const typed = typeof l.name === 'string' ? l.name : typeof l.glaze === 'string' ? l.glaze : '';
    if (!typed.trim()) return [];
    const type: LayerType = l.type === 'slip' || l.type === 'oxide' ? l.type : 'glaze';
    // Use the studio's spelling for listed names, so "tenmoku" shows as "Tenmoku".
    const listed = layerTypeInfo(type).options.find((o) => normName(o) === normName(typed));
    const name = listed ?? typed.trim();
    const application = typeof l.application === 'string' && l.application ? l.application : null;
    return [{ type, name, application }];
  });
}
