import type { Practice } from "@/lib/ai.functions";
import type { RunResult } from "@/lib/runCode";

/** Languages the practice panel can really execute. */
export type Lang = "python" | "java" | "c" | "cpp" | "javascript";

export const LANG_LABEL: Record<Lang, string> = {
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  javascript: "JavaScript",
};

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && Object.hasOwn(LANG_LABEL, v);
}

/** Include topic content so a replacement roadmap cannot inherit an old exercise. */
export function practiceKey(subject: string, stepIndex: number, title: string, description: string): string {
  return JSON.stringify([subject, stepIndex, title, description]);
}

export function solutionPasses(result: RunResult, expected: string): boolean {
  return result.ok && result.exitCode === 0 && outputMatches(result.stdout, expected);
}

export function canCompletePractice(results: boolean[]): boolean {
  return results.length > 0 && results.every(Boolean);
}

/** Default language for a roadmap subject; null when the subject is not about coding. */
export function languageForSubject(subject: string): Lang | null {
  const s = subject.toLowerCase();
  if (/javascript|\bjs\b|node\b/.test(s)) return "javascript";
  if (/c\+\+|\bcpp\b/.test(s)) return "cpp";
  if (/\bjava\b/.test(s)) return "java";
  if (/\bpython\b/.test(s)) return "python";
  if (/c\+\+|\bc\b|c programming|c language/.test(s)) return "c";
  if (/program|cod(e|ing)|computer science|algorithm|data structure/.test(s)) return "python";
  return null;
}

/** A topic is correct only when the real output equals the expected output. */
export function outputMatches(actual: string, expected: string): boolean {
  const norm = (s: string) =>
    s
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trim())
      .join("\n")
      .trim();
  return norm(actual) === norm(expected);
}

const DRAFT_KEY = "ai-tutor-pro-practice-v1";
const CACHE_KEY = "ai-tutor-pro-practice-data-v1";

export type Draft = { code: string; language: string };

/** Saved code draft for one roadmap topic; survives page refreshes. */
export function loadDraft(topicKey: string): Draft | null {
  try {
    const map = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    const d = map?.[topicKey];
    if (d && typeof d.code === "string" && typeof d.language === "string") return d;
    return null;
  } catch {
    return null;
  }
}

export function saveDraft(topicKey: string, code: string, language: string): void {
  try {
    const map = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    map[topicKey] = { code, language };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(map));
  } catch {
    // Storage full or unavailable — drafts are best-effort.
  }
}

/** Cached generated practice for one topic so it is not regenerated on every visit. */
export function loadCachedPractice(topicKey: string): Practice | null {
  try {
    const map = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    const p = map?.[topicKey];
    if (p && typeof p === "object" && typeof p.isCodingTopic === "boolean") return p as Practice;
    return null;
  } catch {
    return null;
  }
}

export function saveCachedPractice(topicKey: string, practice: Practice): void {
  try {
    const map = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    map[topicKey] = practice;
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // Storage full or unavailable — cache is best-effort.
  }
}

const KEYWORDS: Record<Lang, string[]> = {
  python: ["def", "return", "if", "elif", "else", "for", "while", "in", "import", "from", "as", "class", "try", "except", "finally", "with", "lambda", "None", "True", "False", "and", "or", "not", "pass", "break", "continue", "print", "range", "input", "int", "str", "float", "len"],
  java: ["public", "private", "protected", "class", "interface", "static", "void", "int", "long", "double", "float", "boolean", "char", "String", "new", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "finally", "throw", "throws", "import", "package", "this", "super", "extends", "implements", "final", "null", "true", "false"],
  c: ["int", "char", "float", "double", "void", "long", "short", "unsigned", "signed", "struct", "union", "enum", "typedef", "const", "static", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "sizeof", "include", "define", "NULL", "printf", "scanf", "main"],
  cpp: ["int", "char", "float", "double", "void", "bool", "class", "struct", "public", "private", "protected", "namespace", "using", "template", "typename", "new", "delete", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "throw", "const", "static", "std", "cout", "cin", "endl", "vector", "string", "include", "main"],
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "finally", "throw", "class", "extends", "new", "this", "typeof", "instanceof", "null", "undefined", "true", "false", "async", "await", "of", "in", "import", "export", "console"],
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

/** Tiny syntax highlighter. Returns HTML; all text is escaped first. */
export function highlightCode(code: string, language: string): string {
  const kw = new Set(KEYWORDS[(language as Lang) in KEYWORDS ? (language as Lang) : "python"]);
  const comment =
    language === "python"
      ? "#[^\\n]*"
      : language === "java" || language === "javascript"
        ? "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/"
        : "\\/\\/[^\\n]*|#[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
  const re = new RegExp(
    `(${comment})|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_$][\\w$]*)`,
    "g",
  );
  let out = "";
  let last = 0;
  code.replace(re, (match, com, str, num, word, offset: number) => {
    out += escapeHtml(code.slice(last, offset));
    if (com) out += `<span class="hl-com">${escapeHtml(com)}</span>`;
    else if (str) out += `<span class="hl-str">${escapeHtml(str)}</span>`;
    else if (num) out += `<span class="hl-num">${escapeHtml(num)}</span>`;
    else if (word && kw.has(word)) out += `<span class="hl-kw">${escapeHtml(word)}</span>`;
    else out += escapeHtml(match);
    last = offset + match.length;
    return match;
  });
  out += escapeHtml(code.slice(last));
  return out;
}
