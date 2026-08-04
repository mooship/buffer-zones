/** Same-origin endpoint `@stratum/react`'s `useAskAi` hook posts questions to. */
export const ASK_AI_ENDPOINT = "/api/ask";

/**
 * Maximum characters accepted for a single Ask AI question or history
 * message. Enforced both client-side (the `AskAiPanel` textarea's
 * `maxLength`) and server-side (`askAi.server.ts`'s zod schema) from this
 * one shared constant, so the two limits can't drift apart.
 */
export const ASK_AI_MAX_MESSAGE_LENGTH = 400;

/**
 * Starter prompts shown as tappable chips before the first message, so a
 * new visitor sees example questions rather than a blank composer.
 */
export const ASK_AI_SUGGESTED_QUESTIONS: readonly string[] = [
  "What does the drive-time colour scale mean?",
  "Which layers can I turn on?",
  "How is this different from an official map?",
];
