import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth/server";

// OpenID discovery at the root, next to /api/auth/.well-known/openid-configuration.
export const GET = oauthProviderOpenIdConfigMetadata(auth);
