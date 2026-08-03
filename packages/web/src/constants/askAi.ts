/** Same-origin endpoint `@stratum/react`'s `useAskAi` hook posts questions to. */
export const ASK_AI_ENDPOINT = "/api/ask";

/**
 * Maximum characters accepted for a single Ask AI question or history
 * message. Enforced both client-side (the `AskAiPanel` textarea's
 * `maxLength`) and server-side (`askAi.server.ts`'s zod schema) from this
 * one shared constant, so the two limits can't drift apart.
 */
export const ASK_AI_MAX_MESSAGE_LENGTH = 400;
