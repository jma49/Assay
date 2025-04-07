import { sendSlackNotification } from "../../scripts/run_sql";
import dotenv from "dotenv";

// 确保加载环境变量
dotenv.config({ path: ".env.local" });

async function testNotifications() {
  console.log("开始测试Slack通知功能...");

  // 检查环境变量
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.warn("警告: SLACK_WEBHOOK_URL 环境变量未设置，测试可能会失败");
  } else {
    // 检查webhook URL格式
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    console.log(
      "Webhook URL类型检查:",
      webhookUrl.includes("hooks.slack.com")
        ? "Slack Webhook"
        : webhookUrl.includes("discord.com")
        ? "Discord Webhook"
        : "未知Webhook类型"
    );
  }

  try {
    // 测试成功通知
    console.log("测试场景1: 发送成功通知");
    await sendSlackNotification("测试通知", "这是一个测试成功消息", false);
    console.log("✅ 成功通知发送成功");

    // 测试错误通知
    console.log("测试场景2: 发送错误通知");
    await sendSlackNotification("测试错误", "模拟错误发生", true);
    console.log("✅ 错误通知发送成功");

    // 测试带有格式化消息的通知
    console.log("测试场景3: 发送带有表格的通知");
    const formattedMessage = `
*SQL查询结果*:
\`\`\`
ID | 名称 | 状态
--- | --- | ---
1 | 测试1 | 成功
2 | 测试2 | 失败
\`\`\`
`;
    await sendSlackNotification("格式化消息测试", formattedMessage, false);
    console.log("✅ 格式化消息通知发送成功");

    console.log("所有测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

testNotifications().catch(console.error);
