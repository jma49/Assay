/**
 * Draft-check eval: each demo check's description is the request, and the
 * hand-written check is the reference. It measures whether the drafted
 * query dry-runs, reads the same tables, and flags the same number of rows.
 *
 * Spends AI Gateway credits (up to 2 calls per case), so it refuses to run
 * unless AI_ENABLED=true. Needs DATABASE_URL with the demo schema seeded.
 *   AI_ENABLED=true npm run eval
 *   EVAL_CASES=3 AI_ENABLED=true npm run eval   # first 3 cases only
 */
import fs from "fs";
import path from "path";
import { afterAll, describe, expect, it } from "vitest";
import { demoChecks } from "../scripts/demo/checks";
import { aiEnabled, aiModel } from "@/lib/ai/model";
import { draftCheck } from "@/lib/ai/draft-check";
import { getCachedSchema } from "@/lib/database/db-schema";
import { closePool } from "@/lib/database/db";
import { dryRunCheck } from "@/lib/sql/dry-run";
import { tableReferences } from "@/lib/sql/table-references";

interface CaseResult {
  scriptId: string;
  attempts: number;
  dryRunOk: boolean;
  sameTables: boolean;
  sameRowCount: boolean;
  error?: string;
}

const limit = Number(process.env.EVAL_CASES) || demoChecks.length;
const cases = demoChecks.slice(0, limit);
const results: CaseResult[] = [];

describe.runIf(aiEnabled())(`draft-check eval (${String(aiModel())})`, () => {
  afterAll(async () => {
    await closePool();
    const passed = (key: keyof CaseResult) => results.filter((r) => r[key] === true).length;
    const summary = {
      model: String(aiModel()),
      at: new Date().toISOString(),
      cases: results.length,
      dryRunOk: passed("dryRunOk"),
      sameTables: passed("sameTables"),
      sameRowCount: passed("sameRowCount"),
      repaired: results.filter((r) => r.attempts > 1).length,
      results,
    };
    console.table(results.map(({ error: _error, ...row }) => row));
    console.log(JSON.stringify({ ...summary, results: undefined }, null, 2));
    const dir = path.join(__dirname, "results");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `draft-check-${Date.now()}.json`), JSON.stringify(summary, null, 2));
  });

  for (const check of cases) {
    it(check.scriptId, async () => {
      const reference = await dryRunCheck(check.sqlContent);
      expect(reference.ok, `reference query for ${check.scriptId} must run`).toBe(true);

      const { draft, dryRun, attempts } = await draftCheck({
        request: check.description,
        schema: await getCachedSchema(),
      });
      const expectedTables = tableReferences(check.sqlContent);
      const draftedTables = tableReferences(draft.sql);
      results.push({
        scriptId: check.scriptId,
        attempts,
        dryRunOk: dryRun.ok,
        sameTables: expectedTables.every((t) => draftedTables.includes(t)),
        sameRowCount: dryRun.ok && reference.ok && dryRun.rowCount === reference.rowCount,
        error: dryRun.ok ? undefined : dryRun.error,
      });
    });
  }
});

describe.skipIf(aiEnabled())("draft-check eval", () => {
  it.skip("skipped: set AI_ENABLED=true to spend credits on the eval", () => {});
});
