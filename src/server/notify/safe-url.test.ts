import { describe, expect, it } from "vitest";
import { assertPublicHost, isPrivateAddress } from "./safe-url";

describe("isPrivateAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"])(
    "%s is not public",
    (address) => expect(isPrivateAddress(address)).toBe(true),
  );

  it.each(["8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700::1111", "::ffff:1.1.1.1"])("%s is public", (address) =>
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

  it("accepts public hosts", async () => {
    await expect(assertPublicHost("hooks.example.com", async () => ["93.184.216.34"])).resolves.toBeUndefined();
  });
});
