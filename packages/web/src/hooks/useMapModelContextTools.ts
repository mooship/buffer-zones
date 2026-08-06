import type { DomainStory as DomainStoryContent } from "@stratum/core";
import {
  fetchLocationSearchResults,
  getRegisteredBasemapIds,
  type LocationSearchResult,
} from "@stratum/map";
import type { ThemePreference } from "@stratum/react";
import { setThemePreference, useModelContextTool } from "@stratum/react";
import { getLayer, getLayers } from "../layers/registry";
import { useMapUiStore } from "../stores/useMapUiStore";

const THEME_PREFERENCES: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
];

interface ToggleLayerInput {
  layerId: string;
}

interface SearchLocationInput {
  query: string;
}

interface SetBasemapInput {
  basemap: string;
}

interface SetThemeInput {
  theme: string;
}

/** Options for `useMapModelContextTools`, covering the state that stays local to `App`. */
export interface UseMapModelContextToolsOptions {
  /**
   * Handles a location chosen for the map to fly to, mirroring
   * `LocationSearchControl`'s own `onLocationSelect` handling in `App`, and
   * returning a human-readable outcome for the calling agent.
   */
  onLocationSelect: (location: LocationSearchResult) => string;
  /** The active domain's story copy, or `undefined` if it has none — gates whether a story-reading tool is registered at all. */
  story: DomainStoryContent | undefined;
  /** Switches the info panel to the story view and opens it, so a sighted user watching the screen sees what the agent just read. */
  onShowStory: () => void;
}

/**
 * Registers this app's capabilities as WebMCP tools via `document.modelContext`
 * (see `useModelContextTool`), so an in-browser AI agent can list and toggle
 * map layers, search for a place, switch the basemap or theme, and read the
 * domain's story — without reverse-engineering the UI.
 * @remarks A no-op wherever WebMCP is unsupported; `useModelContextTool`
 *   handles that feature detection. Layer, basemap, and theme tools read and
 *   write `useMapUiStore`/the layer registry/`setThemePreference` directly
 *   rather than through props, since all three are already stable, globally
 *   reachable APIs; `onLocationSelect`/`onShowStory` stay props because they
 *   close over `App`'s own local component state (the search focus target,
 *   the panel's open/view state) that isn't in the shared store.
 */
export function useMapModelContextTools({
  onLocationSelect,
  story,
  onShowStory,
}: UseMapModelContextToolsOptions): void {
  useModelContextTool<Record<string, never>>({
    name: "list-map-layers",
    description:
      "List this map's layers, each with its id, label, and whether it's currently visible.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: () => {
      const visibleLayerIds = useMapUiStore.getState().visibleLayerIds;
      const lines = getLayers()
        .filter((layer) => layer.available)
        .map((layer) => {
          const visibility = visibleLayerIds.includes(layer.id)
            ? "visible"
            : "hidden";
          const description = layer.description
            ? ` — ${layer.description}`
            : "";
          return `${layer.id}: ${layer.label}${description} (${visibility})`;
        });
      return {
        content: [
          {
            type: "text",
            text:
              lines.length > 0
                ? lines.join("\n")
                : "This map has no layers available.",
          },
        ],
      };
    },
  });

  useModelContextTool<ToggleLayerInput>({
    name: "toggle-map-layer",
    description:
      "Show or hide a map layer by id. Call list-map-layers first to find valid ids.",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "string",
          description: "The layer's id, as returned by list-map-layers.",
        },
      },
      required: ["layerId"],
      additionalProperties: false,
    },
    execute: ({ layerId }) => {
      const layer = getLayer(layerId);
      if (!layer) {
        return {
          content: [
            {
              type: "text",
              text: `No layer with id "${layerId}". Call list-map-layers to see valid ids.`,
            },
          ],
        };
      }
      if (!layer.available) {
        return {
          content: [
            {
              type: "text",
              text: `Layer "${layer.label}" isn't available yet.`,
            },
          ],
        };
      }
      useMapUiStore.getState().toggleLayer(layerId);
      const nowVisible = useMapUiStore
        .getState()
        .visibleLayerIds.includes(layerId);
      return {
        content: [
          {
            type: "text",
            text: `Layer "${layer.label}" is now ${nowVisible ? "visible" : "hidden"}.`,
          },
        ],
      };
    },
  });

  useModelContextTool<SearchLocationInput>({
    name: "search-map-location",
    description:
      "Search for a place by name and fly the map to the best match, e.g. a town, suburb or station.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Free-text place name to search for.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    execute: async ({ query }) => {
      const results = await fetchLocationSearchResults(query);
      const [best] = results;
      if (!best) {
        return {
          content: [
            { type: "text", text: `No location found matching "${query}".` },
          ],
        };
      }
      return { content: [{ type: "text", text: onLocationSelect(best) }] };
    },
  });

  useModelContextTool<SetBasemapInput>({
    name: "set-map-basemap",
    description: "Switch the map's basemap style.",
    inputSchema: {
      type: "object",
      properties: {
        basemap: {
          type: "string",
          enum: getRegisteredBasemapIds(),
          description: "One of the registered basemap ids.",
        },
      },
      required: ["basemap"],
      additionalProperties: false,
    },
    execute: ({ basemap }) => {
      if (!getRegisteredBasemapIds().includes(basemap)) {
        return {
          content: [{ type: "text", text: `Unknown basemap "${basemap}".` }],
        };
      }
      useMapUiStore.getState().setBasemap(basemap);
      return {
        content: [{ type: "text", text: `Basemap switched to "${basemap}".` }],
      };
    },
  });

  useModelContextTool<SetThemeInput>({
    name: "set-app-theme",
    description:
      'Switch the app\'s colour theme. "system" follows the OS preference.',
    inputSchema: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          enum: THEME_PREFERENCES,
        },
      },
      required: ["theme"],
      additionalProperties: false,
    },
    execute: ({ theme }) => {
      if (!THEME_PREFERENCES.includes(theme as ThemePreference)) {
        return {
          content: [{ type: "text", text: `Unknown theme "${theme}".` }],
        };
      }
      setThemePreference(theme as ThemePreference);
      return {
        content: [{ type: "text", text: `Theme switched to "${theme}".` }],
      };
    },
  });

  useModelContextTool(
    story
      ? {
          name: "read-map-story",
          description:
            "Read this map's background story explaining why it exists, and open the Story panel.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          execute: () => {
            onShowStory();
            return {
              content: [
                { type: "text", text: `${story.title}\n\n${story.body}` },
              ],
            };
          },
        }
      : null,
  );
}
