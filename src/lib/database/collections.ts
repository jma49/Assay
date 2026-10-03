/**
 * MongoDB collection names. Checks and runs were stored as `sql_scripts` and
 * `result` until 2026-09; `migrate-collection-names.ts` renames them on start.
 */
export const COLLECTIONS = {
  checks: "checks",
  runs: "runs",
  events: "events",
  batches: "batches",
  cronHeartbeats: "cron_heartbeats",
  checkActions: "check_actions",
  scriptVersions: "script_versions",
  editHistory: "edit_history",
  approvalRequests: "approval_requests",
  userRoles: "user_roles",
  integrationState: "integration_state",
  telegramLinks: "telegram_links",
  notificationDestinations: "notification_destinations",
  notificationDeliveries: "notification_deliveries",
  notificationReminders: "notification_reminders",
  dataSources: "data_sources",
  // Better Auth's collections.
  users: "user",
  sessions: "session",
  accounts: "account",
  verifications: "verification",
  apiKeys: "apikey",
  // OAuth for MCP clients (Better Auth's MCP and JWT plugins).
  oauthClients: "oauthClient",
  oauthConsents: "oauthConsent",
  oauthRefreshTokens: "oauthRefreshToken",
  oauthClientResources: "oauthClientResource",
  oauthResources: "oauthResource",
  jwks: "jwks",
} as const;
