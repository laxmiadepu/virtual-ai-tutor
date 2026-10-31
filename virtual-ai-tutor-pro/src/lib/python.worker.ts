/// <reference lib="webworker" />
/**
 * Runs student Python in a real CPython runtime (Pyodide / WebAssembly).
 * Loaded as a classic Web Worker; Pyodide is fetched from the jsDelivr CDN.
 * Output is the program's actual stdout/stderr — never simulated.
 */

declare function loadPyodide(options: { indexURL: string }): Promise<PyodideLike>;


interface PyodideLike {
  setStdout(options: {
    batched: (s: string) => void;
  }): void;

  setStderr(options: {
    batched: (s: string) => void;
  }): void;

  setStdin(options: {
    stdin: () => string | null;
  }): void;

  runPythonAsync(code: string): Promise<unknown>;
}


const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

let pyodideReady: Promise<PyodideLike> | null = null;

function getPyodide(): Promise<PyodideLike> {
  if (!pyodideReady) {
    pyodideReady = (async () => {
      importScripts(`${PYODIDE_URL}pyodide.js`);
      return await loadPyodide({ indexURL: PYODIDE_URL });
    })();
    pyodideReady.catch(() => { pyodideReady = null; });
  }
  return pyodideReady;
}

self.onmessage = async (e: MessageEvent<{ id: number; code: string; stdin: string }>) => {
  const { id, code, stdin } = e.data;
  try {
    const pyodide = await getPyodide();
    let stdout = "";
    let stderr = "";
    pyodide.setStdout({ batched: (s) => { stdout += s + "\n"; } });
    pyodide.setStderr({ batched: (s) => { stderr += s + "\n"; } });
   
const inputText = String(stdin ?? "").replace(/\r\n?/g, "\n");

const lines = inputText.length > 0
  ? inputText.replace(/\n$/, "").split("\n")
  : [];

let li = 0;


pyodide.setStdin({
  stdin: () => (li < lines.length ? (lines[li++] ?? null) : null),
});


    let exitCode = 0;
    try {
      await pyodide.runPythonAsync(code);
    } catch (err) {
      exitCode = 1;
      // Pyodide wraps Python tracebacks in a JS error; keep the readable text.
      stderr += String((err as Error)?.message ?? err);
      if (stderr && !stderr.endsWith("\n")) stderr += "\n";
    }
    (self as unknown as Worker).postMessage({ id, ok: true, stdout, stderr, exitCode });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      ok: false,
      error: `Python could not start in your browser (${(err as Error)?.message ?? err}). Check your connection and try again.`,
    });
  }
};
