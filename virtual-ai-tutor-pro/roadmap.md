# Roadmap

## Done
- [x] Code Explainer history (localStorage, 20 entries max, restore on refresh, clear with confirm) — tests pass, browser-verified

## Programming Practice Panel
- [x] Expandable practice inside programming roadmap topics; no new page or sidebar item
- [x] Editor with syntax highlighting, line numbers, language selection, input, clear/reset controls
- [x] External sandbox execution requests with explicit time and memory limits; no simulated output
- [x] AI-generated exercises and reference solutions cached per topic
- [x] Drafts restored across refresh; verified with a real generated Python exercise
- [x] Completion requires validated reference cases and matching successful student runs
- [x] AI help buttons reuse the existing integration
- [x] 28 tests passed; desktop/mobile checked, no overflow or runtime errors
- [x] Real Run and Check attempts show service-unavailable errors without changing progress
- [x] Successful code output and completion verification — Python/JavaScript now run in the browser; Java/C/C++ await an authorized backend

## Browser-based Python execution (Pyodide)
- [x] Python runs in the browser via Pyodide in a Web Worker (replaces Piston for Python)
- [x] Real stdout/stderr/status in the existing Output Console; no simulated output
- [x] Java, C, C++ show a clear "backend not configured" message
- [x] Drafts still saved after refresh (unchanged draft logic; panel test passes)
- [x] Verified print("Hello World") outputs Hello World; Python tracebacks, JavaScript output, and Java message browser-checked

- [ ] C execution via Judge0 — built, waiting for JUDGE0_URL / JUDGE0_API_KEY; not verified with Hello World yet
