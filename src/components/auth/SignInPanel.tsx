"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Github, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export interface Providers {
  google: boolean;
  github: boolean;
  password: boolean;
}

const COPY = {
  en: {
    signIn: { title: "Sign in", description: "Sign in to open your checks.", switch: "New here?", switchLink: "Create an account" },
    signUp: { title: "Create an account", description: "You will start as a viewer; an admin can give you a role to write or approve checks.", switch: "Have an account?", switchLink: "Sign in" },
    google: "Continue with Google",
    github: "Continue with GitHub",
    none: "No sign-in method is set up. Add Google or GitHub OAuth credentials to the server (see .env.example).",
    devTitle: "Development sign-in",
    email: "Email",
    password: "Password",
    devSubmit: "Sign in",
    devCreate: "Create a dev account",
    failed: "Sign-in failed",
    demo: "Or look around first:",
    demoLink: "Try the demo",
  },
  zh: {
    signIn: { title: "登录", description: "登录后查看你的检查。", switch: "第一次使用？", switchLink: "创建账号" },
    signUp: { title: "创建账号", description: "新账号以查看者身份加入，管理员可以分配编写或审批检查的角色。", switch: "已有账号？", switchLink: "登录" },
    google: "使用 Google 继续",
    github: "使用 GitHub 继续",
    none: "服务器还没有配置登录方式。请在服务器上添加 Google 或 GitHub 的 OAuth 凭据（见 .env.example）。",
    devTitle: "开发环境登录",
    email: "邮箱",
    password: "密码",
    devSubmit: "登录",
    devCreate: "创建开发账号",
    failed: "登录失败",
    demo: "也可以先看看：",
    demoLink: "试用演示",
  },
};

/** Where to go after signing in: a path on this site only, never another origin. */
export function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/checks";
  return value;
}

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

/** Sign in and sign up are the same OAuth flow; only the words differ. */
export function SignInPanel({ mode, providers, demo }: { mode: "signIn" | "signUp"; providers: Providers; demo: boolean }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const page = t[mode];
  const search = useSearchParams();
  const callbackURL = safeRedirect(search.get("redirect_url"));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(search.get("error") ? t.failed : null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const social = async (provider: "google" | "github") => {
    setBusy(provider);
    setError(null);
    const { error: failure } = await authClient.signIn.social({ provider, callbackURL, errorCallbackURL: `/${mode === "signIn" ? "sign-in" : "sign-up"}?error=1` });
    if (failure) {
      setError(failure.message ?? t.failed);
      setBusy(null);
    }
  };

  const devSignIn = async (create: boolean) => {
    setBusy(create ? "create" : "password");
    setError(null);
    const result = create
      ? await authClient.signUp.email({ email, password, name: email.split("@")[0] })
      : await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message ?? t.failed);
      setBusy(null);
      return;
    }
    window.location.assign(callbackURL);
  };

  const switchHref = `${mode === "signIn" ? "/sign-up" : "/sign-in"}${search.get("redirect_url") ? `?redirect_url=${encodeURIComponent(callbackURL)}` : ""}`;
  const noProvider = !providers.google && !providers.github && !providers.password;

  return (
    <AuthShell
      title={page.title}
      description={page.description}
      footer={
        <span className="grid gap-1">
          <span>
            {page.switch}{" "}
            <Link href={switchHref} className="font-medium text-primary hover:underline">
              {page.switchLink}
            </Link>
          </span>
          {demo && (
            <span>
              {t.demo}{" "}
              <Link href="/demo" className="font-medium text-primary hover:underline">
                {t.demoLink}
              </Link>
            </span>
          )}
        </span>
      }
    >
      <div className="grid w-full gap-2.5">
        {providers.google && (
          <Button variant="outline" size="lg" disabled={busy !== null} onClick={() => social("google")}>
            {busy === "google" ? <Loader2 className="animate-spin" /> : <GoogleMark />}
            {t.google}
          </Button>
        )}
        {providers.github && (
          <Button variant="outline" size="lg" disabled={busy !== null} onClick={() => social("github")}>
            {busy === "github" ? <Loader2 className="animate-spin" /> : <Github />}
            {t.github}
          </Button>
        )}
        {noProvider && <p className="rounded-md bg-attention-soft px-3 py-2 text-[12.5px] text-attention">{t.none}</p>}
        {providers.password && (
          <form
            className="mt-2 grid gap-2.5 rounded-lg p-3 shadow-border"
            onSubmit={(event) => {
              event.preventDefault();
              void devSignIn(false);
            }}
          >
            <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">{t.devTitle}</p>
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
        )}
        {error && <p className="rounded-md bg-failure-soft px-3 py-2 text-[12.5px] text-failure">{error}</p>}
      </div>
    </AuthShell>
  );
}
