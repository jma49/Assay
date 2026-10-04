import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { jwt } from "better-auth/plugins";
import { describe, expect, it, vi } from "vitest";
import { cimdOptions } from "./cimd";

const BASE = "http://localhost:3000";
// The memory adapter needs every table the plugins touch to exist up front.
const TABLES = ["user", "session", "account", "verification", "jwks", "oauthClient", "oauthResource", "oauthClientResource", "oauthRefreshToken", "oauthAccessToken", "oauthConsent", "oauthClientAssertion"];
const publicResolver = async () => ["93.184.215.14"];
const privateResolver = async () => ["10.0.0.7"];

const metadata = (clientId: string) => ({
  client_id: clientId,
  client_name: "Example Agent",
  redirect_uris: ["https://agent.example/callback"],
  token_endpoint_auth_method: "none",
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
});

/** A Better Auth instance wired like src/lib/auth/server.ts, with the metadata fetch stubbed. */
function authWith(fetchStub: (url: string, init?: RequestInit) => Promise<Response>, resolve = publicResolver) {
  const fetchSpy = vi.fn(fetchStub);
  const auth = betterAuth({
    baseURL: BASE,
    secret: "test-secret-that-is-long-enough-for-better-auth",
    database: memoryAdapter(Object.fromEntries(TABLES.map((table) => [table, []]))),
    telemetry: { enabled: false },
    plugins: [
      jwt(),
      mcp({ resource: `${BASE}/api/mcp`, loginPage: "/sign-in", consentPage: "/oauth/consent", scopes: ["openid", "offline_access", "checks:read"] }),
      cimd({ ...cimdOptions(resolve), fetchClientMetadataResource: (input, init) => fetchSpy(String(input), init) }),
    ],
  });
  return { auth, fetchSpy };
}

const authorize = (auth: ReturnType<typeof authWith>["auth"], clientId: string) =>
  auth.handler(
    new Request(
      `${BASE}/api/auth/oauth2/authorize?${new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: "https://agent.example/callback",
        scope: "checks:read",
        state: "s",
        code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        code_challenge_method: "S256",
      })}`,
    ),
  );

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

/** Where an authorize request ended up: the sign-in page (client accepted) or a refusal. */
async function outcome(response: Response): Promise<string> {
  const location = response.headers.get("location") ?? "";
  if (location.includes("/sign-in")) return "sign-in";
  const text = location || (await response.text());
  return /invalid_client|client/i.test(text) ? "rejected" : `other:${response.status}:${text.slice(0, 160)}`;
}

describe("CIMD client discovery", () => {
  it("advertises metadata documents in the authorization server metadata", async () => {
    const { auth } = authWith(async () => json({}));
    const response = await auth.handler(new Request(`${BASE}/.well-known/oauth-authorization-server/api/auth`));
    expect((await response.json()).client_id_metadata_document_supported).toBe(true);
  });

  it("accepts a client whose public HTTPS metadata document is valid", async () => {
    const clientId = "https://agent.example/oauth/client.json";
    const { auth, fetchSpy } = authWith(async () => json(metadata(clientId)));
    expect(await outcome(await authorize(auth, clientId))).toBe("sign-in");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0]?.[1]?.redirect).toBe("error");
  });

  it.each([
    ["an IPv4 private literal", "https://10.0.0.1/client.json"],
    ["the loopback literal", "https://127.0.0.1/client.json"],
    ["IPv6 loopback", "https://[::1]/client.json"],
    ["an IPv6 unique-local address", "https://[fd00::1]/client.json"],
    ["cloud metadata", "https://169.254.169.254/client.json"],
    ["localhost", "https://localhost/client.json"],
  ])("never fetches %s", async (_label, clientId) => {
    const { auth, fetchSpy } = authWith(async () => json(metadata(clientId)));
    expect(await outcome(await authorize(auth, clientId))).toBe("rejected");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never fetches a host whose name resolves to a private address", async () => {
    const clientId = "https://internal.example/client.json";
    const { auth, fetchSpy } = authWith(async () => json(metadata(clientId)), privateResolver);
    expect(await outcome(await authorize(auth, clientId))).toBe("rejected");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not treat a plain HTTP client_id as a metadata URL", async () => {
    const clientId = "http://agent.example/client.json";
    const { auth, fetchSpy } = authWith(async () => json(metadata(clientId)));
    expect(await outcome(await authorize(auth, clientId))).toBe("rejected");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses a redirect instead of following it", async () => {
    const clientId = "https://agent.example/moved.json";
    const { auth, fetchSpy } = authWith(async () => new Response(null, { status: 302, headers: { location: "https://169.254.169.254/latest" } }));
    expect(await outcome(await authorize(auth, clientId))).toBe("rejected");
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("refuses a document over the size limit", async () => {
    const clientId = "https://agent.example/big.json";
    const { auth } = authWith(async () => json({ ...metadata(clientId), padding: "x".repeat(10_000) }));
    expect(await outcome(await authorize(auth, clientId))).toBe("rejected");
  });

  it("gives up on a server that never answers", async () => {
    const clientId = "https://agent.example/slow.json";
    const { auth } = authWith(
      (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    expect(await outcome(await authorize(auth, clientId))).toBe("rejected");
  }, 10_000);
});

describe("cimdOptions URL gate", () => {
  const allowed = (url: string, resolve = publicResolver) => cimdOptions(resolve).isMetadataDocumentUrlAllowed!(url, {} as never);

  it("allows public HTTPS hosts only", async () => {
    expect(await allowed("https://agent.example/client.json")).toBe(true);
    expect(await allowed("http://agent.example/client.json")).toBe(false);
    expect(await allowed("https://agent.example/client.json", privateResolver)).toBe(false);
    expect(await allowed("https://agent.example/client.json", async () => ["::ffff:192.168.1.1"])).toBe(false);
    expect(await allowed("https://agent.internal/client.json")).toBe(false);
    expect(await allowed("not a url")).toBe(false);
  });
});

describe("the pinned Node transport", () => {
  it.each(["https://127.0.0.1/client.json", "https://localhost/client.json"])("refuses %s before connecting", async (url) => {
    await expect(fetchClientMetadataResource(url)).rejects.toThrow(/public-routable/);
  });

  it("refuses an IPv6 literal (it cannot even resolve one: fails closed)", async () => {
    await expect(fetchClientMetadataResource("https://[::1]/client.json")).rejects.toThrow();
  });

  it("refuses plain HTTP", async () => {
    await expect(fetchClientMetadataResource("http://agent.example/client.json")).rejects.toThrow(/HTTPS/);
  });
});
