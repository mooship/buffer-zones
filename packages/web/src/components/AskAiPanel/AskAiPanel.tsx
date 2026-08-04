import { useAskAi } from "@stratum/react";
import { ArrowUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ASK_AI_MAX_MESSAGE_LENGTH,
  ASK_AI_SUGGESTED_QUESTIONS,
} from "../../constants/askAi";
import styles from "./AskAiPanel.module.css";

const CHARACTER_COUNTER_THRESHOLD = 40;
const NEAR_BOTTOM_THRESHOLD_PX = 48;

/**
 * Chat interface for the map's "Ask AI" panel tab: a scrolling message log
 * plus a question composer, backed by `@stratum/react`'s `useAskAi` hook and
 * the app's Workers AI-backed `/api/ask` endpoint (see `initAskAi` in
 * `entry.client.tsx`).
 * @remarks Renders assistant replies as plain text (React escapes it, same
 * as any other string child) rather than parsed Markdown/HTML — the model's
 * output is untrusted content and must never be interpreted as markup.
 */
export function AskAiPanel() {
  const { messages, status, error, ask, reset } = useAskAi();
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const lastQuestionRef = useRef<string | null>(null);
  const isStreaming = status === "streaming";
  const lastMessage = messages.at(-1);
  const pendingAssistantMessageId =
    isStreaming &&
    lastMessage?.role === "assistant" &&
    lastMessage.content === ""
      ? lastMessage.id
      : null;
  const remainingCharacters = ASK_AI_MAX_MESSAGE_LENGTH - draft.length;
  const showCharacterCounter =
    remainingCharacters <= CHARACTER_COUNTER_THRESHOLD;

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages isn't read in the effect body, but its identity changing is exactly what should re-trigger the scroll-to-bottom check
  useEffect(() => {
    const log = logRef.current;
    /* v8 ignore next 3 -- unreachable: the ref is attached to an element that's always rendered, so it's set by the time this effect runs post-mount */
    if (!log) {
      return;
    }
    if (isNearBottomRef.current) {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draft isn't read in the effect body, but its length changing is exactly what should re-trigger the height recalculation
  useEffect(() => {
    const textarea = textareaRef.current;
    /* v8 ignore next 3 -- unreachable: the ref is attached to an element that's always rendered, so it's set by the time this effect runs post-mount */
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  function handleLogScroll() {
    const log = logRef.current;
    /* v8 ignore next 3 -- unreachable: the scroll handler is only ever invoked by a scroll event dispatched on this same element, so it's always mounted here */
    if (!log) {
      return;
    }
    const distanceFromBottom =
      log.scrollHeight - log.scrollTop - log.clientHeight;
    isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  }

  function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isStreaming) {
      return;
    }
    lastQuestionRef.current = trimmed;
    setDraft("");
    ask(trimmed);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion(draft);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(draft);
    }
  }

  function handleRetry() {
    const question = lastQuestionRef.current;
    /* v8 ignore next 3 -- unreachable: the retry button that calls this is only rendered when lastQuestionRef.current is already set */
    if (question) {
      ask(question);
    }
  }

  return (
    <div className={styles.panel}>
      {messages.length > 0 ? (
        <div className={styles.header}>
          <span className={styles.messageCount}>
            {messages.length} message{messages.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear conversation"
            data-testid="ask-ai-clear"
            data-e2e="ask-ai-clear"
            onClick={reset}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <div
        className={styles.log}
        role="log"
        aria-live="polite"
        aria-label="Conversation with the map assistant"
        ref={logRef}
        onScroll={handleLogScroll}
        data-testid="ask-ai-log"
        data-e2e="ask-ai-log"
      >
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <Sparkles className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.hint}>
              Ask what this map shows, how the drive-time model works, or which
              layers you can turn on. It can't look up an exact figure for one
              place — click that place on the map for that.
            </p>
            <p className={styles.suggestionsLabel}>Try asking</p>
            <div className={styles.suggestions}>
              {ASK_AI_SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  className={styles.suggestion}
                  data-testid="ask-ai-suggestion"
                  data-e2e="ask-ai-suggestion"
                  disabled={isStreaming}
                  onClick={() => submitQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
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
                <span
                  className={styles.typing}
                  data-testid="ask-ai-typing"
                  aria-hidden="true"
                >
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </span>
              ) : (
                message.content
              )}
              {isPendingAssistantReply ? (
                <span className={styles.srOnly}>Assistant is thinking</span>
              ) : null}
            </p>
          );
        })}
      </div>

      {error ? (
        <div
          className={styles.errorRow}
          role="alert"
          data-testid="ask-ai-error"
          data-e2e="ask-ai-error"
        >
          <p className={styles.error}>{error}</p>
          {lastQuestionRef.current ? (
            <button
              type="button"
              className={styles.retry}
              data-testid="ask-ai-retry"
              data-e2e="ask-ai-retry"
              onClick={handleRetry}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="ask-ai-input">
          Ask about this map
        </label>
        <div className={styles.composer}>
          <textarea
            ref={textareaRef}
            id="ask-ai-input"
            className={styles.textarea}
            value={draft}
            rows={1}
            maxLength={ASK_AI_MAX_MESSAGE_LENGTH}
            disabled={isStreaming}
            placeholder="e.g. What does the drive-time colour scale mean?"
            data-testid="ask-ai-input"
            data-e2e="ask-ai-input"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <button
            type="submit"
            className={styles.submit}
            disabled={isStreaming || draft.trim().length === 0}
            data-testid="ask-ai-submit"
            data-e2e="ask-ai-submit"
          >
            {isStreaming ? (
              <>
                <Loader2 className={styles.spinner} aria-hidden="true" />
                <span className={styles.srOnly}>Thinking…</span>
              </>
            ) : (
              <>
                <ArrowUp aria-hidden="true" />
                <span className={styles.srOnly}>Ask</span>
              </>
            )}
          </button>
        </div>
        {showCharacterCounter ? (
          <p className={styles.counter} data-testid="ask-ai-counter">
            {remainingCharacters} characters left
          </p>
        ) : null}
      </form>
    </div>
  );
}
