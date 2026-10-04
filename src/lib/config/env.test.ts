import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENV_VARS, envFormatProblems, REQUIRED_ENV_NAMES, type EnvName } from "./env";

const ROOT = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx|mjs)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

/** Variable names the code reads: process.env.X, serverEnv().X, env.X, env?.X, env["X"]. */
function namesRead(): Set<string> {
  const read = /(?:process\.env|\benv|\bEnv|environment|serverEnv\(\))\??\.([A-Z][A-Z0-9_]*)\b|\benv\[\s*"([A-Z][A-Z0-9_]*)"\s*\]/g;
  const names = new Set<string>();
  for (const file of [...sourceFiles("src"), ...sourceFiles("scripts")]) {
    for (const match of readFileSync(file, "utf8").matchAll(read)) {
      const name = match[1] ?? match[2];
      if (name) names.add(name);
    }
  }
  return names;
}

describe("the environment registry", () => {
  it("declares every variable the code reads", () => {
    const undeclared = [...namesRead()].filter((name) => !(name in ENV_VARS)).sort();
    expect(undeclared, "Declare these in src/lib/config/env.ts").toEqual([]);
  });

  it("documents every variable people set in .env.example", () => {
    const example = readFileSync(path.join(ROOT, ".env.example"), "utf8");
    const undocumented = (Object.keys(ENV_VARS) as EnvName[])
      .filter((name) => ENV_VARS[name].kind !== "platform" && !new RegExp(`\\b${name}\\b`).test(example))
      .sort();
    expect(undocumented, "Mention these in .env.example").toEqual([]);
  });

  it("requires the variables a production server cannot run without", () => {
    expect(REQUIRED_ENV_NAMES).toEqual(["BETTER_AUTH_SECRET", "MONGODB_URI", "DATABASE_URL", "APP_URL"]);
  });
});

describe("envFormatProblems", () => {
  it("accepts well-formed values and ignores unset ones", () => {
    expect(
      envFormatProblems({
        APP_URL: "https://assay.example.com",
        MONGODB_URI: "mongodb+srv://user:pass@cluster.example.net/db",
        DATABASE_URL: "postgresql://user:pass@localhost/db",
        CHECK_TIMEOUT_MS: "30000",
        AI_ENABLED: "true",
        ASSAY_SECRET_KEY: Buffer.alloc(32, 7).toString("base64"),
      }),
    ).toEqual([]);
  });

  it("names malformed values, never their contents", () => {
    const problems = envFormatProblems({
      APP_URL: "assay.example.com",
      DATABASE_URL: "mysql://user:secret@host/db",
      PG_POOL_MAX: "ten",
      DEMO_MODE: "yes",
      ASSAY_SECRET_KEY: "too-short",
    });
    expect(problems.map((p) => p.name)).toEqual(["DATABASE_URL", "PG_POOL_MAX", "ASSAY_SECRET_KEY", "APP_URL", "DEMO_MODE"]);
    expect(JSON.stringify(problems)).not.toContain("secret@");
  });
});
