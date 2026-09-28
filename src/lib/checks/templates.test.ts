import { describe, expect, it } from "vitest";
import type { SchemaTable } from "@/lib/database/db-schema";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { tableReferences } from "@/lib/sql/table-references";
import { buildTemplate, columnFits, parseValueList, templateScriptId, TEMPLATES, type TemplateCheck, type TemplateId, type TemplateInput } from "./templates";

const tables: SchemaTable[] = [
  {
    schema: "demo",
    name: "orders",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "customer_id", type: "integer", nullable: true },
      { name: "status", type: "text", nullable: true },
      { name: "total", type: "numeric", nullable: true },
      { name: "created_at", type: "timestamp with time zone", nullable: false },
      { name: "payload", type: "json", nullable: true },
    ],
  },
  { schema: "demo", name: "customers", columns: [{ name: "id", type: "integer", nullable: false }] },
  {
    schema: "Sales",
    name: 'odd "table"',
    columns: [
      { name: 'weird "col"', type: "text", nullable: true },
      { name: "select", type: "text", nullable: true },
      { name: "Mixed", type: "bigint", nullable: true },
    ],
  },
];

const orders = { schema: "demo", name: "orders" };

function built(id: TemplateId, input: Partial<TemplateInput>): TemplateCheck {
  const result = buildTemplate(id, { table: orders, columns: [], ...input }, tables);
  if (!result.ok) throw new Error(result.error.en);
  return result.check;
}

const refused = (id: TemplateId, input: Partial<TemplateInput>) => {
  const result = buildTemplate(id, { table: orders, columns: [], ...input }, tables);
  return result.ok ? null : result.error;
};

/** The query without its leading comment. */
const body = (check: TemplateCheck) => check.sql.split("\n").slice(1).join("\n").trim();

describe("templates", () => {
  it("builds each template's query", () => {
    expect(body(built("not-null", { columns: ["customer_id"] }))).toBe(`SELECT *\nFROM "demo"."orders"\nWHERE "customer_id" IS NULL;`);
    expect(body(built("duplicates", { columns: ["customer_id", "total"] }))).toBe(
      [
        `SELECT "customer_id", "total", count(*) AS copies`,
        `FROM "demo"."orders"`,
        `WHERE "customer_id" IS NOT NULL AND "total" IS NOT NULL`,
        `GROUP BY "customer_id", "total"`,
        `HAVING count(*) > 1`,
        `ORDER BY copies DESC;`,
      ].join("\n"),
    );
    expect(body(built("orphans", { columns: ["customer_id"], parent: { schema: "demo", name: "customers", column: "id" } }))).toBe(
      [
        `SELECT c.*`,
        `FROM "demo"."orders" AS c`,
        `WHERE c."customer_id" IS NOT NULL`,
        `  AND NOT EXISTS (`,
        `    SELECT 1`,
        `    FROM "demo"."customers" AS p`,
        `    WHERE p."id" = c."customer_id"`,
        `  );`,
      ].join("\n"),
    );
    expect(body(built("freshness", { columns: ["created_at"], maxAgeHours: 24 }))).toBe(
      [
        `SELECT max("created_at") AS latest, date_trunc('minute', now() - max("created_at"))::text AS age`,
        `FROM "demo"."orders"`,
        `HAVING max("created_at") IS NULL`,
        `    OR max("created_at") < now() - interval '24 hours';`,
      ].join("\n"),
    );
    expect(body(built("out-of-range", { columns: ["total"], min: 0, max: 10000 }))).toBe(`SELECT *\nFROM "demo"."orders"\nWHERE "total" < 0 OR "total" > 10000;`);
    expect(body(built("out-of-range", { columns: ["total"], min: -1.5 }))).toBe(`SELECT *\nFROM "demo"."orders"\nWHERE "total" < -1.5;`);
    expect(body(built("accepted-values", { columns: ["status"], values: ["paid", "shipped"] }))).toBe(
      `SELECT *\nFROM "demo"."orders"\nWHERE "status" IS NOT NULL AND "status"::text NOT IN ('paid', 'shipped');`,
    );
    expect(body(built("accepted-values", { columns: ["status"], values: ["paid"], nullAllowed: false }))).toBe(
      `SELECT *\nFROM "demo"."orders"\nWHERE "status" IS NULL OR "status"::text NOT IN ('paid');`,
    );
  });

  it("gives every template a read-only query, bilingual names and a valid script ID", () => {
    const inputs: Record<TemplateId, Partial<TemplateInput>> = {
      "not-null": { columns: ["status"] },
      duplicates: { columns: ["customer_id"] },
      orphans: { columns: ["customer_id"], parent: { schema: "demo", name: "customers", column: "id" } },
      freshness: { columns: ["created_at"], maxAgeHours: 6 },
      "out-of-range": { columns: ["total"], max: 5 },
      "accepted-values": { columns: ["status"], values: ["a"] },
    };
    for (const template of TEMPLATES) {
      const check = built(template.id, inputs[template.id]);
      expect(validateReadOnlySql(check.sql)).toEqual({ isValid: true });
      expect(check.scriptId).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(check.name && check.cnName && check.description && check.cnDescription).toBeTruthy();
      // Coverage counts the check against its table.
      expect(tableReferences(check.sql)).toContain("demo.orders");
    }
  });

  it("quotes odd names so they stay names", () => {
    const table = { schema: "Sales", name: 'odd "table"' };
    const weird = buildTemplate("not-null", { table, columns: ['weird "col"'] }, tables);
    expect(weird.ok && body(weird.check)).toBe(`SELECT *\nFROM "Sales"."odd ""table"""\nWHERE "weird ""col""" IS NULL;`);
    const reserved = buildTemplate("duplicates", { table, columns: ["select", "Mixed"] }, tables);
    expect(reserved.ok && reserved.check.sql).toContain(`GROUP BY "select", "Mixed"`);
    expect(reserved.ok && validateReadOnlySql(reserved.check.sql).isValid).toBe(true);
  });

  it("escapes accepted values as literals", () => {
    const check = built("accepted-values", { columns: ["status"], values: ["it's", "a\\b", "x'); DROP TABLE t; --"] });
    expect(check.sql).toContain(`NOT IN ('it''s', 'a\\b', 'x''); DROP TABLE t; --')`);
    expect(validateReadOnlySql(check.sql).isValid).toBe(true);
  });

  it("keeps the leading comment on one line whatever the names hold", () => {
    const multiline: SchemaTable[] = [{ schema: "public", name: "t\nDROP", columns: [{ name: "c\r\nx", type: "text", nullable: true }] }];
    const result = buildTemplate("not-null", { table: { schema: "public", name: "t\nDROP" }, columns: ["c\r\nx"] }, multiline);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [comment, ...rest] = result.check.sql.split("\n");
    expect(comment).toMatch(/^-- /);
    // The newline in the table name is inside a quoted identifier, not a new statement.
    expect(rest.join("\n")).toContain(`FROM "public"."t\nDROP"`);
    expect(result.check.name).not.toMatch(/[\r\n]/);
  });

  it("refuses tables and columns the schema does not have", () => {
    expect(buildTemplate("not-null", { table: { schema: "demo", name: "nope" }, columns: ["id"] }, tables).ok).toBe(false);
    expect(refused("not-null", { columns: ["nope"] })).toBeTruthy();
    expect(refused("not-null", { columns: [] })).toBeTruthy();
    expect(refused("orphans", { columns: ["customer_id"], parent: { schema: "demo", name: "customers", column: "nope" } })).toBeTruthy();
    expect(refused("orphans", { columns: ["customer_id"] })).toBeTruthy();
  });

  it("refuses columns that do not suit the template", () => {
    expect(refused("freshness", { columns: ["status"], maxAgeHours: 1 })).toBeTruthy();
    expect(refused("out-of-range", { columns: ["status"], min: 0 })).toBeTruthy();
    expect(refused("duplicates", { columns: ["payload"] })).toBeTruthy();
    expect(refused("duplicates", { columns: ["status", "status"] })).toBeTruthy();
    expect(refused("duplicates", { columns: ["id", "customer_id", "status", "total", "created_at", "id"] })).toBeTruthy();
  });

  it("refuses bad numbers and empty lists", () => {
    for (const maxAgeHours of [0, -1, 1.5, Number.NaN, Infinity, 24 * 367, undefined]) {
      expect(refused("freshness", { columns: ["created_at"], maxAgeHours })).toBeTruthy();
    }
    expect(refused("out-of-range", { columns: ["total"] })).toBeTruthy();
    expect(refused("out-of-range", { columns: ["total"], min: Number.NaN })).toBeTruthy();
    expect(refused("out-of-range", { columns: ["total"], max: Infinity })).toBeTruthy();
    expect(refused("out-of-range", { columns: ["total"], min: 5, max: 1 })).toBeTruthy();
    expect(refused("out-of-range", { columns: ["total"], min: "0; DROP" as unknown as number })).toBeTruthy();
    expect(refused("accepted-values", { columns: ["status"], values: [] })).toBeTruthy();
    expect(refused("accepted-values", { columns: ["status"], values: ["x".repeat(201)] })).toBeTruthy();
    expect(refused("accepted-values", { columns: ["status"], values: Array.from({ length: 101 }, (_, i) => `v${i}`) })).toBeTruthy();
  });

  it("offers columns by kind", () => {
    const col = (type: string) => ({ name: "c", type, nullable: true });
    expect(columnFits("time", col("date"))).toBe(true);
    expect(columnFits("time", col("text"))).toBe(false);
    expect(columnFits("number", col("double precision"))).toBe(true);
    expect(columnFits("groupable", col("jsonb"))).toBe(true);
    expect(columnFits("groupable", col("json"))).toBe(false);
  });
});

describe("parseValueList", () => {
  it("takes one value per line, trimmed, without blanks or repeats", () => {
    expect(parseValueList(" paid \n\nshipped\r\npaid\n a, b ")).toEqual(["paid", "shipped", "a, b"]);
  });
});

describe("templateScriptId", () => {
  it("slugs names and falls back when nothing ASCII is left", () => {
    expect(templateScriptId(["Order Items", "Customer_ID"], "not-null")).toBe("order-items-customer-id-not-null");
    expect(templateScriptId(["订单"], "duplicates")).toBe("duplicates-check");
    expect(templateScriptId(["x".repeat(80)], "range").length).toBeLessThanOrEqual(64);
  });
});
