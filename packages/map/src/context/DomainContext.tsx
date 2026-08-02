import {
  createRegistry,
  type DomainConfig,
  type DomainRegistry,
} from "@stratum/core";
import { createContext, type ReactNode, useContext, useMemo } from "react";

const DomainContext = createContext<DomainRegistry | null>(null);

/**
 * Provides a `DomainRegistry` to all child components.
 * @remarks Any component that calls `useDomain()` must be a descendant of
 *   `DomainProvider`. Wrap the app root once with the domain configuration.
 * @example
 * <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
 *   <App />
 * </DomainProvider>
 */
export function DomainProvider({
  domain,
  children,
}: {
  domain: DomainConfig;
  children: ReactNode;
}) {
  const registry = useMemo(() => createRegistry(domain), [domain]);
  return <DomainContext value={registry}>{children}</DomainContext>;
}

/**
 * Returns the `DomainRegistry` provided by the nearest `DomainProvider`.
 * @throws If called outside of a `DomainProvider`.
 */
export function useDomain(): DomainRegistry {
  const registry = useContext(DomainContext);
  if (!registry) {
    throw new Error("useDomain must be used inside DomainProvider");
  }
  return registry;
}

export type { DomainRegistry } from "@stratum/core";
