import { stat } from "node:fs/promises";

/** Whether `path` exists on disk (a file or a directory). */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
