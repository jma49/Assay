import { describe, expect, it } from "vitest";
import { HostNotFoundError, assertPublicHost, isPrivateAddress } from "./safe-url";

describe("isPrivateAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "::7f00:1", "64:ff9b::a9fe:a9fe", "2002:7f00:1::", "fec0::1", "ff02::1", "2001:db8::1", "2001:0:1::1", "::", "not-an-ip"])(
    "%s is not public",
    (address) => expect(isPrivateAddress(address)).toBe(true),
  );

  it.each(["8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700::1111", "::ffff:1.1.1.1", "::ffff:101:101", "64:ff9b::808:808", "2a00:1450:4001::200e"])("%s is public", (address) =>
    expect(isPrivateAddress(address)).toBe(false),
  );
});

describe("assertPublicHost", () => {
  it("rejects hosts that resolve to any private address", async () => {
    await expect(assertPublicHost("evil.example", async () => ["1.1.1.1", "10.0.0.1"])).rejects.toThrow("not public");
    await expect(assertPublicHost("localhost", async () => ["1.1.1.1"])).rejects.toThrow("not public");
    await expect(assertPublicHost("[::1]", async () => [])).rejects.toThrow("not public");
    await expect(assertPublicHost("nowhere.example", async () => [])).rejects.toThrow("not public");
  });

  it("tells a host with no DNS record apart from a private one", async () => {
    const notFound = Object.assign(new Error("getaddrinfo ENOTFOUND hoks.example.com"), { code: "ENOTFOUND" });
    await expect(assertPublicHost("hoks.example.com", async () => Promise.reject(notFound))).rejects.toBeInstanceOf(HostNotFoundError);
    await expect(assertPublicHost("hoks.example.com", async () => Promise.reject(notFound))).rejects.toThrow("Couldn't resolve host hoks.example.com");
    const timeout = Object.assign(new Error("timeout"), { code: "ETIMEOUT" });
    await expect(assertPublicHost("slow.example.com", async () => Promise.reject(timeout))).rejects.toBe(timeout);
  });

  it("accepts public hosts", async () => {
    await expect(assertPublicHost("hooks.example.com", async () => ["93.184.216.34"])).resolves.toBeUndefined();
  });
});

describe("publicOnlyLookup", () => {
  it("refuses a host that resolves to a private address when connecting", async () => {
    const { publicOnlyLookup } = await import("./pinned-fetch");
    const error = await new Promise<NodeJS.ErrnoException | null>((resolve) => publicOnlyLookup("localhost", {}, (e) => resolve(e)));
    expect(error?.code).toBe("ENOTPUBLIC");
  });
});
