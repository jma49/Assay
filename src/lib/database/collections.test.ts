import { describe, expect, it } from "vitest";
import { COLLECTIONS } from "./collections";
import { INDEXES } from "./indexes";

describe("COLLECTIONS", () => {
  it("keeps the stored collection names", () => {
    // Renaming one of these orphans existing data; change it only with a migration.
    expect(COLLECTIONS).toEqual({
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
      users: "user",
      sessions: "session",
      accounts: "account",
      verifications: "verification",
      apiKeys: "apikey",
    });
  });

  it("names every collection that has indexes", () => {
    const names = new Set<string>(Object.values(COLLECTIONS));
    for (const collection of Object.keys(INDEXES)) expect(names.has(collection), collection).toBe(true);
  });
});
