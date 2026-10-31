
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const runLocalJava = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      code: z.string().min(1).max(20000),
      stdin: z.string().max(5000),
    }).parse(data)
  )
  .handler(async ({ data }) => {

    // Check local Java execution settings.
    const enabled =
      process.env["LOCAL_JAVA_EXECUTION"] === "true";

    const mode =
      process.env["NODE_ENV"] ?? "unset";

    console.log("Java execution configuration:", {
      enabled,
      mode,
    });

    // Allow only explicitly enabled local development.
    if (!enabled || mode === "production") {
      return {
        ok: false as const,
        error: "Local Java execution is disabled.",
      };
    }

    // Only accept requests made locally.
    // This does not provide a secure code sandbox.
    const { getRequest, getRequestIP } =
      await import("@tanstack/react-start/server");

    const request = getRequest();
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const ip = getRequestIP();

    const localHost = [
      "localhost",
      "127.0.0.1",
      "::1",
      "[::1]",
    ].includes(url.hostname);

    const localIP = [
      "127.0.0.1",
      "::1",
      "::ffff:127.0.0.1",
    ].includes(ip ?? "");

    const sameOrigin =
      origin !== null && origin === url.origin;

    console.log("Java request checks:", {
      localHost,
      localIP,
      sameOrigin,
    });

    if (!localHost || !localIP || !sameOrigin) {
      return {
        ok: false as const,
        error: "Java execution is restricted to localhost.",
      };
    }

    // Execute Java using the local JDK.
    const { executeLocalJava } =
      await import("./java.local.server");

    return executeLocalJava(data.code, data.stdin);
  });
