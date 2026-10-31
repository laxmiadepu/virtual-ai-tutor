import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { meta, PageHeader } from "@/components/PageHeader";
import { pct, update, useAppData } from "@/lib/store";
import { levelFromScores, streakDays } from "@/lib/level";

export const Route = createFileRoute("/progress")({
  head: () => meta("Progress Tracker — Virtual AI Tutor Pro", "Track completed lessons, quiz scores and your learning streak."),
  component: ProgressPage,
});

function ProgressPage() {
  const [data, ready] = useAppData();
  const scores = data.quizzes.map(pct);
  const lessonsDone = data.roadmap?.done.filter(Boolean).length ?? 0;
  const lessonsTotal = data.roadmap?.steps.length ?? 0;
  const chart = data.quizzes.map((q, i) => ({ name: `#${i + 1}`, score: pct(q), topic: q.topic }));

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader title="Progress Tracker" subtitle="See how far you've come." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted-foreground">Level</p><p className="mt-1 text-2xl font-bold text-gradient-brand">{levelFromScores(scores)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Day streak</p><p className="mt-1 text-2xl font-bold">{streakDays(data.activity)} 🔥</p></Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Lessons completed</p>
          <p className="mt-1 text-2xl font-bold">{lessonsDone}/{lessonsTotal}</p>
          <Progress className="mt-2" value={lessonsTotal ? (lessonsDone / lessonsTotal) * 100 : 0} />
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-semibold">Quiz scores</h2>
        {ready && chart.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip formatter={(v) => `${v}%`} labelFormatter={(_, p) => p?.[0]?.payload?.topic ?? ""} />
                <Bar dataKey="score" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Take a quiz to see your scores here.</p>
        )}
      </Card>

      {data.quizzes.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="mb-3 font-semibold">Quiz history</h2>
          <ul className="divide-y">
            {[...data.quizzes].reverse().map((q, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span><b>{q.topic}</b> <span className="capitalize text-muted-foreground">· {q.difficulty}</span></span>
                <span>{q.score}/{q.total} <b className="ml-2 text-primary">{pct(q)}%</b></span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Button
        variant="ghost"
        className="mt-6 text-muted-foreground"
        onClick={() => confirm("Reset all your progress on this device?") && update(() => ({ name: "", chat: [], quizzes: [], roadmap: null, activity: [] }))}
      >
        Reset all progress
      </Button>
    </div>
  );
}
