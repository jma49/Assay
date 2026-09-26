import { describe, expect, it } from "vitest";
import { formatInlineMarkdown } from "./inline-markdown";

describe("formatInlineMarkdown", () => {
  it("formats bold, italic and strikethrough", () => {
    expect(formatInlineMarkdown("**a** *b* ~~c~~")).toBe(
      '<strong class="font-semibold text-foreground">a</strong> <em class="italic">b</em> <del class="line-through opacity-75">c</del>',
    );
  });

  it("renders injected markup as text, even inside formatting", () => {
    const html = formatInlineMarkdown('**<img src=x onerror="alert(1)">** <script>alert(2)</script>');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("escapes attribute-breaking quotes", () => {
    expect(formatInlineMarkdown(`*" onmouseover='x'*`)).toBe('<em class="italic">&quot; onmouseover=&#39;x&#39;</em>');
  });
});
