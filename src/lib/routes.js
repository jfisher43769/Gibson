import React from "react";
import {
  CLUBS,
} from "../../data.js";

/* ================= ROUTING (client + build-time prerender) ================= */
export const SITE_ORIGIN = "https://gibsonstats.com";

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const ROUTE_CLUBS = Object.keys(CLUBS).filter((k) => k !== "GLV"); // twelve current clubs

export const CLUB_TO_SLUG = Object.fromEntries(ROUTE_CLUBS.map((k) => [k, slugify(CLUBS[k].name)]));

const SLUG_TO_CLUB = Object.fromEntries(ROUTE_CLUBS.map((k) => [CLUB_TO_SLUG[k], k]));

// Every route that gets a URL + its own prerendered HTML file.
export const ALL_ROUTES = ["/", "/table", "/fixtures", "/predictor", "/stats", ...ROUTE_CLUBS.map((k) => `/club/${CLUB_TO_SLUG[k]}`)];

const cleanPath = (path) => ((path || "/").replace(/\/+$/, "") || "/");

// Canonical URL path for the current app state.
export function pathForState(s) {
  if (s.clubPage && CLUB_TO_SLUG[s.clubPage]) return `/club/${CLUB_TO_SLUG[s.clubPage]}`;
  if (s.tab === "matches" && s.matchesSub === "table") return "/table";
  if (s.tab === "matches" && s.matchesSub === "fixtures") return "/fixtures";
  if (s.tab === "predictor") return "/predictor";
  if (s.tab === "stats") return "/stats";
  return "/";
}

// Partial app state a given path pins (only the fields that route determines).
export function stateFromPath(path) {
  const p = cleanPath(path);
  if (p.startsWith("/club/")) {
    const code = SLUG_TO_CLUB[p.slice(6)];
    if (code) return { clubPage: code };
  }
  if (p === "/table") return { tab: "matches", matchesSub: "table", clubPage: null };
  if (p === "/fixtures") return { tab: "matches", matchesSub: "fixtures", clubPage: null };
  if (p === "/predictor") return { tab: "predictor", clubPage: null };
  if (p === "/stats") return { tab: "stats", statsSub: "lab", clubPage: null };
  return { tab: "home", clubPage: null };
}

// Per-route <title> + meta description.
export function metaForPath(path) {
  const p = cleanPath(path);
  if (p.startsWith("/club/")) {
    const code = SLUG_TO_CLUB[p.slice(6)];
    if (code) {
      const c = CLUBS[code];
      return {
        title: `${c.name} — GIBSON`,
        description: `${c.name} on GIBSON: 25/26 season stats, squad and GIBSON Index, transfers, 26/27 fixtures and honours. Home ground ${c.ground}.`,
      };
    }
  }
  const M = {
    "/table": { title: "NIFL Premiership Table — GIBSON", description: "The Sports Direct Premiership table: final 25/26 standings, form and squad market values for all twelve clubs." },
    "/fixtures": { title: "NIFL Premiership Fixtures — GIBSON", description: "Every 26/27 Premiership fixture, by club and by round, plus the Irish League clubs' European ties." },
    "/predictor": { title: "The Predictor — GIBSON", description: "Predict the 26/27 table and every gameweek's scores, then share your card. Free, built by a fan." },
    "/stats": { title: "Stats Lab — GIBSON", description: "xG, expected goals, clean sheets, discipline and the GIBSON Index for the NIFL Premiership." },
  };
  return M[p] || { title: "GIBSON — The Home of Irish League Stats", description: "NIFL Premiership tables, fixtures, results, transfers, xG and player stats for all twelve clubs." };
}

// SportsTeam structured data for a club route (null for section routes).
export function jsonLdForPath(path) {
  const p = cleanPath(path);
  if (!p.startsWith("/club/")) return null;
  const code = SLUG_TO_CLUB[p.slice(6)];
  if (!code) return null;
  const c = CLUBS[code];
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: c.name,
    sport: "Association football",
    memberOf: { "@type": "SportsOrganization", name: "NIFL Premiership", alternateName: "Northern Ireland Football League Premiership" },
    location: { "@type": "Place", name: c.ground },
    url: `${SITE_ORIGIN}/club/${CLUB_TO_SLUG[code]}`,
  };
}

// Absolute og:image/twitter:image URL for a route — every route gets the dynamic /api/og
// card, including root (?type=home). A relative fallback (og-card.png) doesn't reliably
// resolve for social scrapers without an og:url to resolve it against, which is why the
// root card previously didn't render; every route here returns an absolute URL instead.
export function ogImageForPath(path) {
  const p = cleanPath(path);
  if (p === "/") return `${SITE_ORIGIN}/api/og?type=home`;
  if (p.startsWith("/club/")) {
    const code = SLUG_TO_CLUB[p.slice(6)];
    return code ? `${SITE_ORIGIN}/api/og?type=club&id=${code}` : null;
  }
  const section = { "/table": "table", "/fixtures": "fixtures", "/predictor": "predictor", "/stats": "stats" }[p];
  return section ? `${SITE_ORIGIN}/api/og?type=section&id=${section}` : null;
}

// Initial path: the browser URL in the client, the injected route during prerender, else root.
export function initialPath() {
  try { if (typeof window !== "undefined" && window.location) return window.location.pathname; } catch {}
  try { if (typeof globalThis !== "undefined" && globalThis.__GIBSON_ROUTE__) return globalThis.__GIBSON_ROUTE__; } catch {}
  return "/";
}

// Client-only: reflect the current route into document title, meta, canonical and club JSON-LD.
export function applyMeta(path) {
  if (typeof document === "undefined") return;
  try {
    const m = metaForPath(path);
    document.title = m.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", m.description);
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.setAttribute("href", SITE_ORIGIN + (path === "/" ? "/" : cleanPath(path)));
    const ld = jsonLdForPath(path);
    let el = document.getElementById("ld-club");
    if (ld) {
      if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = "ld-club"; document.head.appendChild(el); }
      el.textContent = JSON.stringify(ld);
    } else if (el) { el.remove(); }
  } catch {}
}
