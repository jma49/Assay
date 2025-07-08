import { sendSlackNotification } from "../../scripts/services/slack-service";
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
      "Test Success Notification",
      "This is a test success message.",
      "success"
    );
    console.log("✅ Success notification sent successfully");

    // Test error notification
    console.log("Test Case 2: Sending failure notification");
    await sendSlackNotification(
      "Test Failure Notification",
      "Simulated failure occurred.",
      "failure"
    );
    console.log("✅ Failure notification sent successfully");

    // Test attention_needed notification
    console.log("Test Case 3: Sending attention_needed notification");
    await sendSlackNotification(
      "Test Attention Notification",
      "This is a test attention_needed message (e.g., duplicates found).",
      "attention_needed"
    );
    console.log("✅ Attention_needed notification sent successfully");

    // Test notification with formatted message (as success)
    console.log(
      "Test Case 4: Sending success notification with formatted table"
    );
    const formattedMessage = `
*SQL Query Results*: (This is part of the main message)
\`\`\`
ID | Name | Status
--- | --- | ---
1 | Test1 | Success
2 | Test2 | Failed
\`\`\`
`;
    await sendSlackNotification(
      "Formatted Success Message Test",
      formattedMessage,
      "success"
    );
    console.log("✅ Formatted success message notification sent successfully");

    // Test notification with author and tag information
    console.log(
      "Test Case 5: Sending notification with author and tag information"
    );
    await sendSlackNotification(
      "Test Script with Author",
      "测试脚本执行成功，包含作者和标签信息。",
      "success",
      undefined,
      "测试, 样例",
      "张三"
    );
    console.log("✅ Notification with author and tag sent successfully");

    console.log("All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testNotifications().catch(console.error);
