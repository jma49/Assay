"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BellRing, Bot, ChevronDown, ListChecks, Loader2, ShieldCheck } from "lucide-react";
import "@/components/landing/landing.css";
import { landingMono, landingSans, landingSerif } from "@/components/landing/fonts";
import { RowAMark } from "@/components/brand/RowAMark";
import { GithubMark } from "@/components/common/GithubMark";
import { SignInBrand } from "./SignInBrand";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { safeRedirect } from "@/lib/auth/redirect";
import { emailLocalPart } from "@/lib/utils/email";
import { cn } from "@/lib/utils/utils";

export interface Providers {
  google: boolean;
  github: boolean;
  password: boolean;
}

type Provider = "google" | "github";

const COPY = {
  en: {
    tagline: "Catch bad data before your customers do.",
    points: [
      { icon: ListChecks, title: "Checks are SQL", body: "A read-only query whose rows are problems, run on a schedule." },
      { icon: BellRing, title: "Alerts where you work", body: "Slack, Feishu, WeCom, Discord or Telegram, once per change." },
      { icon: Bot, title: "Agents welcome", body: "Claude or Cursor can read and run checks through MCP." },
    ],
    signIn: { title: "Sign in to Assay", description: "Use the account you work with.", switch: "New to Assay?", switchLink: "Create an account" },
    signUp: { title: "Create your account", description: "You start as a viewer; an admin can give you a role to write or approve checks.", switch: "Have an account?", switchLink: "Sign in" },
    google: "Continue with Google",
    github: "Continue with GitHub",
    lastUsed: "Last used",
    none: "No sign-in method is set up. Add Google or GitHub OAuth credentials to the server (see docs/authentication.md).",
    devToggle: "Development sign-in",
    email: "Email",
    password: "Password",
    devSubmit: "Sign in",
    devCreate: "Create a dev account",
    demo: "Just looking?",
    demoLink: "Try the demo without an account",
    privacy: "Assay reads your name, email and avatar from the provider, nothing else.",
    home: "Assay home",
    openSource: "Open source · self-hostable",
    errors: {
      access_denied: "Sign-in was cancelled.",
      unable_to_link_account: "This email already has an Assay account from another provider. Sign in the way you did before.",
      account_not_linked: "This email already has an Assay account from another provider. Sign in the way you did before.",
      email_not_found: "The provider did not share an email address. Make one visible and try again.",
      email_not_verified: "Verify your email with the provider first, then try again.",
      unable_to_create_user: "This email cannot be used here. Only some email domains are allowed in this workspace.",
      state_not_found: "The sign-in took too long or was started in another tab. Try again.",
      please_restart_the_process: "The sign-in took too long or was started in another tab. Try again.",
      default: "Sign-in failed. Try again.",
    } as Record<string, string>,
  },
  zh: {
    tagline: "在客户发现之前，先发现数据问题。",
    points: [
      { icon: ListChecks, title: "用 SQL 写检查", body: "只读查询返回的行就是问题，按计划自动执行。" },
      { icon: BellRing, title: "告警发到常用的地方", body: "Slack、飞书、企业微信、Discord、Telegram，状态变化只提醒一次。" },
      { icon: Bot, title: "AI 代理也能用", body: "Claude、Cursor 可以通过 MCP 查看和执行检查。" },
    ],
    signIn: { title: "登录 Assay", description: "使用你工作用的账号登录。", switch: "第一次使用？", switchLink: "创建账号" },
    signUp: { title: "创建账号", description: "新账号以查看者身份加入，管理员可以分配编写或审批检查的角色。", switch: "已有账号？", switchLink: "登录" },
    google: "使用 Google 继续",
    github: "使用 GitHub 继续",
    lastUsed: "上次使用",
    none: "服务器还没有配置登录方式。请在服务器上添加 Google 或 GitHub 的 OAuth 凭据（见 docs/authentication.md）。",
    devToggle: "开发环境登录",
    email: "邮箱",
    password: "密码",
    devSubmit: "登录",
    devCreate: "创建开发账号",
    demo: "只是看看？",
    demoLink: "无需账号试用演示",
    privacy: "Assay 只会从登录服务读取你的名字、邮箱和头像。",
    home: "Assay 首页",
    openSource: "开源 · 可自托管",
    errors: {
      access_denied: "已取消登录。",
      unable_to_link_account: "这个邮箱已经通过其他方式注册了 Assay，请用之前的方式登录。",
      account_not_linked: "这个邮箱已经通过其他方式注册了 Assay，请用之前的方式登录。",
      email_not_found: "登录服务没有提供邮箱地址，请把邮箱设为可见后重试。",
      email_not_verified: "请先在登录服务中验证邮箱，然后重试。",
      unable_to_create_user: "这个邮箱不能在这里使用：本工作区只允许部分邮箱域名。",
      state_not_found: "登录超时，或者是在另一个标签页发起的，请重试。",
      please_restart_the_process: "登录超时，或者是在另一个标签页发起的，请重试。",
      default: "登录失败，请重试。",
    } as Record<string, string>,
  },
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}


function ProviderButton({ provider, label, icon, busy, disabled, lastUsed, lastUsedLabel, onClick }: {
  provider: Provider;
  label: string;
  icon: ReactNode;
  busy: boolean;
  disabled: boolean;
  lastUsed: boolean;
  lastUsedLabel: string;
  onClick: (provider: Provider) => void;
}) {
  return (
    <Button
      variant="outline"
      size="lg"
      disabled={disabled}
      onClick={() => onClick(provider)}
      className={cn("relative h-12 w-full justify-center rounded-full bg-card text-body-md", lastUsed && "shadow-[0_0_0_1.5px_var(--primary)]")}
    >
      {busy ? <Loader2 className="animate-spin" /> : icon}
      {label}
      {lastUsed && (
        <span className="absolute -top-2 right-3 rounded-full bg-primary px-1.5 py-px text-caption font-medium text-primary-foreground">{lastUsedLabel}</span>
      )}
    </Button>
  );
}

const noChanges = () => () => {};

/** Sign in and sign up are the same OAuth flow; only the words differ. */
export function SignInPanel({ mode, providers, demo }: { mode: "signIn" | "signUp"; providers: Providers; demo: boolean }) {
  const { language, setLanguage } = useLanguage();
  const t = COPY[language];
  const page = t[mode];
  const search = useSearchParams();
  const callbackURL = safeRedirect(search.get("redirect_url"));
  const errorCode = search.get("error");
  const [busy, setBusy] = useState<string | null>(null);
  // A code from the OAuth redirect is translated at render time, so switching language translates it too.
  const [error, setError] = useState<{ code: string } | { message: string } | null>(errorCode ? { code: errorCode } : null);
  const errorText = error && ("code" in error ? (t.errors[error.code] ?? t.errors.default) : error.message);
  // The cookie is only visible in the browser: none on the server and while hydrating.
  const lastUsed = useSyncExternalStore(noChanges, () => authClient.getLastUsedLoginMethod(), () => null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const social = async (provider: Provider) => {
    setBusy(provider);
    setError(null);
    const here = mode === "signIn" ? "/sign-in" : "/sign-up";
    const back = search.get("redirect_url") ? `?redirect_url=${encodeURIComponent(callbackURL)}` : "";
    const { error: failure } = await authClient.signIn.social({ provider, callbackURL, errorCallbackURL: `${here}${back}` });
    if (failure) {
      setError(failure.message ? { message: failure.message } : { code: "default" });
      setBusy(null);
    }
  };

  const devSignIn = async (create: boolean) => {
    setBusy(create ? "create" : "password");
    setError(null);
    const result = create
      ? await authClient.signUp.email({ email, password, name: emailLocalPart(email) })
      : await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message ? { message: result.error.message } : { code: "default" });
      setBusy(null);
      return;
    }
    // During an MCP client's authorization the server answers with where the flow continues.
    const next = (result.data as { url?: unknown } | null)?.url;
    window.location.assign(typeof next === "string" ? next : callbackURL);
  };

  const switchHref = `${mode === "signIn" ? "/sign-up" : "/sign-in"}${search.get("redirect_url") ? `?redirect_url=${encodeURIComponent(callbackURL)}` : ""}`;
  const noProvider = !providers.google && !providers.github && !providers.password;

  return (
    <div className={cn("landing grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]", landingSans.variable, landingMono.variable, landingSerif.variable)}>
      {/* The pitch, for people who arrive here first. Hidden on small screens, where the form matters most. */}
      <SignInBrand language={language} tagline={t.tagline} points={t.points} footnote={t.openSource} />

      <main className="flex flex-col bg-paper-raised text-foreground">
        {/* On small screens the brand panel shrinks to a slim ruled header. */}
        <header className="border-b border-rule bg-paper px-5 pt-5 pb-6 text-ink lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <RowAMark className="size-8" />
              <span className="font-display text-title-sm">Assay</span>
            </Link>
            <button type="button" onClick={() => setLanguage(language === "zh" ? "en" : "zh")} className="h-8 rounded-full px-2.5 text-body-sm text-ink-muted hover:text-ink">
              {language === "zh" ? "EN" : "中文"}
            </button>
          </div>
          <p className="font-editorial mt-6 text-display-sm text-balance">{t.tagline}</p>
        </header>
        <div className="hidden h-16 items-center justify-between border-b border-rule px-8 lg:flex">
          <Link href="/" className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            {t.home}
          </Link>
          <button type="button" onClick={() => setLanguage(language === "zh" ? "en" : "zh")} className="h-8 rounded-full px-2.5 text-body-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            {language === "zh" ? "EN" : "中文"}
          </button>
        </div>

        <div className="flex flex-1 items-start justify-center px-5 pt-10 pb-16 lg:items-center lg:pt-0">
          <div className="w-full max-w-[400px]">
            <RowAMark className="hidden size-11 lg:block" />
            <div className="space-y-2 lg:mt-8">
              <h1 className="text-display-sm">{page.title}</h1>
              <p className="text-body-md text-muted-foreground">{page.description}</p>
            </div>

            <div className="mt-8 grid gap-3">
              {providers.google && (
                <ProviderButton provider="google" label={t.google} icon={<GoogleMark />} busy={busy === "google"} disabled={busy !== null} lastUsed={lastUsed === "google"} lastUsedLabel={t.lastUsed} onClick={social} />
              )}
              {providers.github && (
                <ProviderButton provider="github" label={t.github} icon={<GithubMark />} busy={busy === "github"} disabled={busy !== null} lastUsed={lastUsed === "github"} lastUsedLabel={t.lastUsed} onClick={social} />
              )}
              {noProvider && <p className="rounded-xl bg-attention-soft px-3.5 py-3 text-body-sm text-attention">{t.none}</p>}
              {errorText && (
                <p role="alert" className="rounded-xl bg-failure-soft px-3.5 py-3 text-body-sm text-failure">
                  {errorText}
                </p>
              )}
              {(providers.google || providers.github) && (
                <p className="mt-1 flex gap-2 text-caption text-muted-foreground">
                  <ShieldCheck className="mt-px size-3.5 shrink-0" />
                  {t.privacy}
                </p>
              )}
            </div>

            {providers.password && (
              <details className="group mt-6 rounded-xl bg-card shadow-border" open={!providers.google && !providers.github}>
                <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-body-sm font-medium text-muted-foreground">
                  {t.devToggle}
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <form
                  className="grid gap-2.5 border-t p-3.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void devSignIn(false);
                  }}
                >
                  <div className="grid gap-1.5">
                    <Label htmlFor="dev-email">{t.email}</Label>
                    <Input id="dev-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="dev-password">{t.password}</Label>
                    <Input id="dev-password" type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={busy !== null} className="flex-1">
                      {busy === "password" && <Loader2 className="animate-spin" />}
                      {t.devSubmit}
                    </Button>
                    <Button type="button" variant="outline" disabled={busy !== null || !email || password.length < 8} onClick={() => devSignIn(true)}>
                      {busy === "create" && <Loader2 className="animate-spin" />}
                      {t.devCreate}
                    </Button>
                  </div>
                </form>
              </details>
            )}

            <div className="mt-8 space-y-2 border-t pt-6 text-body-sm text-muted-foreground">
              <p>
                {page.switch}{" "}
                <Link href={switchHref} className="font-medium text-primary-ink hover:underline">
                  {page.switchLink}
                </Link>
              </p>
              {demo && (
                <p>
                  {t.demo}{" "}
                  <Link href="/demo" className="group inline-flex items-center gap-1 font-medium text-primary-ink hover:underline">
                    {t.demoLink}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
