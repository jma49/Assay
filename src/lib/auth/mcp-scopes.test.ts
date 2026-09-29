import { describe, expect, it } from "vitest";
import { isMcpScope, MCP_CHALLENGE_SCOPES, MCP_SCOPES, mcpResourceUrl } from "./mcp-scopes";

describe("mcpResourceUrl", () => {
  it("binds tokens to the auth origin first, then the app URL", () => {
    expect(mcpResourceUrl({ BETTER_AUTH_URL: "https://auth.example", APP_URL: "https://app.example" })).toBe("https://auth.example/api/mcp");
    expect(mcpResourceUrl({ APP_URL: "https://app.example" })).toBe("https://app.example/api/mcp");
  });

  it("drops trailing slashes, so the audience matches exactly", () => {
    expect(mcpResourceUrl({ APP_URL: "https://app.example//" })).toBe("https://app.example/api/mcp");
  });

  it("falls back to the local dev server", () => {
    expect(mcpResourceUrl({})).toBe("http://localhost:3000/api/mcp");
  });
});

describe("MCP scopes", () => {
  it("knows its own scopes and nothing else", () => {
    for (const scope of MCP_SCOPES) expect(isMcpScope(scope)).toBe(true);
    for (const scope of ["offline_access", "openid", "checks:write", ""]) expect(isMcpScope(scope)).toBe(false);
  });

  it("challenges for every scope plus a refresh token", () => {
    expect(MCP_CHALLENGE_SCOPES).toEqual([...MCP_SCOPES, "offline_access"]);
  });
});
