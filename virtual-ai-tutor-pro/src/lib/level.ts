export type Level = "Beginner" | "Intermediate" | "Advanced";

/** Level from average quiz percentage: <50 Beginner, 50-79 Intermediate, >=80 Advanced. */
export function levelFromScores(percents: number[]): Level {
  if (percents.length === 0) return "Beginner";
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
  if (avg >= 80) return "Advanced";
  if (avg >= 50) return "Intermediate";
  return "Beginner";
}

/** Consecutive days (ending today or yesterday) with activity. Dates are YYYY-MM-DD. */
export function streakDays(days: string[], today: Date = new Date()): number {
  const set = new Set(days);
  const d = new Date(today);
  const key = (x: Date) => x.toISOString().slice(0, 10);
  if (!set.has(key(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(key(d))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}
