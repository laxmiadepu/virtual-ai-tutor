
import { createCompiler } from "@live-codes/clang-wasm";

type Language = "c" | "cpp";

type RunRequest = {
  id: number;
  language: Language;
  code: string;
  stdin: string;
};

type Compiler = Awaited<ReturnType<typeof createCompiler>>;

const compilers = new Map<Language, Promise<Compiler>>();


function getCompiler(language: Language): Promise<Compiler> {
  const existing = compilers.get(language);

  if (existing) {
    return existing;
  }

  const compilerPromise = createCompiler(language, {
    baseUrl: new URL("/clang/", self.location.href),
  });

  compilers.set(language, compilerPromise);

  return compilerPromise;
}

self.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { id, language, code, stdin } = event.data;

  try {
    const compiler = await getCompiler(language);

    const result = await compiler.run(code, stdin);

    if (result.exitCode === null) {
      self.postMessage({
        id,
        ok: false,
        error:
          result.errors.join("\n") ||
          "Compilation failed. Check your code.",
      });
      return;
    }

    self.postMessage({
      id,
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: "",
      exitCode: result.exitCode,
    });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to compile or execute the program.",
    });
  }
};

