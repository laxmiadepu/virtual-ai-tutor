import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Code2, History, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Markdown, streamChat } from "@/components/StreamChat";
import { meta, PageHeader } from "@/components/PageHeader";
import { update } from "@/lib/store";
import {
  clearCodeHistory,
  formatDate,
  loadCodeHistory,
  saveCodeEntry,
  type CodeEntry,
} from "@/lib/codeHistory";

export const Route = createFileRoute("/code")({
  head: () => meta("Code Explainer — Virtual AI Tutor Pro", "Paste code and get a plain-language, line-by-line explanation."),
  component: CodeExplainer,
});

const SAMPLE = `def greet(names):
    for name in names:
        print(f"Hello, {name}!")

greet(["Asha", "Ravi"])`;

function preview(code: string): string {
  const firstLine = code.split("\n").find((l) => l.trim()) ?? "";
  return firstLine.length > 64 ? firstLine.slice(0, 64) + "…" : firstLine;
}

function CodeExplainer() {
  const [code, setCode] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<CodeEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  // Restore the most recent explanation after a refresh (browser only).
  useEffect(() => {
    const saved = loadCodeHistory();
    setHistory(saved);
    if (saved[0]) {
      setCode(saved[0].code);
      setOut(saved[0].explanation);
      setSelectedId(saved[0].id);
    }
  }, []);

  async function explain() {
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    setOut("");
    ctrl.current = new AbortController();
    try {
      const text = await streamChat("code", [{ role: "user", content: "Explain this code:\n\n```\n" + code + "\n```" }], setOut, ctrl.current.signal);
      saveCodeEntry(code, text);
      setHistory(loadCodeHistory());
      setSelectedId(null);
      update((d) => d);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openEntry(entry: CodeEntry) {
    setCode(entry.code);
    setOut(entry.explanation);
    setError("");
    setSelectedId(entry.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <PageHeader title="Code Explainer" subtitle="Paste any code. Get a simple explanation." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here…"
            className="min-h-[320px] font-mono text-sm"
          />
          <div className="mt-3 flex gap-2">
            {busy ? (
              <Button variant="outline" onClick={() => ctrl.current?.abort()}>Stop</Button>
            ) : (
              <Button onClick={explain} disabled={!code.trim()}><Code2 className="h-4 w-4" /> Explain code</Button>
            )}
            <Button variant="ghost" onClick={() => setCode(SAMPLE)}>Try a sample</Button>
          </div>
        </Card>
        <Card className="min-h-[320px] p-5">
          {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {!out && !error && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : "Your explanation will appear here."}
            </div>
          )}
          {out && <Markdown>{out}</Markdown>}
        </Card>
      </div>

      {history.length > 0 && (
        <Card className="mt-6 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Code History</h2>
              <Badge variant="secondary">{history.length}</Badge>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" /> Clear history
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all saved explanations?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all {history.length} saved explanation{history.length === 1 ? "" : "s"} from this browser. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      clearCodeHistory();
                      setHistory([]);
                      setSelectedId(null);
                    }}
                  >
                    Delete all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <ul className="divide-y">
            {history.map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => openEntry(entry)}
                  className="w-full rounded-lg px-2 py-3 text-left transition hover:bg-accent/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{entry.language}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                    </div>
                    {selectedId === entry.id && <span className="text-xs font-medium text-primary">Viewing</span>}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{preview(entry.code)}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
