import { describe, expect, it, vi } from "vitest";

const runCOnServer = vi.fn();
vi.mock("@/lib/compile.functions", () => ({ runCOnServer: (a: unknown) => runCOnServer(a) }));

import { BACKEND_MESSAGE, isBackendLang, runCode } from "@/lib/runCode";

describe("Practice execution routing", () => {
  it.each(["java", "cpp"] as const)("states that %s needs an authorized backend instead of simulating output", async (language) => {
    const result = await runCode(language, "any code", "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(BACKEND_MESSAGE[language]);
  });
  it("sends C code and input to the server compiler", async () => {
    runCOnServer.mockResolvedValueOnce({ ok: true, stdout: "Hello, World!\n", stderr: "", compileOutput: "", exitCode: 0, status: "Accepted" });
    const r = await runCode("c", "int main(){}", "5");
    expect(runCOnServer).toHaveBeenCalledWith({ data: { code: "int main(){}", stdin: "5" } });
    expect(r).toMatchObject({ ok: true, stdout: "Hello, World!\n" });
  });
  it("shows the setup message when the C compiler is not configured", async () => {
    runCOnServer.mockResolvedValueOnce({ ok: false, error: "C compiler is not set up yet.", notConfigured: true });
    expect(await runCode("c", "x", "")).toEqual({ ok: false, error: "C compiler is not set up yet." });
  });
  it("runs Python and JavaScript in the browser", () => {
    expect(isBackendLang("python")).toBe(false);
    expect(isBackendLang("javascript")).toBe(false);
  });
});
