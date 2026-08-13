// The Gibson Cup — the app's mark, drawn from photographs of the actual trophy.
//
// This replaced a generic two-handled cup on terrace steps, which read as clip-art
// because it was: it had none of the features that make the real thing recognisable.
// The trophy the league has played for since 1890/91 has, top to bottom:
//
//   · a standing footballer as the finial, a ball under his right foot — the single
//     most identifiable feature of the trophy
//   · a domed lid with a stepped rim
//   · an urn-shaped bowl, widest at the shoulder, its repoussé chasing broken by the
//     plain oval cartouche that carries the presentation inscription
//   · two handles that go the whole way round, forged ribbons leaving the shoulder and
//     returning to the body lower down, so the bowl wall closes each loop
//   · a broad drum below the stem, ringed with the winners' shield plaques in courses
//     that step OUTWARD, which is what gives the cup its bottom-heavy stance
//   · a stepped plinth
//
// GEOMETRY RULES, both load-bearing:
//
// 1. 200x200 viewBox, cup centred on x=100. Every consumer assumes this.
// 2. EVERY PART IS A FILLED PATH. No strokes, no second colour. The promo generators
//    fill an array of Path2D with one gradient on a canvas, so a stroked handle or a
//    two-tone bowl could not be shared with them — the mark would have to fork.
//
// Detail is therefore carried by NEGATIVE SPACE: the gaps between the plaques and the
// courses of the bowl are the ornament. That is also why it survives being shrunk —
// at 28px the gaps close and it reads as a solid trophy, at 512px they open into
// individual shields.
//
// PROPORTIONS are measured off the reference photographs as a share of total height,
// and are the thing most easily got wrong: a first pass drew the finial at 24% of the
// mark, which turned a small silver figure into a mascot standing on a cup. CUP_SHARES
// below records what was measured, and verify.js holds the drawing to it.

// Gradient stops for the mark. Defined here rather than at each call site, which is
// how the previous version ended up with four copies of the same two hex values.
export const CUP_GOLD_FROM = "#FFD873";
export const CUP_GOLD_TO = "#FFA51F";
export const CUP_VIEWBOX = "0 0 200 200";

// An explicit circle: two half-arcs between opposite points. The short form
// `M cx cy A r r 0 1 1 cx-0.01 cy Z` looks tidier but is ambiguous — the implied centre
// lands a full radius away from the point given, which is why the football spent three
// drafts buried in the plinth instead of under the boot.
const circle = (cx, cy, r) =>
  `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

// One course of the winners' plaques. On the real cup the plaques are riveted onto a
// solid drum band, so that is how this is built: an unbroken band across the top of the
// course, with the shields hanging below it and gaps only between their lower halves.
// Cut as full-height slots instead, the course reads as a picket fence.
function shieldCourse(top, height, count, halfWidth) {
  const gap = 1.5;
  const shoulder = top + height * 0.42;
  const w = (halfWidth * 2 - gap * (count - 1)) / count;
  const out = [
    `M${100 - halfWidth} ${top} L${100 + halfWidth} ${top} `
    + `L${100 + halfWidth} ${shoulder.toFixed(1)} L${100 - halfWidth} ${shoulder.toFixed(1)} Z`,
  ];
  for (let i = 0; i < count; i++) {
    const x = 100 - halfWidth + i * (w + gap);
    const r = x + w, mid = x + w / 2, bot = top + height;
    out.push(
      `M${x.toFixed(1)} ${shoulder.toFixed(1)} L${r.toFixed(1)} ${shoulder.toFixed(1)} `
      + `L${r.toFixed(1)} ${(shoulder + height * 0.22).toFixed(1)} `
      + `Q${r.toFixed(1)} ${bot.toFixed(1)} ${mid.toFixed(1)} ${bot.toFixed(1)} `
      + `Q${x.toFixed(1)} ${bot.toFixed(1)} ${x.toFixed(1)} ${(shoulder + height * 0.22).toFixed(1)} Z`
    );
  }
  return out;
}

// The football under his right boot. Named so the checks can assert where it sits
// relative to the boot rather than pattern-matching a path string.
export const BALL = { cx: 96.4, cy: 27.4, r: 2.7 };

// Named parts, so verify.js can make claims about the drawing that mean something —
// "the raised leg is shorter than the standing one", not "this regex still matches".
export const CUP_PARTS = {
  // ---- Footballer finial ----------------------------------------------------
  // Torso and arms are flush, not separated by slivers of background: at the size this
  // ships those gaps are noise, and one silhouette with a step at each shoulder reads
  // as a person where three floating blocks read as a robot.
  head: circle(100, 9.2, 3.1),
  torso: "M97.6 12.4 L102.4 12.4 L103 19.8 L97 19.8 Z",
  armLeft: "M95.8 13.2 L97.6 13.2 L97.6 19.4 L96 19.4 Z",
  armRight: "M102.4 13.2 L104.2 13.2 L104 19.4 L102.4 19.4 Z",
  legRaised: "M97.8 19.8 L99.6 19.8 L99.6 23.4 L97.8 23.4 Z",
  bootRaised: "M95.4 23.4 L99.6 23.4 L99.6 25.2 L95.4 25.2 Z",
  ball: circle(BALL.cx, BALL.cy, BALL.r),
  legStanding: "M100.8 19.8 L102.6 19.8 L102.6 27.6 L100.8 27.6 Z",
  bootStanding: "M100.4 27.6 L104.4 27.6 L104.4 29.4 L100.4 29.4 Z",
  // Narrower than the ball is wide, so the ball's curve breaks the plinth's edge and
  // reads as a sphere rather than merging into the bar.
  finialPlinth: "M94.4 29.6 L105.6 29.6 L105.6 32 L94.4 32 Z",

  // ---- Domed lid ------------------------------------------------------------
  lidDome: "M100 33 C88 33 78 40 74.5 46 L125.5 46 C122 40 112 33 100 33 Z",
  lidRim: "M71.5 46.8 L128.5 46.8 L128.5 51.6 L71.5 51.6 Z",

  // ---- Bowl -----------------------------------------------------------------
  // Two courses, weighted so the smooth lower mass dominates: that is the plain oval
  // cartouche carrying the inscription, with the chasing above it.
  bowlChase: "M67 52.8 L133 52.8 L132 61 L68 61 Z",
  bowlBody: "M67.8 62.6 L132.2 62.6 C131 78 127.4 96 121 106.5 C118 111 114 113.8 110 114.8 "
    + "L90 114.8 C86 113.8 82 111 79 106.5 C72.6 96 69 78 67.8 62.6 Z",

  // ---- Handles --------------------------------------------------------------
  // A forged ribbon: it leaves the bowl at the shoulder, loops out and down, and returns
  // to the bowl lower on the body, so the bowl wall closes the loop and the handle goes
  // the whole way round. Traced as ONE closed outline — out along the outer edge, back
  // along the inner — so it needs no fill-rule trickery and no hole.
  //
  // An earlier draft used true concentric rings. They punched correctly in both SVG and
  // canvas and still looked wrong: perfect ellipses stuck on the sides, nothing like
  // forged metal. The two must stay exact mirrors about x=100; verify.js checks it.
  handleLeft: "M68.6 55.5 C53.9 50.8 40.3 57.1 37.7 70.6 C35.6 83 42.4 94.5 55 100.2 "
  + "C60.2 102.4 66.5 103.2 72.2 103 L72.6 95.1 C67.5 95.1 62.3 94.1 58.1 92 "
  + "C48.7 87.2 45.1 78.9 47 70.6 C48.7 63.3 56.5 59.6 68.8 63.7 Z",
  handleRight: "M131.4 55.5 C146.1 50.8 159.7 57.1 162.3 70.6 C164.4 83 157.6 94.5 145 100.2 "
  + "C139.8 102.4 133.5 103.2 127.8 103 L127.4 95.1 C132.5 95.1 137.7 94.1 141.9 92 "
  + "C151.3 87.2 154.9 78.9 153 70.6 C151.3 63.3 143.5 59.6 131.2 63.7 Z",

  // ---- Stem and knop --------------------------------------------------------
  stemNeck: "M94.6 115.6 L105.4 115.6 L105.4 119.8 L94.6 119.8 Z",
  stemKnop: "M88 120.4 L112 120.4 L109.4 126.6 L90.6 126.6 Z",

  // ---- Engraved band and plinth ---------------------------------------------
  baseBand: "M48 166 L152 166 L152 174.4 L48 174.4 Z",
  basePlinth: "M43 175.4 L157 175.4 L157 192 L43 192 Z",
};

// The two courses of winners' plaques, stepping outward towards the base.
export const CUP_DRUM = [
  ...shieldCourse(127.4, 12.2, 9, 33),
  ...shieldCourse(140, 12.2, 11, 40),
  ...shieldCourse(152.6, 12.2, 13, 47),
];

// Which parts make up each section of the trophy, so the proportions can be checked
// rather than eyeballed.
const P = CUP_PARTS;
export const CUP_PATHS = [
  P.head, P.torso, P.armLeft, P.armRight,
  P.legRaised, P.bootRaised, P.ball, P.legStanding, P.bootStanding, P.finialPlinth,
  P.lidDome, P.lidRim,
  P.bowlChase, P.bowlBody,
  P.handleLeft, P.handleRight,
  P.stemNeck, P.stemKnop,
  ...CUP_DRUM,
  P.baseBand, P.basePlinth,
];

export const CUP_SECTIONS = {
  finial: [P.head, P.torso, P.armLeft, P.armRight, P.legRaised, P.bootRaised, P.ball,
    P.legStanding, P.bootStanding, P.finialPlinth],
  lid: [P.lidDome, P.lidRim],
  bowl: [P.bowlChase, P.bowlBody],
  stem: [P.stemNeck, P.stemKnop],
  drum: CUP_DRUM,
  base: [P.baseBand, P.basePlinth],
};

// Share of total height each section should occupy, measured off the reference photos.
// Ranges, not exact figures — the photos are hand-measured off three different angles,
// so these are "what the real trophy looks like", not spurious precision.
export const CUP_SHARES = {
  finial: [0.09, 0.17],
  lid: [0.08, 0.14],
  bowl: [0.29, 0.37],
  stem: [0.04, 0.09],
  drum: [0.17, 0.27],
  base: [0.10, 0.17],
};

// The vertical extent of a group of paths, and the mark's total height.
export function extentY(paths) {
  const ys = paths.flatMap((d) => pathPoints(d).map(([, y]) => y));
  return { top: Math.min(...ys), bottom: Math.max(...ys) };
}
export function heightShare(section) {
  const all = extentY(CUP_PATHS);
  const s = extentY(CUP_SECTIONS[section]);
  return (s.bottom - s.top) / (all.bottom - all.top);
}

// Every (x, y) pair in a path, in order — used by the checks to reason about the drawing
// (is this leg shorter, are these two shapes mirrored) without parsing SVG properly.
export function pathPoints(d) {
  const nums = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  const out = [];
  // Arc segments carry five parameters before their endpoint; everything else here is
  // plain coordinate pairs, so walk the commands rather than assuming pairs throughout.
  const tokens = d.match(/[MLCQZAmlcqza][^MLCQZAmlcqza]*/g) || [];
  let i = 0;
  for (const t of tokens) {
    const cmd = t[0].toUpperCase();
    const vals = (t.slice(1).match(/-?\d+(\.\d+)?/g) || []).map(Number);
    if (cmd === "Z") continue;
    if (cmd === "A") {
      for (let k = 0; k + 6 < vals.length + 1; k += 7) out.push([vals[k + 5], vals[k + 6]]);
    } else {
      for (let k = 0; k + 1 < vals.length; k += 2) out.push([vals[k], vals[k + 1]]);
    }
    i += vals.length;
  }
  return out;
}

// Standalone SVG markup for the mark, for the consumers that need a string rather than
// JSX — the OG card renders it as a data URI because satori's SVG subset is limited.
// `idSuffix` keeps gradient ids unique when several marks share one document.
export function cupSvg(size, idSuffix = "") {
  const id = `gibson-cup-gold${idSuffix}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${CUP_VIEWBOX}">`
    + `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="${CUP_GOLD_FROM}"/><stop offset="1" stop-color="${CUP_GOLD_TO}"/>`
    + `</linearGradient></defs><g fill="url(#${id})">`
    + CUP_PATHS.map((d) => `<path d="${d}"/>`).join("")
    + `</g></svg>`;
}

// The literal the two browser-injected drawing kits must carry. Those kits
// (scripts/promo/kit.js and the inline kit in scripts/promo/render.mjs) are read as TEXT
// and spliced into a page as a plain <script>, so they cannot import this module — the
// same situation as the three TheSportsDB club maps. They keep a copy, `node
// scripts/sync-cup.mjs` writes it, and verify.js proves the copy still matches.
export function cupPathsLiteral() {
  return `const CUP_D=[${CUP_PATHS.map((d) => JSON.stringify(d)).join(",")}];`;
}
