import { GoogleGenAI } from "@google/genai";

// New AI Studio projects should use a supported Flash model. You can override
// this from your local .env file or production server environment.
export const MODEL = process.env["GEMINI_MODEL"] || "gemini-3.5-flash-lite";

// Only import this module from server code. Never use a VITE_ public variable
// for API keys, and never ship a Gemini API key to the browser.
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env["GEMINI_API_KEY"]?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to the project's .env file and restart the dev server.");
  }
  return new GoogleGenAI({ apiKey });
}

export const TUTOR_PROMPT = `You are "Virtual AI Tutor Pro", a friendly, patient tutor for students of any subject.
Explain concepts simply, step by step, with short everyday examples. Use markdown headings, bullet lists and code blocks when helpful.
End with one short question to check understanding. Keep answers focused and beginner-friendly.`;

export const CODE_PROMPT = `You explain programming code to beginners in plain language.
Structure: 1) "What this code does" in 1-2 sentences. 2) "Line by line" walkthrough of the important lines. 3) "Key ideas" glossary of concepts used. 4) "Possible issues" if any.
Use markdown and avoid jargon; when you must use a term, define it.`;

export function friendlyError(e: unknown): { status: number; message: string } {
  const error = e as { status?: number; statusCode?: number; message?: string } | null;
  const status = Number(error?.status ?? error?.statusCode ?? 500);
  const msg = error?.message ?? "";
  if (msg.includes("GEMINI_API_KEY is missing")) return { status: 503, message: msg };
  if (status === 429) return { status, message: "Gemini usage limit reached. Check your AI Studio rate limits and try later." };
  if (status === 401 || status === 403) return { status, message: "Gemini API key is invalid or access is denied. Check the API key/project in AI Studio." };
  if (status === 404) return { status, message: `The model ${MODEL} is not available for this key. Choose an available model in AI Studio.` };
  if (status === 400) return { status, message: "Gemini rejected the request. Please try a shorter question or review the selected model." };
  console.error("Gemini provider error:", e);
  return { status: 502, message: "Gemini could not respond. Check the server terminal and Google AI Studio usage status." };
}
