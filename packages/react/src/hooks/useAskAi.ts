import { useSyncExternalStore } from "react";

/** One turn of an Ask AI conversation. */
export interface AskAiMessage {
  /** Stable identity for this message within the conversation, for use as a React list key. */
  id: number;
  role: "user" | "assistant";
  content: string;
}

/** Lifecycle state of the Ask AI conversation. */
export type AskAiStatus = "idle" | "streaming" | "error";

/** Configuration for the Ask AI system. */
export interface AskAiConfig {
  /**
   * Same-origin (or CORS-enabled) URL the hook `POST`s `{ message, history }`
   * to as JSON. A 200 response streams the assistant's reply as plain UTF-8
   * text chunks; any other status is read as JSON `{ error: string }` and
   * surfaced as the hook's `error`. This tiny transport contract — not a
   * vendor SDK — is what makes the hook "bring your own AI": any backend
   * that speaks it works, Cloudflare Workers AI or otherwise.
   */
  endpoint: string;
}

/** The conversation snapshot `useAskAi` reads via `useSyncExternalStore`. */
interface AskAiState {
  messages: AskAiMessage[];
  status: AskAiStatus;
  error: string | null;
}

const SERVER_STATE: AskAiState = { messages: [], status: "idle", error: null };

let config: AskAiConfig | null = null;
let state: AskAiState = { messages: [], status: "idle", error: null };
let nextMessageId = 0;
const listeners = new Set<() => void>();

function nextId(): number {
  nextMessageId += 1;
  return nextMessageId;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(patch: Partial<AskAiState>) {
  state = { ...state, ...patch };
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): AskAiState {
  return state;
}

function getServerSnapshot(): AskAiState {
  return SERVER_STATE;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // Fall through to the generic message below.
  }
  return "Something went wrong. Please try again.";
}

/**
 * Configures the Ask AI system with an app-specific backend endpoint.
 * @remarks Call once at app bootstrap before any component calls `ask()`.
 * @example
 * initAskAi({ endpoint: "/api/ask" });
 */
export function initAskAi(askAiConfig: AskAiConfig): void {
  config = askAiConfig;
}

/**
 * Sends a question to the configured Ask AI endpoint, streaming the reply
 * into the conversation held by `useAskAi`.
 * @param question - The user's question. Appended to the conversation as a
 *   `"user"` message immediately, before the response arrives.
 * @remarks A no-op while a previous call is still streaming, so concurrent
 *   requests can't interleave into the same assistant message.
 */
export async function askAi(question: string): Promise<void> {
  if (!config) {
    throw new Error("initAskAi must be called before askAi");
  }
  if (state.status === "streaming") {
    return;
  }

  const history = state.messages.map(({ role, content }) => ({
    role,
    content,
  }));
  setState({
    messages: [
      ...state.messages,
      { id: nextId(), role: "user", content: question },
    ],
    status: "streaming",
    error: null,
  });

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, history }),
    });

    if (!response.ok || !response.body) {
      setState({ status: "error", error: await readErrorMessage(response) });
      return;
    }

    setState({
      messages: [
        ...state.messages,
        { id: nextId(), role: "assistant", content: "" },
      ],
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      const lastMessage = state.messages[state.messages.length - 1];
      /* v8 ignore next 3 -- unreachable: the assistant placeholder message is always pushed immediately above, before this loop can run */
      if (!lastMessage) {
        break;
      }
      setState({
        messages: [
          ...state.messages.slice(0, -1),
          { ...lastMessage, content: lastMessage.content + chunk },
        ],
      });
    }
    setState({ status: "idle" });
  } catch {
    setState({
      status: "error",
      error: "Something went wrong. Please try again.",
    });
  }
}

/** Clears the conversation and resets `useAskAi`'s state to idle. */
export function resetAskAi(): void {
  nextMessageId = 0;
  setState({ messages: [], status: "idle", error: null });
}

/**
 * Returns the current Ask AI conversation, updating reactively as it
 * streams. Call `initAskAi` once at app bootstrap before using this hook.
 * @returns `messages` (the conversation so far), `status`, `error` (set only
 *   when `status === "error"`), and the imperative `ask`/`reset` functions.
 */
export function useAskAi(): {
  messages: AskAiMessage[];
  status: AskAiStatus;
  error: string | null;
  ask: (question: string) => Promise<void>;
  reset: () => void;
} {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return {
    messages: current.messages,
    status: current.status,
    error: current.error,
    ask: askAi,
    reset: resetAskAi,
  };
}
