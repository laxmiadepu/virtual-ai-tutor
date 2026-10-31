import { describe, expect, it } from "vitest";
import { levelFromScores, streakDays } from "@/lib/level";

describe("levelFromScores", () => {
  it("no quizzes means Beginner", () => expect(levelFromScores([])).toBe("Beginner"));
  it("average under 50 is Beginner", () => expect(levelFromScores([40, 58])).toBe("Beginner"));
  it("average 50-79 is Intermediate", () => expect(levelFromScores([50])).toBe("Intermediate"));
  it("average 79.9 is Intermediate", () => expect(levelFromScores([79.9])).toBe("Intermediate"));
  it("average 80+ is Advanced", () => expect(levelFromScores([70, 90])).toBe("Advanced"));
});

describe("streakDays", () => {
  const today = new Date("2026-10-20T10:00:00Z");
  it("counts consecutive days", () =>
    expect(streakDays(["2026-10-18", "2026-10-19", "2026-10-20"], today)).toBe(3));
  it("breaks on a gap", () => expect(streakDays(["2026-10-17", "2026-10-20"], today)).toBe(1));
  it("zero with no recent activity", () => expect(streakDays(["2026-10-10"], today)).toBe(0));
});
