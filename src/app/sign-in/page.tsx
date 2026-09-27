import { Suspense } from "react";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { enabledProviders } from "@/lib/auth/providers";
import { isDemoMode } from "@/lib/security/demo-sandbox";

// The available sign-in methods come from the server's environment at request time.
export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default function Page() {
  // The redirect target is read from the query, which needs a Suspense boundary.
  return (
    <Suspense>
      <SignInPanel mode="signIn" providers={enabledProviders()} demo={isDemoMode()} />
    </Suspense>
  );
}
