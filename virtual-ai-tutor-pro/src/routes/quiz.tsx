import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2, Sparkle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { meta, PageHeader } from "@/components/PageHeader";
import { generateQuiz, type Quiz } from "@/lib/ai.functions";
import { update } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quiz")({
  head: () => meta("Quiz Generator — Virtual AI Tutor Pro", "Generate multiple-choice quizzes on any topic and see your score."),
  component: QuizPage,
});

type Diff = "easy" | "medium" | "hard";

function QuizPage() {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Diff>("easy");
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (topic.trim().length < 2) return;
    setBusy(true);
    setError("");
    setQuiz(null);
    setSubmitted(false);
    try {
      const q = await generateQuiz({ data: { topic: topic.trim(), difficulty, count } });
      setQuiz(q);
      setAnswers(q.questions.map(() => null));
    } catch (e) {
      setError((e as Error).message || "Could not create the quiz.");
    } finally {
      setBusy(false);
    }
  }

  const score = quiz ? quiz.questions.filter((q, i) => answers[i] === q.answerIndex).length : 0;

  function submit() {
    if (!quiz) return;
    setSubmitted(true);
    update((d) => ({
      ...d,
      quizzes: [...d.quizzes, { topic: topic.trim(), difficulty, score, total: quiz.questions.length, date: new Date().toISOString() }],
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <PageHeader title="Quiz Generator" subtitle="Pick a topic and test what you know." />
      <Card className="p-5">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic, e.g. Solar system, Fractions, JavaScript arrays" />
          <div className="flex flex-wrap items-center gap-2">
            {(["easy", "medium", "hard"] as Diff[]).map((d) => (
              <Button key={d} type="button" size="sm" variant={difficulty === d ? "default" : "outline"} onClick={() => setDifficulty(d)} className="capitalize">{d}</Button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">Questions:</span>
            {[5, 10].map((n) => (
              <Button key={n} type="button" size="sm" variant={count === n ? "default" : "outline"} onClick={() => setCount(n)}>{n}</Button>
            ))}
          </div>
          <Button type="submit" disabled={busy || topic.trim().length < 2} className="w-full sm:w-auto">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating quiz…</> : <><Sparkle className="h-4 w-4" /> Generate quiz</>}
          </Button>
        </form>
        {error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </Card>

      {quiz && submitted && (
        <Card className="mt-6 bg-gradient-brand p-6 text-center text-primary-foreground shadow-brand">
          <p className="text-sm opacity-80">Your score</p>
          <p className="text-5xl font-extrabold">{score}/{quiz.questions.length}</p>
          <p className="mt-1">{Math.round((score / quiz.questions.length) * 100)}% — {score / quiz.questions.length >= 0.8 ? "Excellent work!" : score / quiz.questions.length >= 0.5 ? "Good job, keep going!" : "Keep practicing, you've got this!"}</p>
          <Button variant="secondary" className="mt-4" onClick={create}>Try another quiz</Button>
        </Card>
      )}

      {quiz && (
        <div className="mt-6 space-y-4">
          {quiz.questions.map((q, qi) => (
            <Card key={qi} className="p-5">
              <p className="font-semibold">{qi + 1}. {q.question}</p>
              <div className="mt-3 grid gap-2">
                {q.options.map((o, oi) => {
                  const chosen = answers[qi] === oi;
                  const right = submitted && oi === q.answerIndex;
                  const wrong = submitted && chosen && oi !== q.answerIndex;
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition",
                        chosen && !submitted && "border-primary bg-accent",
                        right && "border-success bg-success/10",
                        wrong && "border-destructive bg-destructive/10",
                        !submitted && "hover:border-primary",
                      )}
                    >
                      {o}
                      {right && <Check className="h-4 w-4 text-success" />}
                      {wrong && <X className="h-4 w-4 text-destructive" />}
                    </button>
                  );
                })}
              </div>
              {submitted && <p className="mt-3 rounded-lg bg-muted p-3 text-sm"><b>Why:</b> {q.explanation}</p>}
            </Card>
          ))}
          {!submitted && (
            <Button size="lg" className="w-full" disabled={answers.some((a) => a === null)} onClick={submit}>
              {answers.some((a) => a === null) ? "Answer all questions to submit" : "Submit answers"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
