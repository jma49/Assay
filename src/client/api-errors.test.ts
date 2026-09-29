import { describe, expect, it } from "vitest";
import { apiErrorCodeText, apiErrorText } from "./api-errors";

const apiError = (code: string, message: string) => new Error(message, { cause: { error: { code, message } } });

describe("apiErrorText", () => {
  it("shows a known code in the reader's language, not the server's English", () => {
    const error = apiError("url_not_https", "Webhook URLs must use https");
    expect(apiErrorText(error, "zh")).toBe("Webhook 地址必须使用 https。");
    expect(apiErrorText(error, "en")).toBe("Webhook URLs must use https.");
  });

  it("falls back to the server's message for an unknown code, then to the fallback", () => {
    expect(apiErrorText(apiError("something_new", "Detail"), "zh")).toBe("Detail");
    expect(apiErrorText(new Error(""), "en", "Could not save")).toBe("Could not save");
    expect(apiErrorText(null, "zh")).toBe("出错了，请重试。");
  });
});

describe("apiErrorCodeText", () => {
  it("has English and Chinese text for every code", () => {
    for (const code of ["forbidden", "already_running", "ai_busy", "last_admin", "url_wrong_service", "id_taken"]) {
      expect(apiErrorCodeText(code, "en")).toBeTruthy();
      expect(apiErrorCodeText(code, "zh")).toMatch(/[一-鿿]/);
    }
    expect(apiErrorCodeText(null, "en")).toBeUndefined();
  });
});
