import { envFormatProblems, serverEnv, type ServerEnv } from "@/lib/config/env";
import {
  disabledOptionalFeatures,
  missingEnvMessage,
  missingRequiredEnv,
  shouldEnforceRequiredEnv,
} from "@/lib/config/required-env";
import { logError, logWarn } from "@/server/logging/log";

/**
 * A production server without its required configuration exits instead of
 * serving. Throwing from register() is not enough: Next.js logs it and keeps
 * the server up, answering every request with a 500.
 *
 * A value in the wrong form (env.ts formats) is only warned about for now:
 * once production logs show no such warning, it can fail the start too.
 */
export function checkStartupConfig(env: ServerEnv = serverEnv()): void {
  if (!shouldEnforceRequiredEnv(env)) return;
  const missing = missingRequiredEnv(env);
  if (missing.length > 0) {
    logError(missingEnvMessage(missing));
    process.exit(1);
  }
  for (const { name, expected } of envFormatProblems(env)) {
    logWarn(`Environment variable ${name} is set but is not ${expected}`, { variable: name });
  }
  for (const { feature, variables, whenOff } of disabledOptionalFeatures(env)) {
    logWarn(`Optional feature off: ${feature} (${whenOff})`, { variables });
  }
}
