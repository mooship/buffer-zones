import { useCallback, useEffect, useRef } from "react";

/**
 * Manages a single in-flight `AbortController`, the pattern behind every
 * "cancel the previous request when a new one starts, and cancel on
 * unmount" abortable fetch in this package.
 * @returns `next()` aborts any signal it previously returned and returns a
 *   fresh one; `abort()` aborts the current signal without replacing it.
 *   The current signal is also aborted automatically on unmount.
 * @example
 * const { next } = useAbortController();
 * const signal = next();
 * const result = await fetchThing(query, signal);
 * if (!signal.aborted) setResult(result);
 */
export function useAbortController(): {
  next: () => AbortSignal;
  abort: () => void;
} {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const next = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller.signal;
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  return { next, abort };
}
