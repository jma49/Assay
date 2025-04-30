import axios from "axios";

/**
 * 发送 Slack 通知。
 *
 * @param scriptId 脚本的唯一标识符。
 * @param message 要发送的消息内容。
 * @param isError 指示消息是否为错误消息，默认为 false。
 */
export async function sendSlackNotification(
  scriptId: string,
  message: string,
  isError = false
): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("Slack Webhook URL 未配置，跳过通知");
      return;
    }

    const now = new Date();
    // 使用美国中部时区
    const timestamp = now.toLocaleString("en-US", {
      timeZone: "America/Chicago", // 使用美国中部时区
      hour12: false,
    });

    // 构造 GitHub Action 日志链接（如果适用）
    const githubLogUrl =
      process.env.GITHUB_SERVER_URL &&
      process.env.GITHUB_REPOSITORY &&
      process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : "(手动触发/本地执行)"; // 非 GitHub Actions 环境下的提示

    const status = isError ? "❌ Failed" : "✅ Success";

    // 使用 Block Kit 格式化消息以获得更好的 Slack 显示效果
    const payload = {
      blocks: [
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*脚本名称:*\n${scriptId}` },
            { type: "mrkdwn", text: `*状态:*\n${status}` },
            {
              type: "mrkdwn",
              text: `*执行时间:*\n${timestamp} (美国中部时间)`,
            }, // 更新时区说明
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
      status: status,
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
