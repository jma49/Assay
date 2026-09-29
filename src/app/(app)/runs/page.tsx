import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentGuestId, isValidEmailDomain } from "@/lib/auth/auth-utils";
import { auth } from "@/lib/auth/server";
import Dashboard from "@/components/layout/Dashboard";
import { APP_CONTAINER } from "@/components/layout/app-container";

export const dynamic = "force-dynamic";

export const metadata = { title: "Runs" };

export default async function RunsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    // Demo guests have no account; the proxy already let them through.
    if (await currentGuestId()) return <RunsView />;
    redirect("/sign-in?redirect_url=/runs");
  }

  if (!isValidEmailDomain(session.user.email)) {
    redirect("/unauthorized");
  }

  return <RunsView />;
}

function RunsView() {
  return (
    <div className="min-h-screen">
      <main className={`${APP_CONTAINER} py-6`}>
        <Dashboard />
      </main>
    </div>
  );
}
