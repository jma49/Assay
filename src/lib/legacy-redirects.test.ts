import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY_PAGE_REDIRECTS } from "./legacy-redirects.mjs";

/** Resolves a path against the redirects the way Next.js does for plain `:param` segments. */
function redirectFor(pathname: string): string | undefined {
  for (const { source, destination } of LEGACY_PAGE_REDIRECTS) {
    const sourceParts = source.split("/");
    const pathParts = pathname.split("/");
    if (sourceParts.length !== pathParts.length) continue;
    const params: Record<string, string> = {};
    const matches = sourceParts.every((part, i) => {
      if (part.startsWith(":")) return (params[part.slice(1)] = pathParts[i] ?? "") !== "";
      return part === pathParts[i];
    });
    if (matches) return destination.replace(/:(\w+)/g, (_, name: string) => params[name] ?? "");
  }
  return undefined;
}

const APP_DIR = join(process.cwd(), "src/app/(app)");

describe("legacy page redirects", () => {
  it.each([
    ["/dashboard", "/runs"],
    ["/view-execution-result/65f0c0ffee", "/runs/65f0c0ffee"],
    ["/scripts/new", "/checks/new"],
    ["/manage-scripts", "/checks/manage"],
    ["/manage-scripts/edit-history", "/checks/manage/history"],
    ["/manage-scripts/approvals", "/approvals"],
  ])("sends %s to %s", (from, to) => {
    expect(redirectFor(from)).toBe(to);
  });

  it("leaves the new routes alone", () => {
    for (const path of ["/runs", "/runs/abc", "/checks/new", "/checks/manage", "/checks/manage/history", "/approvals"]) {
      expect(redirectFor(path), path).toBeUndefined();
    }
  });

  it("is permanent", () => {
    expect(LEGACY_PAGE_REDIRECTS.every((redirect) => redirect.permanent)).toBe(true);
  });

  it("points every app redirect at a page that exists", () => {
    for (const { destination } of LEGACY_PAGE_REDIRECTS) {
      if (destination.startsWith("/docs")) continue;
      const folder = destination.replace(/:(\w+)/g, "[$1]");
      expect(existsSync(join(APP_DIR, folder, "page.tsx")), destination).toBe(true);
    }
  });
});
