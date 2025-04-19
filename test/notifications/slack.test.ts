import { sendSlackNotification } from "../../scripts/run-sql";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config({ path: ".env.local" });

async function testNotifications() {
  console.log("Starting Slack notification tests...");

  // Check environment variables
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.warn(
      "Warning: SLACK_WEBHOOK_URL environment variable is not set, tests may fail"
    );
  } else {
    // Check webhook URL format
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    console.log(
      "Webhook URL type check:",
      webhookUrl.includes("hooks.slack.com")
        ? "Slack Webhook"
        : "Unknown Webhook type"
    );
  }

  try {
    // Test success notification
    console.log("Test Case 1: Sending success notification");
    await sendSlackNotification(
      "Test Notification",
      "This is a test success message",
      false
    );
    console.log("✅ Success notification sent successfully");

    // Test error notification
    console.log("Test Case 2: Sending error notification");
    await sendSlackNotification("Test Error", "Simulated error occurred", true);
    console.log("✅ Error notification sent successfully");

    // Test notification with formatted message
    console.log("Test Case 3: Sending notification with formatted table");
    const formattedMessage = `
*SQL Query Results*:
\`\`\`
ID | Name | Status
--- | --- | ---
1 | Test1 | Success
2 | Test2 | Failed
\`\`\`
`;
    await sendSlackNotification(
      "Formatted Message Test",
      formattedMessage,
      false
    );
    console.log("✅ Formatted message notification sent successfully");

    console.log("All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testNotifications().catch(console.error);
