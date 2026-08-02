import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Whether a module was invoked directly as a script (`node path/to/module.ts`),
 * as opposed to being imported by another module (e.g. a test).
 * @param argv - `process.argv` from the module checking its own invocation.
 * @param moduleUrl - The checking module's own `import.meta.url`.
 */
export function isDirectExecution(
  argv: readonly string[],
  moduleUrl: string,
): boolean {
  const commandPath = argv[1];
  if (!commandPath) {
    return false;
  }

  return resolve(commandPath) === fileURLToPath(moduleUrl);
}
