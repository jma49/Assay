import Link from "next/link";
import { useLanding } from "../../lib/context";

/**
 * "Sign in" for a guest, "Open Assay" for a signed-in reader. While the session loads, an invisible "Sign in" holds the
 * guest's width (the common case), so nothing beside it moves for a guest.
 */
export function SessionLink({ className, signIn, openApp }: { className: string; signIn: string; openApp: string }) {
  const { session, links } = useLanding();
  if (session === "loading")
    return (
      <span className={`${className} session-pending`} aria-hidden="true">
        {signIn}
      </span>
    );
  return (
    <Link className={className} href={session === "user" ? links.app : links.signIn}>
      {session === "user" ? openApp : signIn}
    </Link>
  );
}
