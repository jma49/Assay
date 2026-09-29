import { GUEST_COOKIE } from "@/lib/auth/guest";
import { redirectToPath } from "@/server/http/redirect";

/** Ends a guest session and returns to the landing page. */
export async function GET() {
  const response = redirectToPath("/");
  response.cookies.delete(GUEST_COOKIE);
  return response;
}
