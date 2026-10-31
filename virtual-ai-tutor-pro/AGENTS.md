<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- AI calls live server-side: streaming chat in `src/routes/api/chat.ts`, structured JSON (quiz/roadmap) in `src/lib/ai.functions.ts`, gateway setup in `src/lib/ai.server.ts` — keeps the key off the client.
- Student data is a single localStorage record managed by `src/lib/store.ts` (read in effects) — no login by design; avoids hydration mismatch.
- Code explanation history is its own localStorage record managed by `src/lib/codeHistory.ts` (newest first, capped at 20 entries) — keeps it separate from the main student record.
- Pure learning rules (level, streak) live in `src/lib/level.ts` with tests in `src/test/level.test.ts`.
- Programming practice stays inside expandable roadmap topics; separate per-topic browser records use subject and topic content as keys to avoid collisions between replacement roadmaps.
- Code execution is client-side via `src/lib/runCode.ts`: Python runs on real Pyodide (WebAssembly CPython) in `src/lib/python.worker.ts` with a time limit; JavaScript runs in a sandboxed worker; C compiles on a Judge0 server via `src/lib/compile.functions.ts` (JUDGE0_URL/JUDGE0_API_KEY server secrets, setup message when missing); Java/C++ return a clear backend-not-configured message. Output is never simulated.
- Programming completion requires nonempty test cases, validated by running the reference solution, and successful student execution with matching output; ordinary lessons retain manual completion.
