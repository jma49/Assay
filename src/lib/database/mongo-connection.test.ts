import { describe, expect, it } from "vitest";
import { databaseInUri, DEFAULT_DATABASE, mongoDatabaseName } from "./mongo-connection";

describe("databaseInUri", () => {
  it("reads the path of single- and multi-host URIs", () => {
    expect(databaseInUri("mongodb+srv://u:p@cluster.example.net/assay?retryWrites=true")).toBe("assay");
    expect(databaseInUri("mongodb://u:p@a:27017,b:27017/prod_db?replicaSet=rs0")).toBe("prod_db");
    expect(databaseInUri("mongodb://localhost:27017")).toBe("");
    expect(databaseInUri("mongodb+srv://u:p@cluster.example.net/")).toBe("");
    expect(databaseInUri("mongodb+srv://u:p%40ss@cluster.example.net/my%2Ddb")).toBe("my-db");
  });
});

describe("mongoDatabaseName", () => {
  it("prefers the URI path, then MONGODB_DB_NAME, then the default", () => {
    expect(mongoDatabaseName({ MONGODB_URI: "mongodb+srv://c.example.net/assay", MONGODB_DB_NAME: "other" })).toBe("assay");
    expect(mongoDatabaseName({ MONGODB_URI: "mongodb+srv://c.example.net/", MONGODB_DB_NAME: "other" })).toBe("other");
    expect(mongoDatabaseName({ MONGODB_URI: "mongodb+srv://c.example.net/" })).toBe(DEFAULT_DATABASE);
  });
});
