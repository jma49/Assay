import { GoogleGenerativeAI } from "@google/generative-ai";

// 初始化Gemini AI客户端
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * AI错误类型定义
 */
interface AIError extends Error {
  status?: number;
  code?: string;
  errorDetails?: Array<{
    "@type": string;
    retryDelay?: string;
  }>;
}

/**
 * AI请求重试配置
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 30000, // 30秒
};

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 计算指数退避延迟时间
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = exponentialDelay * 0.1 * Math.random(); // 添加10%的随机抖动
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * 带重试机制的AI内容生成
 */
export async function generateContentWithRetry(
  prompt: string,
  model: string = "gemini-1.5-flash",
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<string> {
  const aiModel = genAI.getGenerativeModel({ model });

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`[AI Request] 尝试第 ${attempt + 1} 次请求，模型: ${model}`);

      const result = await aiModel.generateContent(prompt);

      if (!result.response) {
        throw new Error("AI未返回有效响应");
      }

      const content = result.response.text().trim();
      console.log(`[AI Request] 请求成功，返回内容长度: ${content.length}`);

      return content;
    } catch (error: unknown) {
      const isLastAttempt = attempt === retryConfig.maxRetries;
      const aiError = error as AIError;

      // 检查是否是配额限制错误
      if (aiError.status === 429) {
        console.warn(
          `[AI Request] 配额限制错误 (尝试 ${attempt + 1}/${
            retryConfig.maxRetries + 1
          }):`,
          aiError.message
        );

        if (isLastAttempt) {
          throw new Error(
            "AI服务当前繁忙，请稍后重试。可能原因：API配额已用完或请求过于频繁。"
          );
        }

        // 从错误响应中提取建议的重试延迟
        let retryDelay = calculateBackoffDelay(
          attempt,
          retryConfig.baseDelay,
          retryConfig.maxDelay
        );

        // 如果错误包含 retryAfter 信息，使用该值
        if (aiError.errorDetails && Array.isArray(aiError.errorDetails)) {
          const retryInfo = aiError.errorDetails.find(
            (detail) =>
              detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
          );

          if (retryInfo && retryInfo.retryDelay) {
            const retryDelayMs =
              parseInt(retryInfo.retryDelay.replace("s", "")) * 1000;
            retryDelay = Math.min(retryDelayMs, retryConfig.maxDelay);
          }
        }

        console.log(`[AI Request] 等待 ${retryDelay}ms 后重试...`);
        await delay(retryDelay);
        continue;
      }

      // 检查是否是网络错误
      if (aiError.code === "ENOTFOUND" || aiError.code === "ECONNREFUSED") {
        console.warn(
          `[AI Request] 网络错误 (尝试 ${attempt + 1}/${
            retryConfig.maxRetries + 1
          }):`,
          aiError.message
        );

        if (isLastAttempt) {
          throw new Error("无法连接到AI服务，请检查网络连接。");
        }

        const retryDelay = calculateBackoffDelay(
          attempt,
          retryConfig.baseDelay,
          retryConfig.maxDelay
        );
        console.log(`[AI Request] 等待 ${retryDelay}ms 后重试...`);
        await delay(retryDelay);
        continue;
      }

      // 其他错误直接抛出
      console.error(`[AI Request] 请求失败:`, error);
      throw new Error(`AI服务错误: ${aiError.message}`);
    }
  }

  throw new Error("AI请求重试次数已达上限");
}

/**
 * 获取用户友好的错误消息
 */
export function getAIErrorMessage(error: unknown): string {
  const aiError = error as AIError;

  if (aiError.status === 429) {
    return "AI服务当前繁忙，请稍后重试。可能是API配额已用完或请求过于频繁。";
  }

  if (aiError.code === "ENOTFOUND" || aiError.code === "ECONNREFUSED") {
    return "无法连接到AI服务，请检查网络连接。";
  }

  if (aiError.message?.includes("API key")) {
    return "AI服务配置错误，请联系管理员检查API密钥。";
  }

  return `AI服务暂时不可用: ${aiError.message || "未知错误"}`;
}
