import { describe, expect, it } from "vitest";
import { getSessionCookie } from "better-auth/cookies";
import { sessionCookieOf } from "./session-cookie";

describe("sessionCookieOf", () => {
  const headers = [
    null,
    "",
    "theme=dark",
    "better-auth.session_token=abc.def",
    "__Secure-better-auth.session_token=secure; other=1",
    "better-auth-session_token=legacy",
    "__Secure-better-auth.session_token=a; better-auth.session_token=b",
    "better-auth.session_token=",
    "better-auth.session_data=cached",
  ];

  it("reads the same token as Better Auth's getSessionCookie", () => {
    for (const header of headers) {
      const request = new Headers(header === null ? {} : { cookie: header });
      expect(sessionCookieOf(header), String(header)).toBe(getSessionCookie(request));
    }
  });

  it("prefers the secure cookie", () => {
    expect(sessionCookieOf("better-auth.session_token=plain; __Secure-better-auth.session_token=secure")).toBe("secure");
  });
});
