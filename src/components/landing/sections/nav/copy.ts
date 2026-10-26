import { defineCopy } from "../../lib/i18n";

/** The page's sections in nav order, with their anchors (the footer lists the same). */
export const SECTION_IDS = ["run", "safety", "outcomes", "workflow", "selfhost", "faq"] as const;

export const navCopy = defineCopy({
  en: {
    skip: "Skip to content",
    label: "Main",
    home: "assay home",
    sections: { run: "How a run works", safety: "Read-only", outcomes: "Outcomes", workflow: "Workflow", selfhost: "Self-host", faq: "FAQ" },
    docs: "Docs",
    lang: "中文",
    /** The visible label's own language (the toggle names the other one). */
    langTag: "zh-CN",
    /** Starts with the visible label, so a voice command that says what it sees still finds the button. */
    langLabel: "中文 (Switch to Chinese)",
    signIn: "Sign in",
    openApp: "Open Assay",
    demo: "Open the live demo",
  },
  zh: {
    skip: "跳到正文",
    label: "主导航",
    home: "assay 首页",
    sections: { run: "一次运行", safety: "只读", outcomes: "三种结果", workflow: "协作", selfhost: "自己部署", faq: "常见问题" },
    docs: "文档",
    lang: "EN",
    langTag: "en",
    langLabel: "EN（切换到英文）",
    signIn: "登录",
    openApp: "打开 Assay",
    demo: "打开在线演示",
  },
});
