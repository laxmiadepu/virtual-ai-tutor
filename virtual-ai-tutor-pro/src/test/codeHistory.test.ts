import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCodeHistory,
  detectLanguage,
  loadCodeHistory,
  MAX_ENTRIES,
  saveCodeEntry,
} from "@/lib/codeHistory";

beforeEach(() => {
  localStorage.clear();
});

describe("code history storage", () => {
  it("saves an entry and reads it back (survives a page refresh)", () => {
    saveCodeEntry("def hi(): pass", "This defines a function.");
    const all = loadCodeHistory();
    expect(all).toHaveLength(1);
    expect(all[0]?.code).toBe("def hi(): pass");
    expect(all[0]?.explanation).toBe("This defines a function.");
  });

  it("detects the language when possible", () => {
    saveCodeEntry("def greet():\n    print('hi')", "python explanation");
    saveCodeEntry("const x = () => console.log(x);", "js explanation");
    const all = loadCodeHistory();
    expect(all[0]?.language).toBe("JavaScript");
    expect(all[1]?.language).toBe("Python");
  });

  it("labels code it cannot identify", () => {
    expect(detectLanguage("hello world")).toBe("Code");
  });

  it("keeps only the latest 20 entries", () => {
    for (let i = 0; i < 25; i++) saveCodeEntry(`code ${i}`, "explanation");
    const all = loadCodeHistory();
    expect(all).toHaveLength(MAX_ENTRIES);
    expect(all[0]?.code).toBe("code 24");
    expect(all[19]?.code).toBe("code 5");
  });

  it("re-running the same code updates it instead of duplicating", () => {
    saveCodeEntry("a", "one");
    saveCodeEntry("b", "two");
    saveCodeEntry("a", "one again");
    const all = loadCodeHistory();
    expect(all).toHaveLength(2);
    expect(all[0]?.explanation).toBe("one again");
  });

  it("clear history removes everything", () => {
    saveCodeEntry("x", "y");
    clearCodeHistory();
    expect(loadCodeHistory()).toHaveLength(0);
  });

  it("ignores corrupted saved data", () => {
    localStorage.setItem("ai-tutor-pro-code-history-v1", "{not json");
    expect(loadCodeHistory()).toHaveLength(0);
  });
});
