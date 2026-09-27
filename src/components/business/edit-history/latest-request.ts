/**
 * Hands out a token per request so only the newest response is applied,
 * and remembers that request's params so it can be retried as-is.
 */
export function createLatestRequest<Params>(initial: Params) {
  let latest = 0;
  let latestParams = initial;
  return {
    start: (params: Params) => {
      latestParams = params;
      return ++latest;
    },
    isLatest: (token: number) => token === latest,
    latestParams: () => latestParams,
  };
}
