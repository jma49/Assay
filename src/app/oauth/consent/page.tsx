import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ConsentPanel } from "@/components/auth/ConsentPanel";
import { auth } from "@/lib/auth/server";
import { getUserRole, UserRole } from "@/lib/auth/rbac";
import { mcpScopesFor } from "@/server/mcp/caller";

export const dynamic = "force-dynamic";

export const metadata = { title: "Allow access" };

type Query = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Where the authorization server sends someone to approve an MCP client. The
 * query is signed by the server and re-checked when the answer is posted, so
 * this page only has to show it.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect("/sign-in");

  const clientId = first(query.client_id) ?? "";
  const client = clientId
    ? await auth.api.getOAuthClientPublic({ query: { client_id: clientId }, headers: requestHeaders }).catch(() => null)
    : null;

  const role = (await getUserRole(session.user.id)) ?? UserRole.VIEWER;
  return (
    <ConsentPanel
      clientName={client?.client_name || null}
      redirectHost={hostOf(first(query.redirect_uri))}
      scopes={(first(query.scope) ?? "").split(" ").filter(Boolean)}
      email={session.user.email}
      role={role}
      usable={mcpScopesFor(role)}
    />
  );
}

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
}
