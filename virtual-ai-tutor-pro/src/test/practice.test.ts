import { beforeEach, describe, expect, it } from "vitest";
import { canCompletePractice, languageForSubject, loadDraft, practiceKey, saveDraft, solutionPasses } from "@/lib/practice";

describe("Programming practice rules", () => {
  beforeEach(() => localStorage.clear());
  it.each([["Python Programming", "python"], ["Java", "java"], ["C Programming", "c"], ["C++", "cpp"], ["JavaScript", "javascript"]])("selects the language for %s", (subject, language) => {
    expect(languageForSubject(subject)).toBe(language);
  });
  it("does not add programming practice to history", () => {
    expect(languageForSubject("World History")).toBeNull();
  });
  it("requires matching actual program output", () => {
    const result = { ok: true as const, stdout: "30\n", stderr: "", compileOutput: "", exitCode: 0 };
    expect(solutionPasses(result, "30")).toBe(true);
    expect(solutionPasses(result, "20")).toBe(false);
  });
  it("does not complete a program that prints correctly but exits with an error", () => {
    expect(solutionPasses({ ok: true, stdout: "30", stderr: "error", compileOutput: "", exitCode: 1 }, "30")).toBe(false);
  });
  it("does not complete an exercise when execution is unavailable", () => {
    expect(solutionPasses({ ok: false, error: "unavailable" }, "30")).toBe(false);
  });
  it("requires every test case to pass, not merely Run Code", () => {
    expect(canCompletePractice([])).toBe(false);
    expect(canCompletePractice([true, false])).toBe(false);
    expect(canCompletePractice([true, true])).toBe(true);
  });
  it("restores each topic's code and language from browser storage", () => {
    const key = practiceKey("Python", 0, "Variables", "Add numbers");
    saveDraft(key, "print(30)", "python");
    expect(loadDraft(key)).toEqual({ code: "print(30)", language: "python" });
    expect(loadDraft(practiceKey("Python", 1, "Loops", "Repeat numbers"))).toBeNull();
  });
  it("does not reuse drafts when a new roadmap changes the topic", () => {
    expect(practiceKey("Python", 0, "Variables", "Add numbers")).not.toBe(practiceKey("Python", 0, "Loops", "Repeat numbers"));
  });
});