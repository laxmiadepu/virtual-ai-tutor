/** Saved code explanations, stored in localStorage (no login needed). */

export type CodeEntry = {
  id: string;
  code: string;
  explanation: string;
  language: string;
  date: string; // ISO timestamp
};

const KEY = "ai-tutor-pro-code-history-v1";
export const MAX_ENTRIES = 20;

/** Best-effort language guess from the code's shape. */
export function detectLanguage(code: string): string {
  const s = code.slice(0, 4000);
  const has = (re: RegExp) => re.test(s);
  if (has(/^\s*(def |class \w+.*:|import \w|from \w+ import|print\(|elif\b)/m) || has(/^\s*@\w+/m)) return "Python";
  if (has(/\b(function|const|let|var)\b|=>|console\.log/)) {
    if (has(/\b(interface|type)\s+\w+\s*[={]|:\s*(string|number|boolean)\b/)) return "TypeScript";
    return "JavaScript";
  }
  if (has(/\bpublic\s+(static\s+)?(class|void)\b|System\.out\.print/)) return "Java";
  if (has(/#include\b|std::/)) return "C++";
  if (has(/\bprintf\s*\(|int\s+main\s*\(/)) return "C";
  if (has(/\busing\s+System\b|\bnamespace\s+\w+/)) return "C#";
  if (has(/\bfunc\s+\w+\(|package\s+main\b/)) return "Go";
  if (has(/\bfn\s+\w+\(|let\s+mut\b/)) return "Rust";
  if (has(/\bSELECT\b[\s\S]*\bFROM\b/i)) return "SQL";
  if (has(/<\/?(html|body|div|p|span|head)\b/i)) return "HTML";
  if (has(/^[.#]?[\w-]+\s*\{[^}]*:[^}]*;/m) && !has(/function|def /)) return "CSS";
  if (has(/^\s*[{[][\s\S]*[}\]]\s*$/m) && has(/"[^"]+"\s*:/)) return "JSON";
  return "Code";
}

/** Newest first. Tolerates missing or corrupted storage. */
export function loadCodeHistory(): CodeEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is CodeEntry =>
        !!e &&
        typeof e === "object" &&
        typeof (e as CodeEntry).id === "string" &&
        typeof (e as CodeEntry).code === "string" &&
        typeof (e as CodeEntry).explanation === "string" &&
        typeof (e as CodeEntry).language === "string" &&
        typeof (e as CodeEntry).date === "string",
    );
  } catch {
    return [];
  }
}

/** Saves an explanation at the top, drops an older copy of the same code, caps at 20. */
export function saveCodeEntry(code: string, explanation: string): CodeEntry[] {
  const entry: CodeEntry = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    code,
    explanation,
    language: detectLanguage(code),
    date: new Date().toISOString(),
  };
  const next = [entry, ...loadCodeHistory().filter((e) => e.code !== code)].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — history is best-effort.
  }
  return next;
}

export function clearCodeHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
