"use client";

import { apiKeyClient } from "@better-auth/api-key/client";
import { lastLoginMethodClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Same-origin client: the routes live at /api/auth on this app. */
export const authClient = createAuthClient({ plugins: [apiKeyClient(), lastLoginMethodClient()] });

export const { useSession, signIn, signOut } = authClient;

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
    user: user ? { id: user.id, name: user.name || user.email.split("@")[0], email: user.email, image: user.image } : null,
    isLoaded: !isPending,
  };
}
