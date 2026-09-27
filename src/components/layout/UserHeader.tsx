"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import * as Menubar from "@radix-ui/react-menubar";
import { Moon, Sun } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { BrandMark } from "@/components/common/BrandMark";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { useAppWindowState } from "@/components/layout/app-window-state";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { AboutDialog } from "@/components/layout/AboutDialog";
import { useSendAppCommand } from "@/lib/commands/use-app-command";
import { GITHUB_URL } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

const COPY = {
  en: {
    file: "File",
    view: "View",
    window: "Window",
    help: "Help",
    about: "About Assay",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "Same as system",
    language: "Language",
    signOut: "Sign Out",
    newCheck: "New Check",
    runCheck: "Run a Check…",
    runBulk: "Run in Bulk…",
    history: "Run History",
    showAll: "All Results",
    showPassed: "Passed",
    showAttention: "Needs Attention",
    showFailed: "Failed",
    reload: "Reload",
    collapse: "Collapse Window",
    expand: "Expand Window",
    zoom: "Zoom Window",
    docs: "Assay Help",
    guide: "Setup Guide",
    github: "Assay on GitHub",
    issue: "Report an Issue…",
  },
  zh: {
    file: "文件",
    view: "显示",
    window: "窗口",
    help: "帮助",
    about: "关于 Assay",
    appearance: "外观",
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
    language: "语言",
    signOut: "退出登录",
    newCheck: "新建检查",
    runCheck: "执行检查…",
    runBulk: "批量执行…",
    history: "执行历史",
    showAll: "全部结果",
    showPassed: "通过",
    showAttention: "需关注",
    showFailed: "失败",
    reload: "重新载入",
    collapse: "收起窗口",
    expand: "展开窗口",
    zoom: "缩放窗口",
    docs: "Assay 帮助",
    guide: "部署说明",
    github: "GitHub 上的 Assay",
    issue: "报告问题…",
  },
};

const TRIGGER =
  "flex h-10 items-center px-2.5 text-[14px] outline-none select-none data-[state=open]:[background:var(--aqua-select)] data-[state=open]:text-white";

const ITEM =
  "aqua-menu-item relative flex items-center justify-between gap-6 rounded-[3px] py-1 pr-4 pl-6 text-[14px] outline-none select-none data-[disabled]:opacity-40";

function Menu({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Menubar.Menu>
      <Menubar.Trigger className={cn(TRIGGER, className)}>{title}</Menubar.Trigger>
      <Menubar.Portal>
        <Menubar.Content
          align="start"
          sideOffset={0}
          className="aqua-menu aqua-menu-dropdown z-50 min-w-[230px] p-1 text-popover-foreground"
        >
          {children}
        </Menubar.Content>
      </Menubar.Portal>
    </Menubar.Menu>
  );
}

function Item({ children, onSelect, disabled }: { children: ReactNode; onSelect?: () => void; disabled?: boolean }) {
  return (
    <Menubar.Item className={ITEM} onSelect={onSelect} disabled={disabled}>
      {children}
    </Menubar.Item>
  );
}

function Radio({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Menubar.RadioItem value={value} className={ITEM}>
      <Menubar.ItemIndicator className="absolute left-2">✓</Menubar.ItemIndicator>
      {children}
    </Menubar.RadioItem>
  );
}

const Divider = () => <Menubar.Separator className="my-1 h-px bg-foreground/12" />;

/** Menu-bar clock, as on the Mac. Rendered after mount so server and client agree. */
function Clock({ language }: { language: "en" | "zh" }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);
  if (!now) return null;
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const day = now.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  const time = now.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  return (
    <span className="hidden text-[13px] tabular-nums lg:inline">
      {day} {time}
    </span>
  );
}

/**
 * The Mac OS X menu bar: commands only. Moving between sections is the
 * Dock's job, so nothing here duplicates it.
 */
export default function UserHeader() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { language, setLanguage } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { shaded, zoomed, toggleShade, toggleZoom } = useAppWindowState();
  const send = useSendAppCommand();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const t = COPY[language] ?? COPY.en;
  const displayName = user?.fullName || user?.emailAddresses[0]?.emailAddress?.split("@")[0];
  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    // z-40 keeps the menu bar under dialogs (z-50), so it can always stay sticky.
    <header className="aqua-menubar sticky top-0 z-40">
      <NavigationProgress />
      <div className={cn(APP_CONTAINER, "flex h-10 items-center gap-2")}>
        <Menubar.Root className="-ml-2.5 flex items-center" loop>
          <Menu title={<BrandMark className="[&_img]:size-[18px] [&_span:last-child]:text-[18px]" />}>
            <Item onSelect={() => setAboutOpen(true)}>{t.about}</Item>
            <Divider />
            <Menubar.Sub>
              <Menubar.SubTrigger className={ITEM}>
                {t.appearance}
                <span aria-hidden>▸</span>
              </Menubar.SubTrigger>
              <Menubar.Portal>
                <Menubar.SubContent className="aqua-menu z-50 min-w-[180px] p-1 text-popover-foreground" sideOffset={2}>
                  <Menubar.RadioGroup value={mounted ? (theme ?? "system") : "system"} onValueChange={setTheme}>
                    <Radio value="light">{t.light}</Radio>
                    <Radio value="dark">{t.dark}</Radio>
                    <Radio value="system">{t.system}</Radio>
                  </Menubar.RadioGroup>
                </Menubar.SubContent>
              </Menubar.Portal>
            </Menubar.Sub>
            <Menubar.Sub>
              <Menubar.SubTrigger className={ITEM}>
                {t.language}
                <span aria-hidden>▸</span>
              </Menubar.SubTrigger>
              <Menubar.Portal>
                <Menubar.SubContent className="aqua-menu z-50 min-w-[160px] p-1 text-popover-foreground" sideOffset={2}>
                  <Menubar.RadioGroup value={language} onValueChange={(value) => setLanguage(value as "en" | "zh")}>
                    <Radio value="en">English</Radio>
                    <Radio value="zh">中文</Radio>
                  </Menubar.RadioGroup>
                </Menubar.SubContent>
              </Menubar.Portal>
            </Menubar.Sub>
            <Divider />
            <Item onSelect={() => signOut({ redirectUrl: "/" })}>{t.signOut}</Item>
          </Menu>

          <Menu title={t.file} className="max-md:hidden">
            <Item onSelect={() => router.push("/scripts/new")}>{t.newCheck}</Item>
            <Divider />
            <Item onSelect={() => send({ type: "run-mode", mode: "single" })}>{t.runCheck}</Item>
            <Item onSelect={() => send({ type: "run-mode", mode: "bulk" })}>{t.runBulk}</Item>
            <Divider />
            <Item onSelect={() => send({ type: "history-filter", status: null })}>{t.history}</Item>
          </Menu>

          <Menu title={t.view} className="max-md:hidden">
            <Item onSelect={() => send({ type: "history-filter", status: null })}>{t.showAll}</Item>
            <Item onSelect={() => send({ type: "history-filter", status: "success" })}>{t.showPassed}</Item>
            <Item onSelect={() => send({ type: "history-filter", status: "attention_needed" })}>
              {t.showAttention}
            </Item>
            <Item onSelect={() => send({ type: "history-filter", status: "failure" })}>{t.showFailed}</Item>
            <Divider />
            <Item onSelect={() => window.location.reload()}>{t.reload}</Item>
          </Menu>

          <Menu title={t.window} className="max-md:hidden">
            <Item onSelect={toggleShade}>{shaded ? t.expand : t.collapse}</Item>
            <Menubar.CheckboxItem className={ITEM} checked={zoomed} onCheckedChange={toggleZoom}>
              <Menubar.ItemIndicator className="absolute left-2">✓</Menubar.ItemIndicator>
              {t.zoom}
            </Menubar.CheckboxItem>
          </Menu>

          <Menu title={t.help} className="max-md:hidden">
            <Item onSelect={() => router.push("/docs")}>{t.docs}</Item>
            <Item onSelect={() => router.push("/docs/deployment")}>{t.guide}</Item>
            <Divider />
            <Item onSelect={() => open(GITHUB_URL)}>{t.github}</Item>
            <Item onSelect={() => open(`${GITHUB_URL}/issues/new`)}>{t.issue}</Item>
          </Menu>
        </Menubar.Root>

        <div className="ml-auto flex items-center gap-3 text-foreground/85">
          <button
            type="button"
            className="h-8 px-1 text-[13px] hover:text-foreground"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
          >
            {language === "zh" ? "EN" : "中文"}
          </button>
          <button
            type="button"
            aria-label={t.appearance}
            className="grid size-8 place-items-center hover:text-foreground"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Clock language={language} />
          <div className="flex items-center gap-2 border-l border-foreground/15 pl-3">
            {isLoaded && user ? (
              <>
                <span className="hidden text-[13px] lg:inline">{displayName}</span>
                <UserButton appearance={{ elements: { avatarBox: "size-6" } }} afterSignOutUrl="/" />
              </>
            ) : (
              <div className="size-6 animate-pulse rounded-full bg-muted" />
            )}
          </div>
        </div>
      </div>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </header>
  );
}
