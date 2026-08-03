import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Writes `data` as JSON to `path`, creating any missing parent directories.
 * @param options.compact - When `true`, writes minified JSON (for
 *   `.display.v1.geojson` output); otherwise pretty-prints with 2-space indentation.
 */
export async function writeGeoJsonFile(
  path: string,
  data: unknown,
  options: { compact?: boolean } = {},
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    options.compact ? JSON.stringify(data) : JSON.stringify(data, null, 2),
  );
}
