export type {
  ModelContextToolContentBlock,
  ModelContextToolDefinition,
  ModelContextToolResult,
} from "./hooks/useModelContextTool";
export {
  isModelContextSupported,
  useModelContextTool,
} from "./hooks/useModelContextTool";
export { usePrefersDarkMode } from "./hooks/usePrefersDarkMode";
export type { ThemeConfig, ThemePreference } from "./hooks/useThemePreference";
export {
  initTheme,
  setThemePreference,
  useThemePreference,
} from "./hooks/useThemePreference";
