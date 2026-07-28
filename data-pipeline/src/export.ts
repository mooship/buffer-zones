import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

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
