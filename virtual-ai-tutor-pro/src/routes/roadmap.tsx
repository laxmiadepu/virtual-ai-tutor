import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Clock, Loader2, Map } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { PracticePanel } from "@/components/PracticePanel";
import { languageForSubject, practiceKey } from "@/lib/practice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { meta, PageHeader } from "@/components/PageHeader";
import { generateRoadmap } from "@/lib/ai.functions";
import { pct, update, useAppData } from "@/lib/store";
import { levelFromScores } from "@/lib/level";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/roadmap")({
  head: () => meta("Learning Roadmap — Virtual AI Tutor Pro", "A step-by-step learning plan matched to your level."),
  component: RoadmapPage,
});

function RoadmapPage() {
  const [data] = useAppData();
  const level = levelFromScores(data.quizzes.map(pct));
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openTopic, setOpenTopic] = useState<number | null>(null);
  const generateRoadmapFn = useServerFn(generateRoadmap);
  const rm = data.roadmap;
  const done = rm?.done.filter(Boolean).length ?? 0;

  function useDemoPythonRoadmap() {
    // Explicitly labeled offline demo, not an AI-generated roadmap.
    const steps = [
      { title: "Getting Started", description: "Write and run your first Python Hello World program.", minutes: 20 },
      { title: "Basic Syntax and Data Types", description: "Use variables, integers, strings and basic arithmetic operators.", minutes: 40 },
      { title: "Control Structures and Loops", description: "Practice if statements and for/while loops.", minutes: 50 },
      { title: "Functions", description: "Define and call functions that return results.", minutes: 45 },
      { title: "Lists and Arrays", description: "Store and process several values in a list.", minutes: 45 },
      { title: "Mini Project", description: "Combine loops, lists and functions in a small program.", minutes: 60 },
    ];
    update((d) => ({ ...d, roadmap: { subject: "Python Programming", steps, done: steps.map(() => false) } }));
    setError("");
    setOpenTopic(null);
    setSubject("");
  }

  async function create() {
    if (subject.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      const r = await generateRoadmapFn({ data: { subject: subject.trim(), level } });
      update((d) => ({ ...d, roadmap: { subject: subject.trim(), steps: r.steps, done: r.steps.map(() => false) } }));
      setOpenTopic(null);
      setSubject("");
    } catch (e) {
      setError((e as Error).message || "Could not create the roadmap.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <PageHeader
        title="Learning Roadmap"
        subtitle="A plan made for your level. Your level updates from your quiz scores."
        action={<Badge className="bg-gradient-brand px-3 py-1 text-sm">Level: {level}</Badge>}
      />
      <Card className="p-5">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you want to learn? e.g. Algebra, Python, World History" />
          <Button type="submit" disabled={busy || subject.trim().length < 2}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Map className="h-4 w-4" />} {rm ? "New roadmap" : "Create roadmap"}
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={useDemoPythonRoadmap} disabled={busy}>
            Use sample Python roadmap (offline)
          </Button>
          <span className="text-xs text-muted-foreground">Built-in example; doesn't require AI or credits.</span>
        </div>
        {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </Card>

      {rm && (
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">{rm.subject}</span>
            <span className="text-muted-foreground">{done} of {rm.steps.length} done</span>
          </div>
          <Progress value={(done / rm.steps.length) * 100} />
          <ol className="relative mt-6 space-y-3 border-l-2 border-accent pl-6">
            {rm.steps.map((s, i) => {
              const coding = languageForSubject(rm.subject) !== null || languageForSubject(`${s.title} ${s.description}`) !== null;
              return (
              <li key={i}>
                <Button
                  variant="ghost"
                  aria-expanded={openTopic === i}
                  aria-controls={`topic-${i}`}
                  onClick={() => setOpenTopic(openTopic === i ? null : i)}
                  className={cn("relative block h-auto w-full whitespace-normal rounded-2xl border bg-card p-4 text-left transition hover:border-primary", rm.done[i] && "opacity-70")}
                >
                  <span className="absolute -left-[37px] top-4 rounded-full bg-background">
                    {rm.done[i] ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6 text-primary" />}
                  </span>
                  <span className={cn("flex items-center justify-between gap-3 font-semibold", rm.done[i] && "line-through")}>Step {i + 1}: {s.title.replace(/^\s*step\s*\d+\s*[:.)-]\s*/i, "")}<ChevronDown className={cn("shrink-0 transition-transform", openTopic === i && "rotate-180")} /></span>
                  <span className="mt-1 block text-sm text-muted-foreground">{s.description}</span>
                  <span className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {s.minutes} min</span>
                </Button>
                {openTopic === i && (
                  <div id={`topic-${i}`} className="space-y-4 px-1 py-5 sm:px-4">
                    <div>
                      <h3 className="font-semibold">Topic explanation</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    </div>
                    {coding ? (
                      <section className="min-w-0 border-t pt-4">
                        <h2 className="mb-3 text-lg font-semibold">Practice Code</h2>
                        <PracticePanel
                          key={practiceKey(rm.subject, i, s.title, s.description)}
                          subject={rm.subject} level={level} stepIndex={i}
                          title={s.title} description={s.description} completed={Boolean(rm.done[i])}
                          onComplete={() => update((d) => ({ ...d, roadmap: d.roadmap && {
                            ...d.roadmap, done: d.roadmap.done.map((v, j) => j === i ? true : v),
                          } }))}
                        />
                      </section>
                    ) : (
                      <Button variant="outline" onClick={() => update((d) => ({ ...d, roadmap: d.roadmap && { ...d.roadmap, done: d.roadmap.done.map((v, j) => j === i ? !v : v) } }))}>
                        <CheckCircle2 /> {rm.done[i] ? "Mark not done" : "Mark done"}
                      </Button>
                    )}
                    {coding && rm.done[i] && <Button variant="ghost" onClick={() => update((d) => ({ ...d, roadmap: d.roadmap && { ...d.roadmap, done: d.roadmap.done.map((v, j) => j === i ? false : v) } }))}>Reset topic progress</Button>}
                  </div>
                )}
              </li>
            ); })}
          </ol>
        </div>
      )}
    </div>
  );
}
