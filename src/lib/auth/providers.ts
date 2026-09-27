/**
 * Which sign-in methods this server offers, from its environment. Kept apart
 * from the auth server module so pages can read it without a database.
 */
export function enabledProviders(env: Record<string, string | undefined> = process.env) {
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    // Email and password exists only to sign in on a development machine
    // without OAuth apps; it is off in production whatever the variable says.
    password: env.NODE_ENV === "development" && env.AUTH_DEV_PASSWORD_LOGIN === "true",
  };
}
