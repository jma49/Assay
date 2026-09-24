import { describe, expect, it } from "vitest";
import { validateReadOnlySql } from "./read-only-validator";

const allowed = (sql: string) => expect(validateReadOnlySql(sql).isValid).toBe(true);
const rejected = (sql: string) => expect(validateReadOnlySql(sql).isValid).toBe(false);

describe("validateReadOnlySql", () => {
  describe("allows read-only queries", () => {
    it.each([
      "SELECT 1",
      "select id, name from orders where status = 'paid';",
      "WITH recent AS (SELECT * FROM orders) SELECT count(*) FROM recent",
      "EXPLAIN SELECT * FROM orders",
      "SELECT * FROM orders;\nSELECT * FROM refunds;",
    ])("%s", allowed);

    it("ignores keywords inside string literals", () => {
      allowed("SELECT * FROM notes WHERE body = 'please delete me'");
      allowed("SELECT * FROM notes WHERE body = 'it''s an update'");
      allowed("SELECT E'drop \\' table' AS s");
    });

    it("ignores keywords inside comments", () => {
      allowed("-- delete this later\nSELECT 1");
      allowed("/* DROP TABLE x */ SELECT 1");
    });

    it("ignores keywords inside quoted identifiers", () => {
      allowed('SELECT "delete" FROM t');
    });

    it("does not match keywords that are part of identifiers", () => {
      allowed("SELECT last_update , created_at FROM t");
      allowed("SELECT * FROM sp_scores");
      allowed("SELECT updated_by FROM audit_log");
    });

    it("allows DO blocks that only read and log", () => {
      allowed(`DO $$
DECLARE cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM orders;
  RAISE NOTICE 'count: %', cnt;
END $$;`);
    });
  });

  describe("rejects statements that modify data or schema", () => {
    it.each([
      "DELETE FROM orders",
      "UPDATE orders SET status = 'x'",
      "INSERT INTO t VALUES (1)",
      "TRUNCATE orders",
      "DROP TABLE orders",
      "ALTER TABLE t ADD COLUMN c int",
      "CREATE TABLE t (id int)",
      "GRANT ALL ON t TO public",
      "COPY t TO '/tmp/x'",
      "VACUUM orders",
      "CALL my_proc()",
      "SET ROLE admin",
      "RESET ALL",
    ])("%s", rejected);

    it("rejects a write hidden after a read", () => {
      rejected("SELECT 1; DELETE FROM orders");
    });

    it("rejects data-modifying CTEs", () => {
      rejected("WITH d AS (DELETE FROM orders RETURNING *) SELECT * FROM d");
    });

    it("rejects row locks", () => {
      rejected("SELECT * FROM orders FOR UPDATE");
    });

    it("rejects SELECT INTO, which creates a table", () => {
      rejected("SELECT * INTO backup_orders FROM orders");
    });

    it("rejects EXPLAIN ANALYZE of a write", () => {
      rejected("EXPLAIN ANALYZE DELETE FROM orders");
    });
  });

  describe("rejects side-effecting functions", () => {
    it.each([
      "SELECT pg_terminate_backend(123)",
      "SELECT pg_cancel_backend(123)",
      "SELECT pg_sleep(3600)",
      "SELECT nextval('orders_id_seq')",
      "SELECT setval('orders_id_seq', 1)",
      "SELECT set_config('role', 'admin', false)",
      "SELECT pg_read_file('/etc/passwd')",
      "SELECT lo_import('/etc/passwd')",
      "SELECT * FROM dblink('host=x', 'DELETE FROM t') AS t(a int)",
      "SELECT PG_TERMINATE_BACKEND (123)",
    ])("%s", rejected);
  });

  describe("rejects dangerous DO blocks", () => {
    it("rejects writes inside the block body", () => {
      rejected("DO $$ BEGIN DELETE FROM orders; END $$");
    });

    it("rejects dynamic SQL", () => {
      rejected("DO $$ BEGIN EXECUTE 'DEL' || 'ETE FROM orders'; END $$");
    });

    it("rejects writes in a tagged dollar-quoted body", () => {
      rejected("DO $body$ BEGIN UPDATE t SET a = 1; END $body$");
    });
  });

  describe("rejects statements that are not queries", () => {
    it.each(["", "   ", "SHOW search_path", "LISTEN chan", "VALUES (1)"])(
      "%j",
      rejected
    );
  });

  it("returns a reason when rejecting", () => {
    const result = validateReadOnlySql("DELETE FROM orders");
    expect(result.reason).toMatch(/DELETE/);
  });
});
