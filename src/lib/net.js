// fetch, with a deadline.
//
// Every feed call in this app went out with no timeout. `.catch` only fires on an actual
// network ERROR — a stalled connection, which is the normal failure on mobile data, simply
// never settles. The table view gated its whole block on a `checking` flag cleared in
// `.finally`, so a request that hung left the league table showing a loading skeleton for as
// long as the page stayed open, with the real numbers sitting in data.js the whole time.
//
// AbortController rather than AbortSignal.timeout(): the latter is only in newer browsers, and
// calling it where it doesn't exist throws before fetch is ever reached — which would turn a
// slow feed into no feed at all on exactly the older phones most likely to be on a bad signal.

// Long enough to survive a serverless cold start, short enough that nobody sits looking at a
// spinner. The app always has data.js to fall back on, so erring short costs nothing.
export const FEED_TIMEOUT_MS = 6000;

export function fetchWithTimeout(url, ms = FEED_TIMEOUT_MS, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}
