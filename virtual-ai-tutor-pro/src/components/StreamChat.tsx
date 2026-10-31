import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMsg } from "@/lib/store";

export async function streamChat(
  mode: "tutor" | "code",
  messages: ChatMsg[],
  onText: (t: string) => void,
  signal: AbortSignal,
) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode, messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "Something went wrong. Please try again.");
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onText(text);
  }
  if (!text.trim()) throw new Error("The AI didn't return an answer. Please try again.");
  return text;
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-tutor text-sm leading-relaxed">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

export function ChatView({
  messages,
  onChange,
  placeholder,
  suggestions,
  mode = "tutor",
}: {
  mode?: "tutor" | "code";
  messages: ChatMsg[];
  onChange: (m: ChatMsg[]) => void;
  placeholder: string;
  suggestions: string[];
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState<ChatMsg[] | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const shown = live ?? messages;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [shown]);
  useEffect(() => {
    taRef.current?.focus();
  }, [busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text.trim() }];
    setInput("");
    setError("");
    setBusy(true);
    setLive([...next, { role: "assistant", content: "" }]);
    ctrl.current = new AbortController();
    let reply = "";
    try {
      reply = await streamChat(
        mode,
        next,
        (t) => {
          reply = t;
          setLive([...next, { role: "assistant", content: t }]);
        },
        ctrl.current.signal,
      );
      onChange([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      if ((e as Error).name === "AbortError" && reply) onChange([...next, { role: "assistant", content: reply }]);
      else {
        onChange(next.slice(0, -1));
        setInput(text);
        setError((e as Error).name === "AbortError" ? "" : (e as Error).message);
      }
    } finally {
      setLive(null);
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {shown.length === 0 && (
          <div className="mx-auto mt-8 max-w-xl text-center">
            <p className="text-muted-foreground">Try one of these:</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border bg-card px-4 py-2 text-sm transition hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {shown.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="max-w-[95%]">
              {m.content ? (
                <Markdown>{m.content}</Markdown>
              ) : (
                <div className="flex gap-1 py-2">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-2 w-2 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: `${d * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>
      <form
        className="flex items-end gap-2 border-t bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={placeholder}
          rows={2}
          className="min-h-[52px] resize-none"
        />
        {busy ? (
          <Button type="button" size="icon" variant="outline" onClick={() => ctrl.current?.abort()} aria-label="Stop">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
