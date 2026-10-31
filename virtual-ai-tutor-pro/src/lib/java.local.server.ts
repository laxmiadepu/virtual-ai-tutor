/**
 * UNSANDBOXED local Java runner for trusted, single-user development only.
 * Never deploy this behind a public URL or let untrusted people submit code.
 * Java code runs with the same OS permissions as your Bun/Vite process.
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type RunResult =
  | { ok: true; stdout: string; stderr: string; compileOutput: string; exitCode: number | null }
  | { ok: false; error: string };

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  tooMuchOutput: boolean;
  launchError?: string | undefined;
};

const MAX_OUTPUT = 32 * 1024;

/** Execute an executable directly (never a shell), with an output cap and a timeout. */
function command(
  executable: string,
  args: string[],
  cwd: string,
  input: string,
  timeoutMs: number,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let size = 0;
    let timedOut = false;
    let tooMuchOutput = false;
    let launchError: string | undefined;
    let finished = false;

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(executable, args, {
        cwd,
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      resolve({
        stdout: "", stderr: "", exitCode: null,
        timedOut: false, tooMuchOutput: false,
        launchError: String(error),
      });
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    const capture = (kind: "stdout" | "stderr", chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT) {
        tooMuchOutput = true;
        child.kill();
        return;
      }
      if (kind === "stdout") stdout += chunk.toString("utf8");
      else stderr += chunk.toString("utf8");
    };

    child.stdout?.on("data", (chunk: Buffer) => capture("stdout", chunk));
    child.stderr?.on("data", (chunk: Buffer) => capture("stderr", chunk));
    child.on("error", (error) => { launchError = error.message; });
    child.on("close", (exitCode) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, timedOut, tooMuchOutput, launchError });
    });

    // It is normal to get EPIPE if Java exits before reading the input.
    child.stdin?.on("error", () => {});
    child.stdin?.end(input);
  });
}

export async function executeLocalJava(code: string, stdin: string): Promise<RunResult> {
  if (!/\bclass\s+Main\b/.test(code)) {
    return { ok: false, error: 'Java code must contain a class named Main (for example, "public class Main").' };
  }
  if (/^\s*package\s+[\w.]+\s*;/m.test(code)) {
    return { ok: false, error: 'Please remove the "package ...;" declaration to run this exercise as Main.java.' };
  }

  const dir = await mkdtemp(join(tmpdir(), "virtual-ai-tutor-java-"));
  try {
    await writeFile(join(dir, "Main.java"), code, { encoding: "utf8", flag: "wx" });
    const compile = await command("javac", ["-encoding", "UTF-8", "-J-Xmx128m", "Main.java"], dir, "", 15000);
    if (compile.launchError) {
      return { ok: false, error: `Unable to launch javac: ${compile.launchError}. Check javac -version in the terminal where Bun runs.` };
    }
    if (compile.timedOut) return { ok: false, error: "Java compilation took longer than 15 seconds." };
    if (compile.tooMuchOutput) return { ok: false, error: "Java compiler output exceeded 32 KB." };
    if (compile.exitCode !== 0) {
      return { ok: false, error: `Java compilation error:\n${compile.stderr || compile.stdout || "Unknown javac error."}` };
    }

    const run = await command("java", ["-Xmx128m", "-cp", dir, "Main"], dir, stdin, 6000);
    if (run.launchError) return { ok: false, error: `Unable to launch java: ${run.launchError}` };
    if (run.timedOut) return { ok: false, error: "Java program exceeded the 6-second limit. Check for an endless loop." };
    if (run.tooMuchOutput) return { ok: false, error: "Java program printed more than 32 KB of output." };
    return { ok: true, stdout: run.stdout, stderr: run.stderr, compileOutput: "", exitCode: run.exitCode };
  } catch (error) {
    return { ok: false, error: `Local Java runner failed: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
