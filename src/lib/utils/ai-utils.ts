import { generateText, type LanguageModel } from "ai";
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

/** A rough token count: about 4 characters per token in English, 1.5 in Chinese. */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[一-鿿]/g) || []).length;
  const englishChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + englishChars / 4);
}

export function logTokenUsage(prompt: string, response: string, operation: string) {
  const input = estimateTokens(prompt);
  const output = estimateTokens(response);
  console.log(`[AI] ${operation} token estimate:`, { input, output, total: input + output });
}
