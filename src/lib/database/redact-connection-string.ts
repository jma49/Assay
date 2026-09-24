const CREDENTIALS_PATTERN = /(\/\/[^:/@]+:)[^/]*@/;

/**
 * Masks the password in a database connection string so it can be logged.
 * Works on multi-host URIs (e.g. `mongodb://a,b/db`) that `new URL` rejects.
 */
export function redactConnectionString(connectionString: string): string {
  return connectionString.replace(CREDENTIALS_PATTERN, "$1****@");
}
