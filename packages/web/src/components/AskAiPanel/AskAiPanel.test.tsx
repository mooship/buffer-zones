import * as stratumReact from "@stratum/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ASK_AI_MAX_MESSAGE_LENGTH } from "../../constants/askAi";
import { AskAiPanel } from "./AskAiPanel";

function mockUseAskAi(overrides?: {
  messages?: stratumReact.AskAiMessage[];
  status?: stratumReact.AskAiStatus;
  error?: string | null;
  ask?: (question: string) => Promise<void>;
}) {
  const ask = overrides?.ask ?? vi.fn(async () => {});
  vi.spyOn(stratumReact, "useAskAi").mockReturnValue({
    messages: overrides?.messages ?? [],
    status: overrides?.status ?? "idle",
    error: overrides?.error ?? null,
    ask,
    reset: vi.fn(),
  });
  return { ask };
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

  it("shows a typing indicator for an empty in-progress assistant reply", () => {
    mockUseAskAi({
      status: "streaming",
      messages: [
        { id: 1, role: "user", content: "Hi" },
        { id: 2, role: "assistant", content: "" },
      ],
    });

    render(<AskAiPanel />);

    const assistantMessage = screen.getByText("Assistant").closest("p");
    expect(assistantMessage).toHaveTextContent("…");
  });

  it("shows the error message as an alert when the request fails", () => {
    mockUseAskAi({ status: "error", error: "Too many requests" });

    render(<AskAiPanel />);

    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests");
  });

  it("caps the textarea at the shared max message length", () => {
    mockUseAskAi();

    render(<AskAiPanel />);

    expect(screen.getByTestId("ask-ai-input")).toHaveAttribute(
      "maxlength",
      String(ASK_AI_MAX_MESSAGE_LENGTH),
    );
  });
});
