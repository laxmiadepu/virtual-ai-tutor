import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bug, CheckCircle2, Eraser, Loader2, Play, RotateCcw, Sparkles, Wand2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Markdown, streamChat } from "@/components/StreamChat";
import { CodeEditor } from "@/components/CodeEditor";
import { generatePractice, type Practice } from "@/lib/ai.functions";
import { runCode, type RunResult } from "@/lib/runCode";
import {
  LANG_LABEL,
  isLang,
  languageForSubject,
  loadCachedPractice,
  loadDraft,
  practiceKey,
  solutionPasses,
  canCompletePractice,
  saveCachedPractice,
  saveDraft,
  type Lang,
} from "@/lib/practice";
import { cn } from "@/lib/utils";

type TestResult = { input: string; expected: string; actual: string; pass: boolean };

const HELP_PROMPTS = {
  explain: "Explain this code line by line in simple words for a beginner:",
  errors: "Find and explain any errors or bugs in this code, and how to fix them:",
  improve: "Suggest simple improvements for this code, one by one:",
} as const;

export function PracticePanel({
  subject,
  level,
  stepIndex,
  title,
  description,
  completed,
  onComplete,
}: {
  subject: string;
  level: string;
  stepIndex: number;
  title: string;
  description: string;
  completed: boolean;
  onComplete: () => void;
}) {
  const topicKey = practiceKey(subject, stepIndex, title, description);
  const generatePracticeFn = useServerFn(generatePractice);
  const runCodeFn = ({ data }: { data: { language: Lang; code: string; stdin: string } }) => runCode(data.language, data.code, data.stdin);
  const [practice, setPractice] = useState<Practice | null>(null);
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Lang>("python");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<RunResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [help, setHelp] = useState("");
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpError, setHelpError] = useState("");
  const ctrl = useRef<AbortController | null>(null);

  // Restore cached practice and saved draft after a refresh (browser only).
  useEffect(() => {
    setLanguage(languageForSubject(subject) ?? "python");
    const cached = loadCachedPractice(topicKey);
    const draft = loadDraft(topicKey);
    if (draft && isLang(draft.language)) setLanguage(draft.language);
    if (cached?.isCodingTopic && cached.practice?.referenceSolution && cached.practice.testCases?.length) {
      setPractice(cached);
      setCode(draft?.code ?? cached.practice.starterCode ?? "");
      if (!draft && isLang(cached.language)) setLanguage(cached.language);
      setStdin(cached.practice.sampleInput ?? "");
    } else if (draft) {
      setCode(draft.code);
    }
    setRestored(true);
  }, [topicKey]);

  useEffect(() => () => { ctrl.current?.abort(); }, []);

  // Autosave the draft so it survives a refresh.
  useEffect(() => {
    if (!restored || loading) return;
    const t = setTimeout(() => saveDraft(topicKey, code, language), 400);
    return () => {
      clearTimeout(t);
      saveDraft(topicKey, code, language);
    };
  }, [code, language, topicKey, practice, loading, restored]);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const p = await generatePracticeFn({ data: { subject, level: level as "Beginner" | "Intermediate" | "Advanced", title, description } });
      if (p.isCodingTopic && p.practice) {
        setPractice(p);
        saveCachedPractice(topicKey, p);
        const draft = loadDraft(topicKey);
        setCode(draft?.code ?? p.practice.starterCode ?? "");
        if (!draft && isLang(p.language)) setLanguage(p.language);
        setStdin(p.practice.sampleInput ?? "");
        setOutput(null);
        setResults(null);
      } else {
        setError("This topic is not a coding topic, so practice code is not available here.");
      }
    } catch (e) {
      setError((e as Error).message || "Could not prepare the practice. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    if (!code.trim()) return;
    setRunning(true);
    setOutput(null);
    try {
      const res = await runCodeFn({ data: { language, code, stdin } });
setOutput(res);
const expected = practice?.practice?.expectedOutput;
if (
  !completed &&
  expected &&
  language === practice?.language &&
  solutionPasses(res, expected))
 {
  onComplete();
}
    } catch {
      setOutput({ ok: false, error: "Execution is not configured right now. Please try again." });
    } finally {
      setRunning(false);
    }
  }

  /** Runs every test case against the real runtime; a topic only counts as done when all pass. */
  async function check() {
    if (!practice?.practice?.testCases?.length) return;
    setChecking(true);
    setError("");
    setResults(null);
    const done: TestResult[] = [];
    try {
      if (!practice.practice.referenceSolution || language !== practice.language) {
        setError("Use the exercise’s original language to check your solution. You can run other languages separately.");
        return;
      }
      for (const c of practice.practice.testCases) {
        const reference = await runCodeFn({ data: { language, code: practice.practice.referenceSolution, stdin: c.input ?? "" } });
        if (!solutionPasses(reference, c.expectedOutput)) {
          setError(reference.ok ? "The exercise’s test cases could not be validated. Prepare a new exercise." : reference.error);
          return;
        }
        const r = await runCodeFn({ data: { language, code, stdin: c.input ?? "" } });
        const actual = r.ok ? r.stdout : `Program error: ${r.error}`;
        done.push({ input: c.input ?? "", expected: c.expectedOutput ?? "", actual, pass: solutionPasses(r, c.expectedOutput ?? "") });
      }
      setResults(done);
      if (canCompletePractice(done.map((r) => r.pass))) onComplete();
    } catch {
      setError("Could not check your solution. Your progress has not changed; please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function askHelp(kind: keyof typeof HELP_PROMPTS) {
    setHelp("");
    setHelpError("");
    setHelpBusy(true);
    ctrl.current = new AbortController();
    try {
      await streamChat(
        "code",
        [{ role: "user", content: `${HELP_PROMPTS[kind]}\n\nLanguage: ${LANG_LABEL[language]}\n\n\`\`\`\n${code}\n\`\`\`` }],
        setHelp,
        ctrl.current.signal,
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") setHelpError((e as Error).message);
    } finally {
      setHelpBusy(false);
    }
  }

  if (!practice) {
    return (
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <p className="text-sm text-muted-foreground">
          Practice this topic with a real code editor. The exercise, example and test cases are prepared by your AI tutor.
        </p>
        <Button onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Preparing practice…" : "Start practice"}
        </Button>
      </div>
    );
  }

  const pr = practice.practice;
  if (!pr) return null;
  const ex = practice.example;

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {completed && (
        <p className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" /> Topic completed — great job!
        </p>
      )}

      {/* 1. Concept */}
      <div>
        <h3 className="flex items-center gap-2 font-semibold">1. The idea</h3>
        <p className="mt-1 text-sm text-muted-foreground">{practice.concept}</p>
      </div>

      {/* 2. Example program */}
      {ex?.code && (
        <div>
          <h3 className="font-semibold">2. Example program</h3>
          {ex.title && <p className="mt-1 text-sm font-medium">{ex.title}</p>}
          <div className="mt-2">
              <CodeEditor value={ex.code} onChange={() => {}} language={practice.language ?? language} ariaLabel="Example program" readOnly />
          </div>
          {ex.explanation && <p className="mt-2 text-sm text-muted-foreground">{ex.explanation}</p>}
        </div>
      )}

      {/* 3. Practice question */}
      <div>
        <h3 className="font-semibold">3. Your turn</h3>
        <p className="mt-1 text-sm">{pr.question}</p>
        {(pr.sampleInput || pr.expectedOutput) && (
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg bg-muted p-2">
              <p className="font-semibold text-muted-foreground">Sample input</p>
              <pre className="whitespace-pre-wrap font-mono">{pr.sampleInput || "(none)"}</pre>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="font-semibold text-muted-foreground">Expected output</p>
              <pre className="whitespace-pre-wrap font-mono">{pr.expectedOutput || "(none)"}</pre>
            </div>
          </div>
        )}
      </div>

      {/* 4. Editor */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">4. Code editor</h3>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={(v) => isLang(v) && setLanguage(v)}>
              <SelectTrigger className="h-8 w-[130px]" aria-label="Programming language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANG_LABEL).map(([v, label]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">{LANG_LABEL[language]}</Badge>
          </div>
        </div>
        <CodeEditor value={code} onChange={setCode} language={language} />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCode("")}><Eraser className="h-4 w-4" /> Clear code</Button>
          <Button variant="ghost" size="sm" onClick={() => setCode(pr.starterCode ?? "")}><RotateCcw className="h-4 w-4" /> Reset code</Button>
        </div>
      </div>

      {/* 5-6. Run and output */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={run} disabled={running || checking || !code.trim()}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run code
          </Button>
          <Button variant="outline" onClick={check} disabled={checking || running || !code.trim()}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Check my solution
          </Button>
        </div>
        <Textarea
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder="Input for the program (if it asks for input)…"
          rows={2}
          className="mt-2 font-mono text-sm"
          aria-label="Program input"
        />
        <div className="mt-2 rounded-lg bg-muted p-3">
          <p className="text-xs font-semibold text-muted-foreground">Output</p>
          {output && !output.ok && <p className="mt-1 text-sm text-destructive">{output.error}</p>}
          {output?.ok && (
            <>
              {output.compileOutput && <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-destructive">{output.compileOutput}</pre>}
              <pre className="mt-1 whitespace-pre-wrap font-mono text-sm">{output.stdout || "(no output)"}</pre>
              {output.stderr && <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-destructive">{output.stderr}</pre>}
            </>
          )}
          {!output && <p className="mt-1 text-sm text-muted-foreground">Run your code to see the real output here.</p>}
        </div>
      </div>

      {/* 8. AI assistance */}
      <div>
        <h3 className="font-semibold">5. Need help?</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => askHelp("explain")} disabled={helpBusy}><Sparkles className="h-4 w-4" /> Explain code</Button>
          <Button variant="outline" size="sm" onClick={() => askHelp("errors")} disabled={helpBusy}><Bug className="h-4 w-4" /> Find errors</Button>
          <Button variant="outline" size="sm" onClick={() => askHelp("improve")} disabled={helpBusy}><Wand2 className="h-4 w-4" /> Suggest improvements</Button>
          {helpBusy && <Button variant="ghost" size="sm" onClick={() => ctrl.current?.abort()}>Stop</Button>}
        </div>
        {helpError && <p className="mt-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{helpError}</p>}
        {help && <div className="mt-2 rounded-lg bg-muted p-3"><Markdown>{help}</Markdown></div>}
      </div>
      {/* 7. Test results and progress */}
      {results && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className={cn("rounded-lg border p-3 text-sm", r.pass ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10")}>
              <p className="flex items-center gap-1.5 font-medium">
                {r.pass ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                Test case {i + 1} {r.pass ? "passed" : "failed"}
              </p>
              <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                <div>Input: <code className="font-mono">{r.input || "(none)"}</code></div>
                <div>Expected: <code className="font-mono">{r.expected || "(none)"}</code></div>
                <div>Got: <code className="font-mono">{r.actual.trim() || "(empty)"}</code></div>
              </div>
            </div>
          ))}
          {canCompletePractice(results.map((r) => r.pass)) && (
            <p className="text-sm font-medium text-success">All test cases passed — this topic is now marked done!</p>
          )}
          {!canCompletePractice(results.map((r) => r.pass)) && (
            <p className="text-sm text-muted-foreground">Fix the failing cases and check again. A topic is complete only when every test case passes.</p>
          )}
        </div>
      )}

    </div>
  );
}
