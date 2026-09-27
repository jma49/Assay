/**
 * Logs errors nothing else caught (unhandled promise rejections and
 * uncaught exceptions) in the browser console, where they would otherwise
 * be easy to miss. Pages show their own messages for the errors they handle.
 */
export function setupGlobalErrorHandlers() {
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[Global] Unhandled promise rejection:", event.reason);
  });
  window.addEventListener("error", (event) => {
    console.error("[Global] Uncaught error:", event.error ?? event.message);
  });
}
