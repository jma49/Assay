"use client";

import { apiKeyClient } from "@better-auth/api-key/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { lastLoginMethodClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { emailLocalPart } from "@/lib/utils/email";

/**
 * Same-origin client: the routes live at /api/auth on this app. The OAuth
 * provider client passes an MCP client's signed authorization request from
 * the page URL along with sign-in and consent, so the flow resumes after them.
 */
export const authClient = createAuthClient({ plugins: [apiKeyClient(), lastLoginMethodClient(), oauthProviderClient()] });

const { useSession } = authClient;
export const { signOut } = authClient;

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

/** The signed-in user, or null; isLoaded is false until the session has been read. */
export function useCurrentUser(): { user: CurrentUser | null; isLoaded: boolean } {
  const { data, isPending } = useSession();
  const user = data?.user;
  return {
    user: user ? { id: user.id, name: user.name || emailLocalPart(user.email), email: user.email, image: user.image } : null,
    isLoaded: !isPending,
  };
}
