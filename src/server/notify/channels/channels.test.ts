import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAlertMessage } from "@/domain/notify";
import { feishuSign } from "./feishu";
import { CHANNELS } from "./index";
import { webhookSignature } from "./webhook";

const now = new Date("2026-09-26T09:00:00Z");
const message = buildAlertMessage(
  { type: "check.outcome_changed", from: "clean", to: "issues", rowCount: 3, diff: null, at: now },
  { name: "Orders <@everyone> & co" },
  { language: "en", url: "https://assay.example/checks/orders" },
);
const context = { now, env: { TELEGRAM_BOT_TOKEN: "123:abc" } };
const body = (kind: keyof typeof CHANNELS, secret: object) => JSON.parse(CHANNELS[kind].request(message, secret, context).body);

describe("validateUrl", () => {
  const valid = (kind: keyof typeof CHANNELS, url: string) => CHANNELS[kind].validateUrl(new URL(url));

  it("accepts each service's own webhook hosts only", () => {
    expect(valid("slack", "https://hooks.slack.com/services/T0/B0/xyz")).toBeNull();
    expect(valid("slack", "https://hooks.slack.com.evil.io/services/T0")).toBe("url_wrong_service");
    expect(valid("slack", "http://hooks.slack.com/services/T0")).not.toBeNull();
    expect(valid("discord", "https://discord.com/api/webhooks/1/abc")).toBeNull();
    expect(valid("discord", "https://discord.com/users/1")).not.toBeNull();
    expect(valid("feishu", "https://open.feishu.cn/open-apis/bot/v2/hook/abc")).toBeNull();
    expect(valid("feishu", "https://open.larksuite.com/open-apis/bot/v2/hook/abc")).toBeNull();
    expect(valid("wecom", "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc")).toBeNull();
    expect(valid("wecom", "https://qyapi.weixin.qq.com/cgi-bin/webhook/send")).toBe("url_missing_key");
    expect(valid("webhook", "https://example.com/hook")).toBeNull();
    expect(valid("webhook", "http://example.com/hook")).toBe("url_not_https");
    expect(valid("webhook", "https://user:pw@example.com/hook")).toBe("url_has_credentials");
  });
});

describe("payloads", () => {
  it("slack escapes mrkdwn and links the check", () => {
    const payload = body("slack", { url: "https://hooks.slack.com/services/x" });
    expect(payload.blocks[0].text.text).toContain("Orders &lt;@everyone&gt; &amp; co");
    expect(payload.blocks.at(-1).elements[0].url).toBe("https://assay.example/checks/orders");
  });

  it("discord never pings anyone", () => {
    const payload = body("discord", { url: "https://discord.com/api/webhooks/1/a" });
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.embeds[0].color).toBe(0xbf8700);
  });

  it("telegram escapes HTML and posts to the chat through the bot", () => {
    const request = CHANNELS.telegram.request(message, { chatId: "-100" }, context);
    expect(request.url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    const payload = JSON.parse(request.body);
    expect(payload.chat_id).toBe("-100");
    expect(payload.text).toContain("Orders &lt;@everyone&gt; &amp; co");
  });

  it("telegram escapes quotes in the link's href", () => {
    const request = CHANNELS.telegram.request({ ...message, url: 'https://assay.example/x" onclick="y' }, { chatId: "-100" }, context);
    expect(JSON.parse(request.body).text).toContain('<a href="https://assay.example/x&quot; onclick=&quot;y">');
  });

  it("feishu signs when it has a secret", () => {
    const payload = body("feishu", { url: "https://open.feishu.cn/open-apis/bot/v2/hook/a", signingSecret: "s" });
    expect(payload.timestamp).toBe(String(now.getTime() / 1000));
    expect(payload.sign).toBe(createHmac("sha256", `${payload.timestamp}\ns`).update("").digest("base64"));
    expect(payload.sign).toBe(feishuSign(payload.timestamp, "s"));
    expect(payload.card.header.template).toBe("orange");
    expect(body("feishu", { url: "https://open.feishu.cn/open-apis/bot/v2/hook/a" }).sign).toBeUndefined();
  });

  it("wecom sends markdown", () => {
    const payload = body("wecom", { url: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=k" });
    expect(payload.msgtype).toBe("markdown");
    expect(payload.markdown.content).toContain("[Open check](https://assay.example/checks/orders)");
  });

  describe("with a hostile check name and error", () => {
    const hostile = buildAlertMessage(
      { type: "check.outcome_changed", from: "clean", to: "error", rowCount: 0, diff: null, error: "[Re-authenticate](https://evil.example)\n# Urgent </font><@123>", at: now },
      { name: "<!channel> <https://evil.example|Open check> </font>[Re-authenticate](https://evil.example)" },
      { language: "en", url: "https://assay.example/checks/orders" },
    );
    const send = (kind: keyof typeof CHANNELS, secret: object) => JSON.parse(CHANNELS[kind].request(hostile, secret, context).body);

    it("slack escapes the notification fallback as well as the blocks", () => {
      const payload = send("slack", { url: "https://hooks.slack.com/services/x" });
      expect(payload.text).not.toMatch(/<!channel>|<https:/);
      expect(payload.text).toContain("&lt;!channel&gt; &lt;https://evil.example|Open check&gt;");
      expect(JSON.stringify(payload.blocks)).not.toMatch(/<!channel>|<https:/);
      expect(payload.blocks.at(-1).elements[0].url).toBe("https://assay.example/checks/orders");
    });

    it("discord escapes markdown in the description", () => {
      const description: string = send("discord", { url: "https://discord.com/api/webhooks/1/a" }).embeds[0].description;
      expect(description).toContain("\\[Re\\-authenticate\\]\\(https\\://evil.example\\)");
      expect(description).not.toMatch(/(^|[^\\])[[\]()<>#]/);
    });

    it("wecom keeps only its own link and font tag", () => {
      const content: string = send("wecom", { url: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=k" }).markdown.content;
      expect(content.match(/\]\(/g)).toHaveLength(1);
      expect(content).toContain("[Open check](https://assay.example/checks/orders)");
      expect(content.match(/<\/?font/g)).toEqual(["<font", "</font"]);
      expect(content).not.toContain("\n# Urgent");
      expect(content).toContain("［Re-authenticate］(https://evil.example)");
    });
  });

  it("the generic webhook signs timestamp and body", () => {
    const request = CHANNELS.webhook.request(message, { url: "https://example.com/h", signingSecret: "s" }, context);
    const timestamp = request.headers["x-assay-timestamp"];
    expect(request.headers["x-assay-signature"]).toBe(webhookSignature("s", timestamp, request.body));
    expect(JSON.parse(request.body)).toMatchObject({ type: "assay.alert", alert: "issues" });
  });
});

describe("interpretOk", () => {
  it("reads error codes in 200 responses", () => {
    expect(CHANNELS.feishu.interpretOk('{"code":0,"msg":"success"}')).toEqual({ kind: "sent" });
    expect(CHANNELS.feishu.interpretOk('{"code":19021,"msg":"sign match fail"}')).toMatchObject({ kind: "failed" });
    expect(CHANNELS.wecom.interpretOk('{"errcode":93000,"errmsg":"invalid webhook url"}')).toMatchObject({ kind: "failed" });
    expect(CHANNELS.telegram.interpretOk('{"ok":false,"description":"chat not found"}')).toEqual({ kind: "failed", error: "chat not found" });
  });
});

describe("describe", () => {
  it("masks secrets", () => {
    expect(CHANNELS.slack.describe({ url: "https://hooks.slack.com/services/T0/B0/secretXYZ9" })).toBe("hooks.slack.com/…XYZ9");
    expect(CHANNELS.wecom.describe({ url: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abcd-1234" })).toBe("qyapi.weixin.qq.com/…1234");
  });
});
