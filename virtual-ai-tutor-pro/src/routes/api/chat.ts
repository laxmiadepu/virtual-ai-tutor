import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Content } from "@google/genai";

const Body = z.object({
  mode: z.enum(["tutor", "code"]),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(20_000),
  })).min(1).max(60).refine(
    (messages) => messages.at(-1)?.role === "user" &&
      messages.reduce((sum, m) => sum + m.content.length, 0) <= 30_000,
    "Invalid message history",
  ),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getGeminiClient, MODEL, TUTOR_PROMPT, CODE_PROMPT, friendlyError } = await import(
          "@/lib/ai.server"
        );
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Invalid request. Check the chat message length." }, { status: 400 });
        }
        try {
          const contents: Content[] = parsed.data.messages.slice(-20).map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          }));
          const response = await getGeminiClient().models.generateContentStream({
            model: MODEL,
            contents,
            config: {
              systemInstruction: parsed.data.mode === "tutor" ? TUTOR_PROMPT : CODE_PROMPT,
              temperature: 0.4,
              maxOutputTokens: 3500,
              abortSignal: request.signal,
              httpOptions: { timeout: 60_000 },
            },
          });
          // Wait for the first actual text before sending HTTP 200.
          // Authentication, quota and model-not-found errors can then be
          // returned to the UI as useful JSON errors instead of a broken stream.
          const iterator = response[Symbol.asyncIterator]();
          let firstText = "";
          while (!firstText) {
            const first = await iterator.next();
            if (first.done) throw new Error("Gemini returned no text");
            firstText = first.value.text ?? "";
          }
          const encoder = new TextEncoder();
          const body = new ReadableStream<Uint8Array>({
            async start(controller) {
              controller.enqueue(encoder.encode(firstText));
              try {
                for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) {
                  if (request.signal.aborted) throw new DOMException("Cancelled", "AbortError");
                  const text = chunk.text ?? "";
                  if (text) controller.enqueue(encoder.encode(text));
                }
                controller.close();
              } catch (error) {
                console.error("Gemini stream failed:", error);
                controller.error(error);
              }
            },
          });
          return new Response(body, {
            status: 200,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "cache-control": "no-store",
              "x-content-type-options": "nosniff",
            },
          });
        } catch (error) {
          const friendly = friendlyError(error);
          return Response.json({ error: friendly.message }, { status: friendly.status });
        }
      },
    },
  },
});
