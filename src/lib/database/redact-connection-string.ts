// Everything between "//" and the last "@" of the authority: the user and
// password, including an unencoded "@" in the password.
const USERINFO_PATTERN = /\/\/[^/?#]*@/;
// Query parameters that carry a secret (libpq's password and sslpassword,
// and the names other drivers use).
const SECRET_PARAM_PATTERN = /([?&](?:ssl)?(?:password|passwd|pwd|pass|secret|token|sslkey|api_?key|access_?key)=)[^&#]*/gi;

/**
 * Masks the user, password and secret parameters of a database connection
 * string so it can be logged. Works on multi-host URIs (e.g.
 * `mongodb://a,b/db`) that `new URL` rejects.
 */
export function redactConnectionString(connectionString: string): string {
  return connectionString.replace(USERINFO_PATTERN, "//****@").replace(SECRET_PARAM_PATTERN, "$1****");
}
