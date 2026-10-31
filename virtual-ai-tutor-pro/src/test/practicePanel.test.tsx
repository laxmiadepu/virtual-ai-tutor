import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PracticePanel } from "@/components/PracticePanel";
import { loadDraft, practiceKey, saveCachedPractice, saveDraft } from "@/lib/practice";

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/ai.functions", () => ({ generatePractice: vi.fn() }));
vi.mock("@/lib/runCode", () => ({ runCode: vi.fn() }));
vi.mock("@/components/StreamChat", () => ({ Markdown: () => null, streamChat: vi.fn() }));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

it("does not overwrite a saved program with empty code while restoring after refresh", async () => {
  const key = practiceKey("Python", 0, "Variables", "Add numbers");
  saveDraft(key, "print(30)", "python");
  saveCachedPractice(key, {
    isCodingTopic: true, language: "python", concept: "Addition", example: null,
    practice: {
      question: "Add two numbers", referenceSolution: "print(30)", starterCode: "# TODO",
      sampleInput: "", expectedOutput: "30",
      testCases: [{ input: "", expectedOutput: "30" }, { input: "", expectedOutput: "30" }],
    },
  });
  const view = render(<PracticePanel subject="Python" level="Beginner" stepIndex={0} title="Variables" description="Add numbers" completed={false} onComplete={() => {}} />);
  await waitFor(() => expect(view.getByRole("textbox", { name: "Code editor" })).toHaveValue("print(30)"));
  expect(loadDraft(key)).toEqual({ code: "print(30)", language: "python" });
  view.unmount();
  expect(loadDraft(key)).toEqual({ code: "print(30)", language: "python" });
});