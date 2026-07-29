

// Fire a Vercel Web Analytics custom event — no-op if analytics isn't loaded, never throws
export function track(name, data) {
  try {
    if (typeof window !== "undefined" && typeof window.va === "function") {
      window.va("event", data ? { name, data } : { name });
    }
  } catch {}
}
