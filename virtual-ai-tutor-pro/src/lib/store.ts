import { useEffect, useState } from "react";
import type { Roadmap } from "./ai.functions";

export type ChatMsg = { role: "user" | "assistant"; content: string };
export type QuizResult = { topic: string; difficulty: string; score: number; total: number; date: string };
export type AppData = {
  name: string;
  chat: ChatMsg[];
  quizzes: QuizResult[];
  roadmap: { subject: string; steps: Roadmap["steps"]; done: boolean[] } | null;
  activity: string[];
};

const KEY = "ai-tutor-pro-v1";
const empty: AppData = { name: "", chat: [], quizzes: [], roadmap: null, activity: [] };
const listeners = new Set<() => void>();
let cache: AppData | null = null;

function read(): AppData {
  if (cache) return cache;
  try {
    cache = { ...empty, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    cache = { ...empty };
  }
  return cache!;
}

export function update(fn: (d: AppData) => AppData) {
  const today = new Date().toISOString().slice(0, 10);
  const next = fn(read());
  if (!next.activity.includes(today)) next.activity = [...next.activity, today];
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

/** Returns stored data; empty defaults until hydrated in the browser. */
export function useAppData(): [AppData, boolean] {
  const [state, setState] = useState<AppData>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setState(read());
    sync();
    setReady(true);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return [state, ready];
}

export const pct = (q: QuizResult) => Math.round((q.score / q.total) * 100);
