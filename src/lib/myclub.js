// The visitor's chosen club, remembered across sessions.
//
// One club code in localStorage, or null. It is the only piece of personal state the app
// keeps: no account, no cookie, nothing leaves the device. That is worth protecting — the
// moment this becomes an identifier it stops being a preference.
//
// Everything that reads it must cope with null, because most visitors will not have picked
// yet and a first visit should not look broken.

import { useCallback, useEffect, useState } from "react";
import { CLUBS, store } from "../../data.js";

export const MY_CLUB_KEY = "gibson-my-club";

// A stored code is only honoured if it is still a club. Relegation rewrites CLUBS between
// seasons, so a value saved last year can name a side that is no longer in the list —
// returning it would pin a ghost row to the top of the table snapshot.
export function readMyClub() {
  const v = store.get(MY_CLUB_KEY);
  return v && CLUBS[v] ? v : null;
}

export function useMyClub() {
  // Starts null on the server and on the first client render, then fills in from storage.
  // Reading localStorage during render would make the prerendered HTML and the first client
  // render disagree, which is the hydration mismatch class of bug.
  const [club, setClub] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setClub(readMyClub()); setReady(true); }, []);

  const choose = useCallback((code) => {
    if (!CLUBS[code]) return;
    store.set(MY_CLUB_KEY, code);
    setClub(code);
  }, []);

  const clear = useCallback(() => {
    store.set(MY_CLUB_KEY, "");
    setClub(null);
  }, []);

  return { club, choose, clear, ready };
}
