import * as stratumReact from "@stratum/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ASK_AI_MAX_MESSAGE_LENGTH,
  ASK_AI_SUGGESTED_QUESTIONS,
} from "../../constants/askAi";
import { AskAiPanel } from "./AskAiPanel";

function mockUseAskAi(overrides?: {
  messages?: stratumReact.AskAiMessage[];
  status?: stratumReact.AskAiStatus;
  error?: string | null;
  ask?: (question: string) => Promise<void>;
  reset?: () => void;
}) {
  const ask = overrides?.ask ?? vi.fn(async () => {});
  const reset = overrides?.reset ?? vi.fn();
  vi.spyOn(stratumReact, "useAskAi").mockReturnValue({
    messages: overrides?.messages ?? [],
    status: overrides?.status ?? "idle",
    error: overrides?.error ?? null,
    ask,
    reset,
  });
  return { ask, reset };
}

function mockScrollMetrics(
  element: HTMLElement,
  metrics: { scrollHeight: number; clientHeight: number; scrollTop: number },
) {
  Object.defineProperty(element, "scrollHeight", {
    value: metrics.scrollHeight,
    configurable: true,
  });
  Object.defineProperty(element, "clientHeight", {
    value: metrics.clientHeight,
    configurable: true,
  });
  Object.defineProperty(element, "scrollTop", {
    value: metrics.scrollTop,
    writable: true,
    configurable: true,
  });
}

describe("AskAiPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an introductory hint when the conversation is empty", () => {
    mockUseAskAi();

    render(<AskAiPanel />);

    expect(screen.getByText(/Ask what this map shows/)).toBeInTheDocument();
  });

  it("renders each message with its role", () => {
    mockUseAskAi({
      messages: [
        { id: 1, role: "user", content: "What does this map show?" },
        {
          id: 2,
          role: "assistant",
          content: "It shows township access to jobs.",
        },
      ],
    });

    render(<AskAiPanel />);

    expect(screen.getByText("What does this map show?")).toBeInTheDocument();
    expect(
      screen.getByText("It shows township access to jobs."),
    ).toBeInTheDocument();
  });

  it("submits the trimmed question and clears the draft", () => {
    const { ask } = mockUseAskAi();
    render(<AskAiPanel />);

    const input = screen.getByTestId("ask-ai-input");
    fireEvent.change(input, {
      target: { value: "  What is the drive-time model?  " },
    });
    fireEvent.click(screen.getByTestId("ask-ai-submit"));

    expect(ask).toHaveBeenCalledWith("What is the drive-time model?");
    expect(input).toHaveValue("");
  });

  it("does not submit an empty or whitespace-only question", () => {
    const { ask } = mockUseAskAi();
    render(<AskAiPanel />);

    fireEvent.change(screen.getByTestId("ask-ai-input"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByTestId("ask-ai-submit"));

    expect(ask).not.toHaveBeenCalled();
  });

  it("ignores a form submit while already streaming, even with a non-empty draft", () => {
    const { ask } = mockUseAskAi({ status: "streaming" });
    render(<AskAiPanel />);

    fireEvent.change(screen.getByTestId("ask-ai-input"), {
      target: { value: "Question typed before streaming started" },
    });
    fireEvent.submit(
      screen.getByTestId("ask-ai-input").closest("form") as HTMLFormElement,
    );

    expect(ask).not.toHaveBeenCalled();
  });

  it("disables the input and submit button while streaming", () => {
    mockUseAskAi({ status: "streaming" });

    render(<AskAiPanel />);

    expect(screen.getByTestId("ask-ai-input")).toBeDisabled();
    expect(screen.getByTestId("ask-ai-submit")).toBeDisabled();
    expect(screen.getByTestId("ask-ai-submit")).toHaveTextContent("Thinking");
  });

  it("announces a typing indicator for an empty in-progress assistant reply", () => {
    mockUseAskAi({
      status: "streaming",
      messages: [
        { id: 1, role: "user", content: "Hi" },
        { id: 2, role: "assistant", content: "" },
      ],
    });

    render(<AskAiPanel />);

    expect(screen.getByTestId("ask-ai-typing")).toBeInTheDocument();
    expect(screen.getByText("Assistant is thinking")).toBeInTheDocument();
  });

  it("shows the error message as an alert when the request fails", () => {
    mockUseAskAi({ status: "error", error: "Too many requests" });

    render(<AskAiPanel />);

    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests");
  });

  it("does not show a retry action when no question has been sent yet", () => {
    mockUseAskAi({ status: "error", error: "Too many requests" });

    render(<AskAiPanel />);

    expect(screen.queryByTestId("ask-ai-retry")).not.toBeInTheDocument();
  });

  it("retries the last question when the retry action is clicked after an error", () => {
    const { ask } = mockUseAskAi({
      status: "error",
      error: "Something went wrong. Please try again.",
    });
    render(<AskAiPanel />);

    fireEvent.change(screen.getByTestId("ask-ai-input"), {
      target: { value: "What is the drive-time model?" },
    });
    fireEvent.click(screen.getByTestId("ask-ai-submit"));
    fireEvent.click(screen.getByTestId("ask-ai-retry"));

    expect(ask).toHaveBeenNthCalledWith(1, "What is the drive-time model?");
    expect(ask).toHaveBeenNthCalledWith(2, "What is the drive-time model?");
  });

  it("caps the textarea at the shared max message length", () => {
    mockUseAskAi();

    render(<AskAiPanel />);

    expect(screen.getByTestId("ask-ai-input")).toHaveAttribute(
      "maxlength",
      String(ASK_AI_MAX_MESSAGE_LENGTH),
    );
  });

  it("hides the clear-conversation button when there's no conversation yet", () => {
    mockUseAskAi();

    render(<AskAiPanel />);

    expect(screen.queryByTestId("ask-ai-clear")).not.toBeInTheDocument();
  });

  it("clears the conversation when the clear button is clicked", () => {
    const { reset } = mockUseAskAi({
      messages: [{ id: 1, role: "user", content: "Hi" }],
    });

    render(<AskAiPanel />);
    fireEvent.click(screen.getByTestId("ask-ai-clear"));

    expect(reset).toHaveBeenCalled();
  });

  it("submits the question when Enter is pressed without Shift", () => {
    const { ask } = mockUseAskAi();
    render(<AskAiPanel />);

    const input = screen.getByTestId("ask-ai-input");
    fireEvent.change(input, {
      target: { value: "What is the drive-time model?" },
    });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(ask).toHaveBeenCalledWith("What is the drive-time model?");
  });

  it("does not submit when Shift+Enter is pressed", () => {
    const { ask } = mockUseAskAi();
    render(<AskAiPanel />);

    const input = screen.getByTestId("ask-ai-input");
    fireEvent.change(input, { target: { value: "line one" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(ask).not.toHaveBeenCalled();
  });

  it("shows a character counter once the draft nears the max length", () => {
    mockUseAskAi();
    render(<AskAiPanel />);

    fireEvent.change(screen.getByTestId("ask-ai-input"), {
      target: { value: "a".repeat(ASK_AI_MAX_MESSAGE_LENGTH - 10) },
    });

    expect(screen.getByTestId("ask-ai-counter")).toHaveTextContent(
      "10 characters left",
    );
  });

  it("hides the character counter well below the max length", () => {
    mockUseAskAi();
    render(<AskAiPanel />);

    fireEvent.change(screen.getByTestId("ask-ai-input"), {
      target: { value: "short question" },
    });

    expect(screen.queryByTestId("ask-ai-counter")).not.toBeInTheDocument();
  });

  it("shows suggested question chips when the conversation is empty", () => {
    mockUseAskAi();
    render(<AskAiPanel />);

    expect(screen.getAllByTestId("ask-ai-suggestion")).toHaveLength(
      ASK_AI_SUGGESTED_QUESTIONS.length,
    );
  });

  it("submits a suggested question when its chip is clicked", () => {
    const { ask } = mockUseAskAi();
    render(<AskAiPanel />);

    fireEvent.click(screen.getAllByTestId("ask-ai-suggestion")[0] as Element);

    expect(ask).toHaveBeenCalledWith(ASK_AI_SUGGESTED_QUESTIONS[0]);
  });

  it("hides suggestion chips once the conversation has messages", () => {
    mockUseAskAi({ messages: [{ id: 1, role: "user", content: "Hi" }] });
    render(<AskAiPanel />);

    expect(screen.queryAllByTestId("ask-ai-suggestion")).toHaveLength(0);
  });

  it("does not force-scroll to the latest message when the user has scrolled away from the bottom", () => {
    mockUseAskAi({ messages: [{ id: 1, role: "user", content: "Hi" }] });
    const { rerender } = render(<AskAiPanel />);
    const log = screen.getByTestId("ask-ai-log");
    mockScrollMetrics(log, {
      scrollHeight: 1000,
      clientHeight: 200,
      scrollTop: 100,
    });
    fireEvent.scroll(log);

    mockUseAskAi({
      messages: [
        { id: 1, role: "user", content: "Hi" },
        { id: 2, role: "assistant", content: "Hello" },
      ],
    });
    rerender(<AskAiPanel />);

    expect(log.scrollTop).toBe(100);
  });

  it("scrolls to the latest message when already near the bottom", () => {
    mockUseAskAi({ messages: [{ id: 1, role: "user", content: "Hi" }] });
    const { rerender } = render(<AskAiPanel />);
    const log = screen.getByTestId("ask-ai-log");
    mockScrollMetrics(log, {
      scrollHeight: 220,
      clientHeight: 200,
      scrollTop: 20,
    });
    fireEvent.scroll(log);

    mockUseAskAi({
      messages: [
        { id: 1, role: "user", content: "Hi" },
        { id: 2, role: "assistant", content: "Hello" },
      ],
    });
    rerender(<AskAiPanel />);

    expect(log.scrollTop).toBe(log.scrollHeight);
  });
});
