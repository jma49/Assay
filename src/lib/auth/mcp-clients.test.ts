import { describe, expect, it } from "vitest";
import { withNativeDefault } from "./mcp-clients";

describe("withNativeDefault", () => {
  it("registers loopback and custom-scheme callbacks as native apps", () => {
    expect(withNativeDefault({ redirect_uris: ["http://localhost:33418/callback"] }).application_type).toBe("native");
    expect(withNativeDefault({ redirect_uris: ["http://127.0.0.1:6274/oauth/callback", "cursor://anysphere.cursor-mcp/oauth/callback"] }).application_type).toBe("native");
  });

  it("leaves web callbacks, mixed lists and explicit types alone", () => {
    expect(withNativeDefault({ redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }).application_type).toBeUndefined();
    expect(withNativeDefault({ redirect_uris: ["https://app.example.com/cb", "http://localhost:3000/cb"] }).application_type).toBeUndefined();
    expect(withNativeDefault({ redirect_uris: ["http://localhost/cb"], application_type: "web" }).application_type).toBe("web");
  });

  it("does not treat plain http on a public host as native", () => {
    expect(withNativeDefault({ redirect_uris: ["http://evil.example/cb"] }).application_type).toBeUndefined();
    expect(withNativeDefault({ redirect_uris: [] }).application_type).toBeUndefined();
    expect(withNativeDefault({}).application_type).toBeUndefined();
  });
});
