import { timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";

const PUBLIC_PATHS = new Set(["/health"]);

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Requires `Authorization: Bearer <token>` on every route except /health.
 * With no token configured, management routes are disabled rather than open.
 */
export function createApiTokenGuard(expectedToken: string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (PUBLIC_PATHS.has(req.path)) {
      next();
      return;
    }

    if (!expectedToken) {
      res.status(503).json({ error: "SCHEDULER_API_TOKEN is not configured" });
      return;
    }

    const header = req.headers.authorization ?? "";
    const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!provided || !tokensMatch(provided, expectedToken)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    next();
  };
}
