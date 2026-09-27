/**
 * Runs saved before commit 8cf3c3b read "Found Found N records". The
 * executor is fixed; this tidies those stored messages on display instead of
 * rewriting history in the database.
 */
export function cleanRunMessage(message: string | null | undefined): string {
  return (message ?? "").replace(/\bFound(\s+Found)+\b/g, "Found");
}
