/** Hands out a token per request so only the newest response is applied. */
export function createLatestRequest() {
  let latest = 0;
  return {
    start: () => ++latest,
    isLatest: (token: number) => token === latest,
  };
}
