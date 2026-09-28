import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth/server";

// RFC 8414 metadata. The issuer is <origin>/api/auth, so spec clients ask for
// /.well-known/oauth-authorization-server/api/auth; some still ask the bare path.
export const GET = oauthProviderAuthServerMetadata(auth);
