/**
 * MongoDB collection names. Some keep the first version's names (a rename
 * would only add a migration): checks live in `sql_scripts`, runs in `result`.
 */
export const COLLECTIONS = {
  checks: "sql_scripts",
  runs: "result",
  events: "events",
  batches: "batches",
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
  // Better Auth's collections.
  users: "user",
  sessions: "session",
  accounts: "account",
  verifications: "verification",
  apiKeys: "apikey",
} as const;
