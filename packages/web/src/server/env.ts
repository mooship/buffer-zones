/** One turn of a Workers AI chat completion request. */
export interface WorkersAiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Options this app passes to the Workers AI binding's `run()` method. */
export interface WorkersAiRunOptions {
  messages: WorkersAiChatMessage[];
  stream: true;
  max_tokens: number;
  temperature: number;
}

/**
 * Narrow view of the Workers AI binding surface this app calls.
 * @remarks Deliberately hand-written rather than sourced from
 * `@cloudflare/workers-types`: this app only ever calls `run()` with a
 * streaming text-generation request, so a full ambient binding surface
 * would be unused surface area.
 */
export interface WorkersAiBinding {
  run(
    model: string,
    options: WorkersAiRunOptions,
  ): Promise<ReadableStream<Uint8Array>>;
}

/** Result of a Workers Rate Limiting binding check. */
export interface RateLimitResult {
  success: boolean;
}

/** Narrow view of the Workers Rate Limiting binding surface this app calls. */
export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<RateLimitResult>;
}

/** Cloudflare Worker bindings the Ask AI feature relies on. */
export interface Env {
  AI: WorkersAiBinding;
  /** Per-client-IP request cap (see `getRateLimitKey`). */
  ASK_AI_RATE_LIMITER: RateLimiterBinding;
  /**
   * Site-wide request cap, keyed by a constant string rather than the
   * client IP. Protects the shared Workers AI free-tier daily Neuron
   * budget from being exhausted by a single sustained abuser — or many
   * distributed ones — which the per-IP limiter alone can't bound.
   */
  ASK_AI_GLOBAL_RATE_LIMITER: RateLimiterBinding;
}
