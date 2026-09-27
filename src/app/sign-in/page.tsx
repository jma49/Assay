import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { enabledProviders } from "@/lib/auth/providers";
import { safeRedirect } from "@/lib/auth/redirect";
import { auth } from "@/lib/auth/server";
import { isDemoMode } from "@/lib/security/demo-sandbox";

// The available sign-in methods come from the server's environment at request time.
export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  // Someone already signed in goes straight on to where they were headed.
  if (await auth.api.getSession({ headers: await headers() })) {
    redirect(safeRedirect((await searchParams).redirect_url));
  }
  // The redirect target is read from the query, which needs a Suspense boundary.
  return (
    <Suspense>
      <SignInPanel mode="signIn" providers={enabledProviders()} demo={isDemoMode()} />
    </Suspense>
  );
}
