import axios from "axios";
import { ExecutionStatusType } from "../types";

/**
 * 发送 Slack 通知。
 *
 * @param scriptId 脚本的唯一标识符。
 * @param message 要发送的消息内容，此消息应已包含 findings。
 * @param statusType 执行的状态类型。
 * @param resultMongoId 可选参数，MongoDB中存储的详细执行结果的ID。
 */
export async function sendSlackNotification(
  scriptId: string,
  message: string,
  statusType: ExecutionStatusType,
  resultMongoId?: string,
): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("Slack Webhook URL 未配置，跳过通知");
      return;
    }

    // 确保我们有一个基础 URL，无论是从环境变量还是默认值
    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const resultUrl = resultMongoId
      ? `${appBaseUrl}/view-execution-result/${resultMongoId}`
      : null;

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
        : null; // 将默认更改为 null，以便后续判断

    // 用于Slack Workflow Builder的源信息文本
    const sourceDisplayText = process.env.GITHUB_ACTIONS
      ? "GitHub Action"
      : "手动触发/本地执行";

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

    // 构建源信息文本，包含链接信息 (用于Block Kit格式)
    let sourceText = "*来源:*\n";
    if (process.env.GITHUB_ACTIONS && githubLogUrl) {
      sourceText += `<${githubLogUrl}|GitHub Action>`;
    } else {
      sourceText += "手动触发/本地执行";
    }

    // 添加结果链接（如果有）
    if (
      resultMongoId &&
      resultUrl &&
      (statusType === "attention_needed" || statusType === "failure")
    ) {
      sourceText += resultUrl ? ` • <${resultUrl}|🔍 查看详细结果>` : "";
    }

    const blocks = [
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*脚本名称:*\n${scriptId}` },
          { type: "mrkdwn", text: `*状态:*\n${icon} ${statusText}` },
          { type: "mrkdwn", text: `*执行时间:*\n${timestamp}` },
          { type: "mrkdwn", text: sourceText },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*消息/结果:*\n\`\`\`${message}\`\`\``, // 使用代码块格式化消息
        },
      },
    ];

    // 如果有查询结果并且状态需要注意，添加单独的详细结果链接部分
    if (
      resultMongoId &&
      resultUrl &&
      (statusType === "attention_needed" || statusType === "failure")
    ) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*需要您的关注:* 发现了异常数据，<${resultUrl}|点击此处查看详细结果> 🔍`,
        },
      });
    }

    // 为Workflow Builder准备的基础变量
    // 这些变量将被映射到Workflow Builder中
    const payload = {
      blocks,
      // 保留一些原始字段以兼容可能存在的旧接收端
      script_name: scriptId,
      status: statusText,
      execution_time: timestamp,
      github_log_url: githubLogUrl || sourceDisplayText,
      message: message,
      // 更友好的结果URL变量
      result_url: resultUrl, // 纯URL，可以在Workflow中格式化
      has_result_url: resultUrl ? true : false, // 布尔值，方便条件显示
      result_link: resultUrl ? `<${resultUrl}|🔍 查看详细结果>` : "", // 预格式化的Markdown链接
      result_link_text: "点击查看详细结果", // 纯文本链接描述
    };

    console.log(
      `发送 Slack 通知 (${scriptId}):`, // 截断长消息
      JSON.stringify(payload).substring(0, 200) + "...",
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
        axiosError.response?.data || axiosError.message,
      );
    } else {
      console.error(
        `发送 Slack 通知 (${scriptId}) 失败 (非 Axios 错误):`,
        error,
      );
    }
  }
}
