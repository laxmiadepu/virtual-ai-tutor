import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Flame, ListChecks, Target, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { meta } from "@/components/PageHeader";
import { navItems } from "@/components/AppSidebar";
import { pct, update, useAppData } from "@/lib/store";
import { levelFromScores, streakDays } from "@/lib/level";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => meta("Dashboard — Virtual AI Tutor Pro", "Your personal AI learning dashboard: level, progress and next topic."),
  component: Dashboard,
});

function Dashboard() {
  const [data, ready] = useAppData();
  const [name, setName] = useState("");
  const scores = data.quizzes.map(pct);
  const level = levelFromScores(scores);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const done = data.roadmap?.done.filter(Boolean).length ?? 0;
  const total = data.roadmap?.steps.length ?? 0;
  const nextIdx = data.roadmap?.done.findIndex((d) => !d) ?? -1;
  const next = nextIdx >= 0 ? data.roadmap!.steps[nextIdx] : null;

  const stats = [
    { label: "Level", value: level, icon: Target },
    { label: "Quizzes taken", value: data.quizzes.length, icon: ListChecks },
    { label: "Average score", value: `${avg}%`, icon: Trophy },
    { label: "Day streak", value: streakDays(data.activity), icon: Flame },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-brand p-6 text-primary-foreground shadow-brand md:p-10">
        <p className="text-sm opacity-80">Welcome back</p>
        <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">
          {ready && data.name ? `Hi, ${data.name}!` : "Hi, learner!"}
        </h1>
        <p className="mt-2 max-w-lg opacity-90">Ask questions, test yourself, and follow a plan made for your level.</p>
        {ready && !data.name && (
          <form
            className="mt-5 flex max-w-sm gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) update((d) => ({ ...d, name: name.trim() }));
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What's your name?"
              className="border-0 bg-card text-foreground"
            />
            <Button type="submit" variant="secondary">Save</Button>
          </form>
        )}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10" />
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold">Next topic</h2>
          {next ? (
            <>
              <p className="mt-3 text-lg font-bold">{next.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{next.description}</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span>{data.roadmap!.subject}</span>
                  <span>{done}/{total}</span>
                </div>
                <Progress value={(done / total) * 100} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {data.roadmap ? "You finished your roadmap. Make a new one!" : "Create a roadmap to get a suggested next topic."}
            </p>
          )}
          <Button asChild className="mt-5">
            <Link to="/roadmap">Open roadmap <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold">Recent quizzes</h2>
          {data.quizzes.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No quizzes yet. Take one to find your level.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.quizzes.slice(-4).reverse().map((q, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="truncate">{q.topic}</span>
                  <span className="font-semibold text-primary">{pct(q)}%</span>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" className="mt-5">
            <Link to="/quiz">Take a quiz</Link>
          </Button>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {navItems.slice(1).map((n) => (
          <Link key={n.url} to={n.url} className="group rounded-2xl border bg-card p-4 transition hover:border-primary hover:shadow-brand">
            <n.icon className="h-6 w-6 text-primary transition group-hover:scale-110" />
            <p className="mt-2 text-sm font-semibold">{n.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
