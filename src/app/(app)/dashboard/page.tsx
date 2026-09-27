import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentGuestId, isValidEmailDomain } from "@/lib/auth/auth-utils";
import { auth } from "@/lib/auth/server";
import Dashboard from "@/components/layout/Dashboard";
import { APP_CONTAINER } from "@/components/layout/app-container";

// 强制动态渲染，避免静态预渲染
export const dynamic = "force-dynamic";

export const metadata = { title: "Runs" };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    // Demo guests have no account; the middleware already let them through.
    if (await currentGuestId()) return <DashboardView />;
    redirect("/sign-in?redirect_url=/dashboard");
  }

  if (!isValidEmailDomain(session.user.email)) {
    redirect("/unauthorized");
  }

  return <DashboardView />;
}

function DashboardView() {
  return (
    <div className="min-h-screen">
      <main className={`${APP_CONTAINER} py-8`}>
        <Dashboard />
      </main>
    </div>
  );
}
