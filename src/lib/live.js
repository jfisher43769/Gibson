import { useEffect, useState } from "react";

// Shared access to /api/events, so the Home board and the Fixtures list can never disagree
// about whether a match is on. Two components each rolling their own fetch is how one of them
// ends up a version behind.
//
// Polling follows the endpoint's own cache: 60s while anything is in play, 5 minutes
// otherwise. There is no point asking more often than the CDN will answer differently, and
// no point asking every minute at 3am in June.
const LIVE_POLL_MS = 60 * 1000;
const IDLE_POLL_MS = 5 * 60 * 1000;

export function useLiveEvents() {
  const [state, setState] = useState({ loading: true, data: null, offline: false });

  useEffect(() => {
    let on = true;
    let timer = null;

    // Nothing is live to a reader who isn't looking. Polling every 60 seconds in a
    // backgrounded tab spends a phone's radio and battery to update a screen nobody can see —
    // and the app's audience is one man with it open on his phone all afternoon. When the tab
    // comes back the poll fires immediately, so returning to it shows a current score rather
    // than whatever was on screen when it was hidden.
    const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

    const schedule = (ms) => { if (on) timer = setTimeout(load, ms); };

    function load() {
      if (!on) return;
      if (hidden()) { schedule(IDLE_POLL_MS); return; }   // check back, but don't fetch
      fetch("/api/events")
        .then((r) => r.json())
        .then((j) => {
          if (!on) return;
          const ok = Boolean(j && j.ok);
          setState({ loading: false, data: ok ? j : null, offline: false });
          const anyLive = ok && Array.isArray(j.live) && j.live.length > 0;
          schedule(anyLive ? LIVE_POLL_MS : IDLE_POLL_MS);
        })
        .catch(() => {
          if (!on) return;
          // Offline is not the same as "the feed said no" — the app falls back to data.js
          // either way, but only one of them is worth telling the reader about.
          setState({ loading: false, data: null, offline: true });
          schedule(IDLE_POLL_MS);
        });
    }

    const onVisible = () => {
      if (!on || hidden()) return;
      if (timer) clearTimeout(timer);
      load();
    };

    load();
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
    return () => {
      on = false;
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return state;
}

// The live match involving either of two clubs, if there is one. Used by the Home board to
// decide whether the fixture it is advertising is actually under way.
export function findLive(data, h, a) {
  if (!data || !Array.isArray(data.live)) return null;
  return data.live.find((m) => (m.h === h && m.a === a)) || null;
}
