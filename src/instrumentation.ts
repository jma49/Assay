import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { checkStartupConfig } = await import("./server/startup-config");
    checkStartupConfig();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/** Reports errors thrown in server components, route handlers and server actions. */
export const onRequestError = Sentry.captureRequestError;
