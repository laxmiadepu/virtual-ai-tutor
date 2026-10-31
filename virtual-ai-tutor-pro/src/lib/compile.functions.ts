import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Execute user-supplied Java only on a dedicated sandboxed execution service.
// Never run unknown Java programs with local shell commands in the app server.

type JavaRunResult =
  | { ok: true; stdout: string; stderr: string; compileOutput: string; exitCode: number | null }
  | { ok: false; error: string };

type Judge0Submission = {
  token?: string;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  exit_code?: number | null;
  status?: { id: number; description: string };
};

export const runJavaOnServer = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      code: z.string().min(1).max(50000),
      stdin: z.string().max(10000),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<JavaRunResult> => {
    const base = (process.env["JUDGE0_URL"] || "").replace(/\/+$/, "");
    const key = process.env["JUDGE0_API_KEY"];
    if (!base) {
      return {
        ok: false,
        error: "Java runner is not configured. Set JUDGE0_URL (and JUDGE0_API_KEY for your provider) in .env, then restart Bun.",
      };
    }

    let endpoint: URL;
    try {
      endpoint = new URL(base);
      if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["localhost", "127.0.0.1"].includes(endpoint.hostname))) {
        throw new Error("Judge0 URL must be HTTPS except for local development.");
      }
    } catch {
      return { ok: false, error: "JUDGE0_URL is invalid. Check the URL in your .env file." };
    }

    const host = endpoint.hostname.toLowerCase();
    const isRapidApi = host.endsWith(".rapidapi.com");
    if (isRapidApi && !key) {
      return { ok: false, error: "JUDGE0_API_KEY is missing for the RapidAPI Judge0 service." };
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (key) {
      if (isRapidApi) {
        headers["X-RapidAPI-Key"] = key;
        headers["X-RapidAPI-Host"] = endpoint.host;
      } else {
        headers["X-Auth-Token"] = key;
      }
    }

    // Official Judge0 CE lists Java (OpenJDK 13) as language 62.
    // Override when another Judge0 host uses a different Java language ID.
    const languageId = Number(process.env["JUDGE0_JAVA_LANGUAGE_ID"] || 62);
    if (!Number.isSafeInteger(languageId) || languageId < 1) {
      return { ok: false, error: "JUDGE0_JAVA_LANGUAGE_ID must be a positive integer." };
    }

    try {
      const created = await fetch(`${base}/submissions?base64_encoded=false`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          language_id: languageId,
          source_code: data.code,
          stdin: data.stdin,
        }),
      });

      if (!created.ok) {
        return {
          ok: false,
          error: `Judge0 rejected the Java submission (HTTP ${created.status}). Check your endpoint, access plan, API key and available Java language ID.`,
        };
      }

      const submission = (await created.json()) as Judge0Submission;
      if (!submission.token) {
        return { ok: false, error: "Judge0 did not return a submission token." };
      }

      // Do not require wait=true: Judge0 public hosts may disable it.
      for (let attempt = 0; attempt < 25; attempt++) {
        const response = await fetch(
          `${base}/submissions/${encodeURIComponent(submission.token)}?base64_encoded=false`,
          { headers, signal: AbortSignal.timeout(15000) },
        );
        if (!response.ok) {
          return { ok: false, error: `Judge0 could not fetch the execution result (HTTP ${response.status}).` };
        }

        const result = (await response.json()) as Judge0Submission;
        const statusId = result.status?.id ?? 0;
        if (statusId > 2) {
          if (statusId === 3) {
            return {
              ok: true,
              stdout: result.stdout ?? "",
              stderr: result.stderr ?? "",
              compileOutput: result.compile_output ?? "",
              exitCode: result.exit_code ?? 0,
            };
          }
          return {
            ok: false,
            error: result.compile_output || result.stderr || result.message || result.status?.description || "Java program failed.",
          };
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      }
      return { ok: false, error: "Java execution is still queued; Judge0 timed out. Please try again." };
    } catch (error) {
      console.error("Java Judge0 request failed:", error);
      return { ok: false, error: "Could not reach the Java execution service. Check your Judge0 URL and internet connection." };
    }
  });
