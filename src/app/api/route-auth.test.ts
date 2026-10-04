import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Default-deny for the API: every handler a route exports is wrapped in
// withAuth, unless the route is listed here with the reason it is safe.

const API = path.join(process.cwd(), "src/app/api");

/** Routes that do not use withAuth, each with its own guard. */
const PUBLIC_ROUTES = new Map([
  ["auth/[...all]/route.ts", "Better Auth's own sign-in and session endpoints"],
  ["health/route.ts", "public probe for uptime monitors; reports component states only"],
  ["mcp/route.ts", "MCP clients authenticate with an OAuth token or API key in the handler"],
  ["notifications/dispatch/route.ts", "the scheduled workflow calls it with the CRON_SECRET bearer"],
  ["cron/run-scheduled/route.ts", "QStash signature or the CRON_SECRET bearer (isTrustedScheduler)"],
  ["integrations/slack/interactions/route.ts", "verifies Slack's request signature"],
  ["integrations/telegram/webhook/route.ts", "verifies Telegram's webhook secret token"],
]);

const METHODS = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS";
const EXPORTED_HANDLER = new RegExp(`^export\\s+(?:async\\s+)?(?:function|const)\\s+(${METHODS})\\b.*$`, "gm");
const EXPORTED_DESTRUCTURE = new RegExp(`^export\\s+const\\s+\\{[^}]*\\b(?:${METHODS})\\b[^}]*\\}`, "m");
const WRAPPED = new RegExp(`^export\\s+const\\s+(?:${METHODS})\\s*=\\s*withAuth\\s*[<(]`);

function routeFiles(): string[] {
  return readdirSync(API, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name === "route.ts")
    .map((entry) => path.relative(API, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
    .sort();
}

describe("API route authorization", () => {
  it("wraps every exported handler in withAuth", () => {
    const unguarded = routeFiles()
      .filter((file) => !PUBLIC_ROUTES.has(file))
      .flatMap((file) => {
        const source = readFileSync(path.join(API, file), "utf8");
        const problems = [...source.matchAll(EXPORTED_HANDLER)]
          .filter((match) => !WRAPPED.test(match[0]))
          .map((match) => `${file}: ${match[1]}`);
        if (EXPORTED_DESTRUCTURE.test(source)) problems.push(`${file}: destructured handler export`);
        return problems;
      });
    expect(unguarded, "Wrap the handler in withAuth, or add the route to PUBLIC_ROUTES with its guard").toEqual([]);
  });

  it("lists only routes that exist", () => {
    const stale = [...PUBLIC_ROUTES.keys()].filter((file) => !existsSync(path.join(API, file)));
    expect(stale).toEqual([]);
  });
});
