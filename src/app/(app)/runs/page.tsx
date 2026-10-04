import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentGuestId, isValidEmailDomain } from "@/lib/auth/auth-utils";
import { auth } from "@/lib/auth/server";
import Dashboard from "@/components/layout/Dashboard";
import { searchLinkOf } from "@/components/runs/history/runs";
import { APP_CONTAINER } from "@/components/layout/app-container";

export const dynamic = "force-dynamic";

export const metadata = { title: "Runs" };

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ search?: string | string[] }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  // A link from a check's page opens the history filtered to it.
  const search = searchLinkOf((await searchParams).search);

  if (!session) {
    // Demo guests have no account; the proxy already let them through.
    if (await currentGuestId()) return <RunsView search={search} />;
    redirect("/sign-in?redirect_url=/runs");
  }

  if (!isValidEmailDomain(session.user.email)) {
    redirect("/unauthorized");
  }

  return <RunsView search={search} />;
}

function RunsView({ search }: { search: string }) {
  return (
    <div className="min-h-screen">
      <main className={`${APP_CONTAINER} py-6`}>
        <Dashboard initialSearch={search} />
      </main>
    </div>
  );
}
