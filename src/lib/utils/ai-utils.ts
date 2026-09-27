import { APICallError, generateText, RetryError, type LanguageModel } from "ai";
import { aiModel, gatewayOptions } from "@/lib/ai/model";

/**
 * Plain-text generation through AI Gateway. The SDK retries transient
 * failures itself and the gateway falls back to another model.
 */
export async function generateContentWithRetry(
  prompt: string,
  options: { feature?: string; userId?: string; model?: LanguageModel } = {},
): Promise<string> {
  const { text } = await generateText({
    model: options.model ?? aiModel(),
    prompt,
    providerOptions: gatewayOptions(options.feature ?? "text", options.userId),
  });
  const content = text.trim();
  if (!content) throw new Error("AI returned an empty response");
  return content;
}

function statusOf(error: unknown): number | undefined {
  if (RetryError.isInstance(error)) return statusOf(error.lastError);
  if (APICallError.isInstance(error)) return error.statusCode;
  return undefined;
}

/** A message safe to show users; the raw error stays in the server log. */
export function getAIErrorMessage(error: unknown): string {
  const status = statusOf(error);
  if (status === 429) {
    return "AI服务当前繁忙，请稍后重试。";
  }
  if (status === 401 || status === 403) {
    return "AI服务未配置或无权访问，请联系管理员。";
  }
  if (status === 402) {
    return "AI服务额度不足，请联系管理员。";
  }
  return "AI服务暂时不可用，请稍后重试。";
}

/**
 * 简单的token估算函数
 * 英文: ~4个字符=1token, 中文: ~1.5个字符=1token
 */
export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[一-鿿]/g) || []).length;
  const englishChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + englishChars / 4);
}

/**
 * 记录token使用情况
 */
export function logTokenUsage(prompt: string, response: string, operation: string) {
  const promptTokens = estimateTokens(prompt);
  const responseTokens = estimateTokens(response);
  console.log(`🔢 [${operation}] Token使用量:`, {
    input: promptTokens,
    output: responseTokens,
    total: promptTokens + responseTokens,
  });
}
