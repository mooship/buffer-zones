import { useAskAi } from "@stratum/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ASK_AI_MAX_MESSAGE_LENGTH } from "../../constants/askAi";
import styles from "./AskAiPanel.module.css";

/**
 * Chat interface for the map's "Ask AI" panel tab: a scrolling message log
 * plus a question form, backed by `@stratum/react`'s `useAskAi` hook and the
 * app's Workers AI-backed `/api/ask` endpoint (see `initAskAi` in
 * `entry.client.tsx`).
 * @remarks Renders assistant replies as plain text (React escapes it, same
 * as any other string child) rather than parsed Markdown/HTML — the model's
 * output is untrusted content and must never be interpreted as markup.
 */
export function AskAiPanel() {
  const { messages, status, error, ask } = useAskAi();
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === "streaming";
  const lastMessage = messages.at(-1);
  const pendingAssistantMessageId =
    isStreaming &&
    lastMessage?.role === "assistant" &&
    lastMessage.content === ""
      ? lastMessage.id
      : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages isn't read in the effect body, but its identity changing is exactly what should re-trigger the scroll-to-bottom
  useEffect(() => {
    const log = logRef.current;
    /* v8 ignore next 3 -- unreachable: the ref is attached to an element that's always rendered, so it's set by the time this effect runs post-mount */
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || isStreaming) {
      return;
    }
    setDraft("");
    ask(question);
  }

  return (
    <div className={styles.panel}>
      <div
        className={styles.log}
        role="log"
        aria-live="polite"
        aria-label="Conversation with the map assistant"
        ref={logRef}
        data-testid="ask-ai-log"
        data-e2e="ask-ai-log"
      >
        {messages.length === 0 ? (
          <p className={styles.hint}>
            Ask what this map shows, how the drive-time model works, or which
            layers you can turn on. It can't look up an exact figure for one
            place — use the map or the Browse places tab for that.
          </p>
        ) : null}
        {messages.map((message) => {
          const isPendingAssistantReply =
            message.id === pendingAssistantMessageId;
          return (
            <p
              key={message.id}
              className={styles.message}
              data-role={message.role}
            >
              <span className={styles.messageRole}>
                {message.role === "user" ? "You" : "Assistant"}
              </span>
              {isPendingAssistantReply ? (
                <span className={styles.typing} aria-hidden="true">
                  …
                </span>
              ) : (
                message.content
              )}
            </p>
          );
        })}
      </div>

      {error ? (
        <p
          className={styles.error}
          role="alert"
          data-testid="ask-ai-error"
          data-e2e="ask-ai-error"
        >
          {error}
        </p>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="ask-ai-input">
          Ask about this map
        </label>
        <textarea
          id="ask-ai-input"
          className={styles.textarea}
          value={draft}
          maxLength={ASK_AI_MAX_MESSAGE_LENGTH}
          disabled={isStreaming}
          placeholder="e.g. What does the drive-time colour scale mean?"
          data-testid="ask-ai-input"
          data-e2e="ask-ai-input"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className={styles.submit}
          disabled={isStreaming || draft.trim().length === 0}
          data-testid="ask-ai-submit"
          data-e2e="ask-ai-submit"
        >
          {isStreaming ? "Thinking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
