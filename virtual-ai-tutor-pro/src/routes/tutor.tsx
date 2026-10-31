import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatView } from "@/components/StreamChat";
import { meta } from "@/components/PageHeader";
import { update, useAppData } from "@/lib/store";

export const Route = createFileRoute("/tutor")({
  head: () => meta("AI Tutor Chat — Virtual AI Tutor Pro", "Ask any question and get simple, step-by-step explanations."),
  component: Tutor,
});

function Tutor() {
  const [data, ready] = useAppData();
  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-4xl flex-col p-2 md:p-6">
      <div className="mb-3 flex items-center justify-between px-2">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">AI Tutor</h1>
          <p className="text-sm text-muted-foreground">Ask about any subject. I'll explain it simply.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => update((d) => ({ ...d, chat: [] }))}>
          <RotateCcw className="h-4 w-4" /> New chat
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card">
        {ready && (
          <ChatView
            messages={data.chat}
            onChange={(chat) => update((d) => ({ ...d, chat }))}
            placeholder="Ask a question… (Enter to send)"
            suggestions={["Explain photosynthesis simply", "What is a fraction?", "How does gravity work?", "Teach me Python loops"]}
          />
        )}
      </div>
    </div>
  );
}
