import { runLocalJava } from "@/lib/java.local.functions";
/**
 * Browser-based code execution for the programming practice panel.
 * Python uses a Pyodide worker; JavaScript uses a separate worker.
 * C/C++ uses the Clang WebAssembly worker (clang.worker.ts).
 * Java requires a separate authorized runtime; execution is not simulated.
 */


export type RunResult =
  | { ok: true; stdout: string; stderr: string; compileOutput: string; exitCode: number | null }
  | { ok: false; error: string };

export type ExecutableLang = "python" | "java" | "c" | "cpp" | "javascript";

const PYTHON_TIMEOUT_MS = 15000;
const PYTHON_FIRST_RUN_MS = 90000; // first run downloads the Python runtime
const JS_TIMEOUT_MS = 7000;

export const BACKEND_MESSAGE: Record<"java" | "c" | "cpp", string> = {
  java: "Java needs a secure, authorized execution backend, which is not configured yet. Your code is saved — you can run it once a backend is connected. Python and JavaScript run right here in your browser.",
  c: "C needs a secure, authorized execution backend, which is not configured yet. Your code is saved — you can run it once a backend is connected. Python and JavaScript run right here in your browser.",
  cpp: "C++ needs a secure, authorized execution backend, which is not configured yet. Your code is saved — you can run it once a backend is connected. Python and JavaScript run right here in your browser.",
};

export function isBackendLang(language: string): language is "java" | "c" | "cpp" {
  return language === "java" || language === "c" || language === "cpp";
}

// --- Python worker (Pyodide) ------------------------------------------------

type WorkerReply =
  | { id: number; ok: true; stdout: string; stderr: string; exitCode: number }
  | { id: number; ok: false; error: string };

let pythonWorker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (r: RunResult) => void; timer: ReturnType<typeof setTimeout> }>();

function killPythonWorker() {
  pythonWorker?.terminate();
  pythonWorker = null;
  for (const [, p] of pending) {
    clearTimeout(p.timer);
    p.resolve({ ok: false, error: `The program took too long and was stopped (${PYTHON_TIMEOUT_MS / 1000} second limit). Check for an endless loop.` });
  }
  pending.clear();
}

function getPythonWorker(): Worker {
  if (!pythonWorker) {
    pythonWorker = new Worker(new URL("./python.worker.ts", import.meta.url));
    pythonWorker.onmessage = (e: MessageEvent<WorkerReply>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      clearTimeout(p.timer);
      if (e.data.ok) {
        p.resolve({ ok: true, stdout: e.data.stdout, stderr: e.data.stderr, compileOutput: "", exitCode: e.data.exitCode });
      } else {
        p.resolve({ ok: false, error: e.data.error });
      }
    };
    pythonWorker.onerror = () => killPythonWorker();
  }
  return pythonWorker;
}

function runPython(code: string, stdin: string): Promise<RunResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({ ok: false, error: "Python runs in the browser; open the practice panel to run it." });
  }
  const worker = getPythonWorker();
  const id = nextId++;
  const firstRun = pending.size === 0;
  return new Promise<RunResult>((resolve) => {
    const timer = setTimeout(() => {
      killPythonWorker();
      resolve({ ok: false, error: `The program took too long and was stopped (${PYTHON_TIMEOUT_MS / 1000} second limit). Check for an endless loop.` });
    }, firstRun ? PYTHON_FIRST_RUN_MS : PYTHON_TIMEOUT_MS);
    pending.set(id, { resolve, timer });
    worker.postMessage({ id, code, stdin });
  });
}

// --- JavaScript worker ------------------------------------------------------

const JS_WORKER_SOURCE = `
self.onmessage = function (e) {
  var logs = [];
  var errs = [];

  var fakeConsole = {
    log: function () {
      logs.push(Array.from(arguments).map(String).join(" "));
    },
    info: function () {
      logs.push(Array.from(arguments).map(String).join(" "));
    },
    warn: function () {
      errs.push(Array.from(arguments).map(String).join(" "));
    },
    error: function () {
      errs.push(Array.from(arguments).map(String).join(" "));
    },
  };

  var exitCode = 0;

  try {
    new Function("console", e.data.code)(fakeConsole);
  } catch (err) {
    exitCode = 1;
    errs.push(String(err && err.message ? err.message : err));
  }

  self.postMessage({
    stdout: logs.join("\\n") + (logs.length ? "\\n" : ""),
    stderr: errs.join("\\n") + (errs.length ? "\\n" : ""),
    exitCode: exitCode
  });
};
`;

type RunInput = {
  language: ExecutableLang;
  code: string;
  stdin?: string;
};

// Execute JavaScript in a separate worker
function runJavaScript(code: string): Promise<RunResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      ok: false,
      error: "JavaScript execution requires a browser.",
    });
  }

  return new Promise<RunResult>((resolve) => {
    const blob = new Blob([JS_WORKER_SOURCE], {
      type: "text/javascript",
    });

    const url = URL.createObjectURL(blob);
    let worker: Worker;

    try {
      worker = new Worker(url);
    } catch (error) {
      URL.revokeObjectURL(url);
      resolve({
        ok: false,
        error: String(error),
      });
      return;
    }

    URL.revokeObjectURL(url);

    let finished = false;

    const finish = (result: RunResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        ok: false,
        error: "JavaScript execution timed out.",
      });
    }, JS_TIMEOUT_MS);

    worker.onmessage = (event) => {
      const result = event.data;

      finish({
        ok: true,
        stdout: String(result.stdout ?? ""),
        stderr: String(result.stderr ?? ""),
        compileOutput: "",
        exitCode: result.exitCode ?? 0,
      });
    };

    worker.onerror = (event) => {
      finish({
        ok: false,
        error: event.message || "JavaScript execution failed.",
      });
    };

    worker.postMessage({ code });
  });
}

// Support both positional arguments and object input
export function runCode(
  language: ExecutableLang,
  code: string,
  stdin?: string,
): Promise<RunResult>;

export function runCode(
  input: RunInput,
): Promise<RunResult>;

export async function runCode(
  input: ExecutableLang | RunInput,
  sourceCode?: string,
  standardInput = "",
): Promise<RunResult> {
  const language =
    typeof input === "string" ? input : input.language;

  const code =
    typeof input === "string" ? sourceCode ?? "" : input.code;

  const stdin =
    typeof input === "string"
      ? standardInput
      : input.stdin ?? "";

  if (!code.trim()) {
    return {
      ok: false,
      error: "Please enter a program before running it.",
    };
  }
  console.log("Running language:", language);
console.log("Running language:", language);
  switch (language) {
    
    case "python":
      return runPython(code, stdin);

    case "javascript":
      return runJavaScript(code);

    case "c":
case "cpp":
  return runClangWorker(language, code, stdin);

case "java": {
  // Execute Java using the locally installed JDK.
  return runLocalJava({ data: { code, stdin } });
}

    default:
      return {
        ok: false,
        error: "Unsupported programming language.",
      };
  }
}
function runClangWorker(
  language: "c" | "cpp",
  code: string,
  stdin: string
): Promise<RunResult> {
  if (typeof Worker === "undefined") {
    return Promise.resolve({
      ok: false,
      error: "Browser worker is unavailable.",
    });
  }

  return new Promise((resolve) => {
    const worker = new Worker(
      new URL("./clang.worker.ts", import.meta.url),
      { type: "module" }
    );

    let finished = false;

    const finish = (result: RunResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      worker.terminate();
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({
        ok: false,
        error: "C/C++ compiler timed out.",
      });
    }, 120000);

    worker.onmessage = (
      event: MessageEvent<RunResult & { id: number }>
    ) => {
      if (event.data.id !== 1) return;
      finish(event.data);
    };

    worker.onerror = () => {
      finish({
        ok: false,
        error: "Unable to start the C/C++ compiler worker.",
      });
    };

    worker.postMessage({
      id: 1,
      language,
      code,
      stdin,
    });
  });
}

