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
export const BALL = { cx: 93, cy: 41.6, r: 5 };

// Named parts, so verify.js can make claims about the drawing that mean something —
// "the raised leg is shorter than the standing one", not "this regex still matches".
export const CUP_PARTS = {
  // ---- Footballer finial ----------------------------------------------------
  // Torso and arms are flush, not separated by slivers of background: at the size this
  // ships those gaps are noise, and one silhouette with a step at each shoulder reads
  // as a person where three floating blocks read as a robot.
  head: circle(100, 9.5, 4.2),
  torso: "M96 15 L104 15 L104.8 28 L95.2 28 Z",
  armLeft: "M93.4 16 L96 16 L96 27 L93.8 27 Z",
  armRight: "M104 16 L106.6 16 L106.6 27 L104.2 27 Z",
  legRaised: "M95.8 28 L99.2 28 L99.2 34.5 L95.8 34.5 Z",
  bootRaised: "M91.5 34.5 L99.2 34.5 L99.2 37.6 L91.5 37.6 Z",
  ball: circle(BALL.cx, BALL.cy, BALL.r),
  legStanding: "M100.8 28 L104.2 28 L104.2 42.5 L100.8 42.5 Z",
  bootStanding: "M100 42.5 L107 42.5 L107 45.6 L100 45.6 Z",
  // Narrower than the ball is wide, so the ball's curve breaks the plinth's edge and
  // reads as a sphere rather than merging into the bar.
  finialPlinth: "M89.8 45.8 L110.2 45.8 L110.2 49.4 L89.8 49.4 Z",

  // ---- Domed lid ------------------------------------------------------------
  lidDome: "M100 50.2 C89 50.2 79.5 56.8 76 64.8 L124 64.8 C120.5 56.8 111 50.2 100 50.2 Z",
  lidRim: "M73 65.8 L127 65.8 L127 70.8 L73 70.8 Z",

  // ---- Bowl -----------------------------------------------------------------
  // Two courses, weighted so the smooth lower mass dominates: that is the plain oval
  // cartouche carrying the inscription, with the chasing above it.
  bowlChase: "M68.5 72 L131.5 72 L130.6 80.4 L69.4 80.4 Z",
  bowlBody: "M69.2 82 L130.8 82 C129.6 97 126 113 119.4 123 C116.4 127.4 112.6 130 108.6 131 "
    + "L91.4 131 C87.4 130 83.6 127.4 80.6 123 C74 113 70.4 97 69.2 82 Z",

  // ---- Handles --------------------------------------------------------------
  // A forged ribbon: it leaves the bowl at the shoulder, loops out and down, and returns
  // to the bowl lower on the body, so the bowl wall closes the loop and the handle goes
  // the whole way round. Traced as ONE closed outline — out along the outer edge, back
  // along the inner — so it needs no fill-rule trickery and no hole.
  //
  // An earlier draft used true concentric rings. They punched correctly in both SVG and
  // canvas and still looked wrong: perfect ellipses stuck on the sides, nothing like
  // forged metal. The two must stay exact mirrors about x=100; verify.js checks it.
  handleLeft: "M70 74.5 C56 70 43 76 40.5 89 C38.5 101 45 112 57 117.5 "
    + "C62 119.6 68 120.4 73.5 120.2 L73.8 112.6 C69 112.6 64 111.6 60 109.6 "
    + "C51 105 47.6 97 49.4 89 C51 82 58.5 78.4 70.2 82.4 Z",
  handleRight: "M130 74.5 C144 70 157 76 159.5 89 C161.5 101 155 112 143 117.5 "
    + "C138 119.6 132 120.4 126.5 120.2 L126.2 112.6 C131 112.6 136 111.6 140 109.6 "
    + "C149 105 152.4 97 150.6 89 C149 82 141.5 78.4 129.8 82.4 Z",

  // ---- Stem and knop --------------------------------------------------------
  stemNeck: "M93.4 131.6 L106.6 131.6 L106.6 137 L93.4 137 Z",
  stemKnop: "M86 138.2 L114 138.2 L110.6 146 L89.4 146 Z",

  // ---- Engraved band and plinth ---------------------------------------------
  baseBand: "M44 170.4 L156 170.4 L156 179 L44 179 Z",
  basePlinth: "M39 180.4 L161 180.4 L161 192 L39 192 Z",
};

// The two courses of winners' plaques, stepping outward towards the base.
export const CUP_DRUM = [
  ...shieldCourse(147.6, 10.4, 11, 38),
  ...shieldCourse(158.8, 10.4, 13, 46),
];

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
