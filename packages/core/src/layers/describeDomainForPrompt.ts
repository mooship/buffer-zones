import type { DomainConfig, Layer, LayerGroup } from "../types/layer";

function describeLayer(layer: Layer): string {
  const description = layer.description ? ` — ${layer.description}` : "";
  return `- ${layer.label} (${layer.geometryKind})${description}`;
}

function describeLayerGroup(
  group: LayerGroup,
  availableLayers: readonly Layer[],
): string {
  const memberLabels = group.layerIds
    .map((id) => availableLayers.find((layer) => layer.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const description = group.description ? ` — ${group.description}` : "";
  return `- ${group.title} (${group.selectionMode})${description}: ${memberLabels.join(", ")}`;
}

/**
 * Serialises a domain's layers and layer groups into a compact plain-text
 * block, suitable for grounding an LLM system prompt with what a map
 * actually shows.
 * @param domain - The domain whose layers/groups to describe.
 * @returns Plain text with a "Layers:" section (one line per available
 *   layer: label, geometry kind, description) and a "Layer groups:" section
 *   (one line per group: title, selection mode, description, member labels).
 * @remarks Only `available` layers are included, matching what's actually
 *   offered to users. Deliberately excludes `dataSource`/`style`/coordinate
 *   data — this summary lets an LLM explain what a layer shows and how
 *   layers relate, not compute or look up individual feature values, since
 *   raw geometry isn't included here.
 * @example
 * describeDomainForPrompt(GAUTENG_SPATIAL_LEGACY_DOMAIN);
 * // "Layers:\n- Modelled car time (choropleth) — ...\n\nLayer groups:\n- Accessibility overlays (exclusive): ..."
 */
export function describeDomainForPrompt(domain: DomainConfig): string {
  const availableLayers = domain.layers.filter((layer) => layer.available);
  const layerLines = availableLayers.map(describeLayer).join("\n");
  const groupLines = domain.layerGroups
    .map((group) => describeLayerGroup(group, availableLayers))
    .join("\n");
  return `Layers:\n${layerLines}\n\nLayer groups:\n${groupLines}`;
}
