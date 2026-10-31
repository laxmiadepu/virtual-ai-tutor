# Virtual AI Tutor Pro — local setup (Windows)

This ZIP is a separately patched copy of the uploaded project. Keep your working VS Code folder as a backup before switching.

1. Extract the ZIP to a NEW folder; do not overwrite the existing working directory.
2. Open that extracted folder in VS Code, then run `bun install` once.
3. Install Ollama and pull the model once: `ollama pull llama3.2:1b`.
4. Confirm Ollama is running with `ollama list`. Ollama normally starts automatically on Windows; if not, use `ollama serve` in another CMD window. Ignore an "address already in use" error when Ollama is already running.
5. From the extracted folder, run `bun run dev`, then open the shown localhost URL.
6. Test AI Tutor ("What is Python?"), Roadmap (Python -> Basic Syntax -> Start practice), Run code and Check my solution. If AI roadmap JSON generation fails with the small local model, click "Use sample Python roadmap (offline)" on the Roadmap page, which is explicitly labeled as built-in demo content.

## Important differences
- The local app uses Ollama at http://127.0.0.1:11434/v1 when LOVABLE_API_KEY is not available. The hosted Lovable gateway is used only when that key exists in the server environment. DO NOT push a local address as the only provider for a hosted app.
- The project already saved AI chat, quiz data and roadmap completion via browser localStorage, and had code explanation history. This is per-browser, not synchronized across machines.
- The uploaded ZIP had C routed to Judge0, which needs a separately configured authorized service. It DID NOT contain the newer reported free browser C/C++ implementation. C++ and Java execution remain unconfigured in this copy. Do not claim those are working.
- The Python practice generator now rejects "not a coding topic" on programming roadmaps, and uses a clearly labeled built-in Python starter exercise if the offline model produces invalid structured data.
- Built-in exercises are genuinely executed in Pyodide; they are NOT fake AI output. The offline Llama 1B model may still struggle to generate structured quizzes/roadmaps, and the first Pyodide load needs internet.
- "Check my solution" runs the actual reference solution and student code against test cases. Only passing tests mark a roadmap topic complete. Code changes are client-side, not a remote hosted deployment.

## To test quickly
Run: `bun install`, then `bun run dev`.

If problems appear in VS Code, run `bunx tsc --noEmit` (typechecking) and `bun run test` (tests). If `bunx` is unavailable, ensure Bun is installed. Send back the first error text rather than screenshotting secrets.
