# Virtual AI Tutor Pro — demonstration checklist

## Open locally
- `ollama list` must show `llama3.2:1b`.
- Run `bun run dev` in the project folder. Open the Local URL shown in VS Code.

## Demo flow
1. AI Tutor: ask "What is Python?" and ask a related follow-up.
2. Code Explainer: paste `print(1 + 2)` and request an explanation.
3. Roadmap: click "Use sample Python roadmap (offline)" if AI roadmap generation fails; expand "Basic Syntax and Data Types".
4. Click "Start practice". If the model cannot create a valid structured practice, the app clearly labels the built-in Python exercise.
5. Enter working code and click "Run code". Compare output with expected output.
6. Click "Check my solution". When all real tests pass, verify the green tick and that the completion survives refresh.
7. Quizzes: generate and submit a quiz, then view the score in Progress.
8. Code History: explain something, refresh and confirm it is saved in this browser.

## Known limitations (do not hide from judges)
- Ollama local AI only works on the laptop running Ollama; an online deployment requires a reachable hosted provider.
- This uploaded source ZIP still routes C to Judge0 (requires separately configured authorized compiler). C++ and Java execution are not set up in THIS ZIP. If Lovable later generated browser C/C++ compilation, obtain a newer GitHub ZIP rather than overwriting that code with this older snapshot.
- Browser localStorage progress/history is not synchronized across accounts or devices.
- Local Llama 3.2:1b may be unable to produce valid JSON for quizzes/roadmaps, so the explicitly labeled sample Python roadmap and starter exercises help with an offline demonstration.
- The first Python WebAssembly (Pyodide) download needs network access unless cached.
- A browser Web Worker is not equivalent to a hardened multi-tenant security sandbox. Avoid presenting unrestricted untrusted code execution as production-ready.

## Before publishing
- Review security/secret handling, validate deployment backend and API availability, run project tests, and re-test published site. Do not publish localhost-only Ollama settings as your sole AI provider.
