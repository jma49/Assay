import {
  disabledOptionalFeatures,
  missingEnvMessage,
  missingRequiredEnv,
  shouldEnforceRequiredEnv,
} from "@/lib/config/required-env";
import { logWarn } from "@/server/logging/log";
import { logError } from "@/server/logging/log";

/**
 * A production server without its required configuration exits instead of
 * serving. Throwing from register() is not enough: Next.js logs it and keeps
 * the server up, answering every request with a 500.
 */
export function checkStartupConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (!shouldEnforceRequiredEnv(env)) return;
  const missing = missingRequiredEnv(env);
  if (missing.length > 0) {
    logError(missingEnvMessage(missing));
    process.exit(1);
  }
  for (const { feature, variables, whenOff } of disabledOptionalFeatures(env)) {
    logWarn(`Optional feature off: ${feature} (${whenOff})`, { variables });
  }
}
