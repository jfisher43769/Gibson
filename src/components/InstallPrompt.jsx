import React from "react";
import { store } from "../../data.js";
import { track } from "../lib/track.js";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// "Add GIBSON to your home screen."
//
// It has been a PWA — manifest, service worker, icons — with a Play Store plan, and nothing on
// the page ever invited anyone to install it. An installed app is opened on a Tuesday; a
// bookmark is not.
//
// DRIVEN BY THE BROWSER'S OWN EVENT, not by sniffing the user agent. Chrome and Edge fire
// `beforeinstallprompt` only when the app actually passes their installability checks and is
// not already installed — so if the event never arrives, there is nothing to offer and this
// renders nothing. That is the whole guard: no "install" button that opens a dialog explaining
// the button cannot work, which is what every user-agent-sniffing version of this ends up as.
//
// iOS Safari never fires it and has no programmatic install, so iPhone users see nothing here
// rather than a paragraph of instructions about a share sheet they did not ask about. That is a
// real gap and the honest handling of it; a text recipe belongs on the About page, not in a
// banner that interrupts the scores.
//
// DISMISSAL IS REMEMBERED. Asked once, declined once, never asked again on that device — an
// install banner that returns every visit is the single most reliable way to make someone stop
// visiting. Accepting also stores the flag, because the event does not fire again anyway.
const DISMISS_KEY = "gb_install_dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState(null);
  const [gone, setGone] = React.useState(true);        // hidden until we know it is offerable

  React.useEffect(() => {
    if (store.get(DISMISS_KEY)) return;                // already asked on this device
    const onPrompt = (e) => {
      e.preventDefault();                              // keep it; Chrome's own banner stays away
      setDeferred(e);
      setGone(false);
      track("install_offer_shown", {});
    };
    // Fires when the install completes by any route, including the browser's own menu — clear
    // the banner rather than leave it inviting an install that already happened.
    const onInstalled = () => { store.set(DISMISS_KEY, "1"); setGone(true); track("install_completed", {}); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (gone || !deferred) return null;

  const dismiss = () => { store.set(DISMISS_KEY, "1"); setGone(true); track("install_dismissed", {}); };
  const install = async () => {
    setGone(true);
    store.set(DISMISS_KEY, "1");
    try {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      track("install_choice", { outcome });
    } catch { /* the event goes stale if held too long; nothing to recover */ }
  };

  return (
    <div data-install-prompt style={{
      ...SURFACE.card, borderRadius: 14, padding: "12px 13px", marginBottom: 14,
      border: `1px solid ${faint}`, display: "flex", alignItems: "center", gap: 11,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: chalk, lineHeight: 1.3 }}>
          Add GIBSON to your home screen
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 3, lineHeight: 1.45 }}>
          Opens like an app. No store, no account.
        </div>
      </div>
      <button onClick={install} style={{
        background: "#FFB627", color: "#0B0F0D", border: "none", borderRadius: 999,
        padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
      }}>Add</button>
      <button onClick={dismiss} aria-label="No thanks, don't ask again" style={{
        background: "none", border: "none", color: dim, fontSize: 18, cursor: "pointer",
        padding: "4px 6px", lineHeight: 1,
      }}>×</button>
    </div>
  );
}
