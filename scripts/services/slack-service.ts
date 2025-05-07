import axios from "axios";
import { ExecutionStatusType } from "../types";

/**
 * 发送 Slack 通知。
 *
 * @param scriptId 脚本的唯一标识符。
 * @param message 要发送的消息内容，此消息应已包含 findings。
 * @param statusType 执行的状态类型。
 */
export async function sendSlackNotification(
  scriptId: string,
  message: string,
  statusType: ExecutionStatusType
): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("Slack Webhook URL 未配置，跳过通知");
      return;
    }

    const now = new Date();
    // 使用美国中部时区，并明确格式
    const timestamp = now.toLocaleString("en-US", {
      timeZone: "America/Chicago", // 确保使用美国中部时区
      year: "numeric", // 年份 (e.g., 2025)
      month: "short", // 月份缩写 (e.g., May)
      day: "numeric", // 日期 (e.g., 5)
      hour: "numeric", // 小时 (e.g., 2)
      minute: "2-digit", // 分钟 (e.g., 16)
      second: "2-digit", // 秒 (e.g., 30)
      hour12: true, // 使用 12 小时制 (e.g., 2:16 PM)
      timeZoneName: "short", // 包含时区缩写 (e.g., CDT/CST)
    });

    // 构造 GitHub Action 日志链接（如果适用）
    const githubLogUrl =
      process.env.GITHUB_SERVER_URL &&
      process.env.GITHUB_REPOSITORY &&
      process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : "(手动触发/本地执行)"; // 非 GitHub Actions 环境下的提示

    let statusText: string;
    let icon: string;

    switch (statusType) {
      case "failure":
        statusText = "❌ Failed";
        icon = "❌";
        break;
      case "attention_needed":
        statusText = "❗ Attention Needed";
        icon = "❗";
        break;
      case "success":
      default:
        statusText = "✅ Success";
        icon = "✅";
        break;
    }

    // 使用 Block Kit 格式化消息以获得更好的 Slack 显示效果
    const payload = {
      blocks: [
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*脚本名称:*\n${scriptId}` },
            { type: "mrkdwn", text: `*状态:*\n${icon} ${statusText}` },
            {
              type: "mrkdwn",
              text: `*执行时间:*\n${timestamp}`,
            },
            {
              type: "mrkdwn",
              text: `*来源:*\n${
                process.env.GITHUB_ACTIONS
                  ? `<${githubLogUrl}|GitHub Action>`
                  : "手动触发/本地执行"
              }`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*消息/结果:*\n\`\`\`${message}\`\`\``, // 使用代码块格式化消息
          },
        },
      ],
      // 保留一些原始字段以兼容可能存在的旧接收端
      script_name: scriptId,
      status: statusText,
      github_log_url: githubLogUrl,
      message: message,
    };

    console.log(
      `发送 Slack 通知 (${scriptId}):`, // 截断长消息
      JSON.stringify(payload).substring(0, 200) + "..."
    );

    await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`Slack 通知 (${scriptId}) 已发送`);
  } catch (error: unknown) {
    // 更健壮的 Axios 错误处理
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = error as any;
    if (axiosError?.isAxiosError) {
      console.error(
        `发送 Slack 通知 (${scriptId}) 失败 (Axios Error ${
          axiosError.code || "N/A"
        }):`,
        axiosError.response?.data || axiosError.message
      );
    } else {
      console.error(
        `发送 Slack 通知 (${scriptId}) 失败 (非 Axios 错误):`,
        error
      );
    }
  }
}
