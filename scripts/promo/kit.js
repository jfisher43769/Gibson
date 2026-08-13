/* Browser-side drawing kit shared by the GIBSON promo generators.
   Injected into the page as a plain <script> — not a module. Expects W, H, ctx, cv
   to be defined by the host page before this runs. */

const BG = '#0B1512', GOLD = '#FFB627', GOLD_HI = '#FFD873', CHALK = '#EDF5EF',
      GREEN = '#3DDC84', SKY = '#5EC8F2', RED = '#E8663C';

const cl = x => x < 0 ? 0 : x > 1 ? 1 : x;
const seg = (t, a, b) => cl((t - a) / (b - a));
const outExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const outBack = x => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function rng(s) { let v = (s * 2654435761) >>> 0; return () => { v = (v * 1664525 + 1013904223) >>> 0; return v / 4294967296; }; }

// Same WCAG rule the app's crests use, so shield text matches the real thing.
function lum(hex) {
  const p = hex.replace('#', '').match(/.{2}/g).map(h => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return .2126 * p[0] + .7152 * p[1] + .0722 * p[2];
}
function contrastText(fill) {
  const l = lum(fill), a = (Math.max(lum(CHALK), l) + .05) / (Math.min(lum(CHALK), l) + .05),
        b = (Math.max(l, lum('#10241B')) + .05) / (Math.min(l, lum('#10241B')) + .05);
  return a >= b ? CHALK : '#10241B';
}

const scan = document.createElement('canvas'); scan.width = W; scan.height = H;
{ const s = scan.getContext('2d'); s.fillStyle = 'rgba(0,0,0,0.20)'; for (let y = 0; y < H; y += 4) s.fillRect(0, y, W, 1); }

function fitFont(txt, weight, maxW, size) {
  ctx.font = weight + ' ' + size + 'px "Barlow Condensed"';
  while (ctx.measureText(txt).width > maxW && size > 12) { size -= 3; ctx.font = weight + ' ' + size + 'px "Barlow Condensed"'; }
  return size;
}

// Impact type: optional chromatic split, always a drop shadow on the solid fill so it
// stays legible over club-colour sweeps.
function slam(txt, x, y, size, color, split, weight, maxW, track) {
  weight = weight || 800; maxW = maxW || W - 110;
  const s = fitFont(txt, weight, maxW, size);
  ctx.font = weight + ' ' + s + 'px "Barlow Condensed"';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const shadowOn = () => { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 5; };
  const shadowOff = () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; };
  if (track) {
    const chars = [...txt]; let tot = 0; for (const c of chars) tot += ctx.measureText(c).width + track; tot -= track;
    const cx = x - tot / 2;
    const put = (col, dx) => { ctx.fillStyle = col; let p = cx; for (const c of chars) { ctx.fillText(c, p + ctx.measureText(c).width / 2 + dx, y); p += ctx.measureText(c).width + track; } };
    if (split > 0.4) { ctx.globalCompositeOperation = 'lighter'; put('#FF0A3C', -split); put('#00E9FF', split); ctx.globalCompositeOperation = 'source-over'; }
    shadowOn(); put(color, 0); shadowOff();
    return s;
  }
  if (split > 0.4) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#FF0A3C'; ctx.fillText(txt, x - split, y);
    ctx.fillStyle = '#00E9FF'; ctx.fillText(txt, x + split, y);
    ctx.globalCompositeOperation = 'source-over';
  }
  shadowOn(); ctx.fillStyle = color; ctx.fillText(txt, x, y); shadowOff();
  return s;
}

// The app's shield, from the same path Crest.jsx draws (40x46 viewBox).
const SHIELD = new Path2D('M20 2 L37 8 V24 C37 35 29 42 20 45 C11 42 3 35 3 24 V8 Z');
function shield(club, cx, cy, h) {
  const sc = h / 46, w = 40 * sc;
  ctx.save(); ctx.translate(cx - w / 2, cy - h / 2); ctx.scale(sc, sc);
  ctx.fillStyle = club.colors[0]; ctx.fill(SHIELD);
  ctx.save(); ctx.clip(SHIELD);
  ctx.fillStyle = club.colors[1];
  if (club.pattern === 'stripes') [8, 20, 32].forEach(x => ctx.fillRect(x - 3, 0, 6, 46));
  else if (club.pattern === 'sleeve') { ctx.globalAlpha = .9; ctx.fillRect(0, 30, 40, 16); ctx.globalAlpha = 1; }
  else ctx.fillRect(3, 24, 34, 2);
  ctx.restore();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(237,245,239,0.35)'; ctx.stroke(SHIELD);
  // The code is contrasted against the primary colour, but a stripe or sleeve in the
  // secondary can sit directly behind it — Coleraine's white on white. A shadow in the
  // opposite tone keeps it readable whatever it lands on.
  const ink = contrastText(club.colors[0]);
  ctx.font = '800 10px "Barlow Condensed"'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = ink === CHALK ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = 2.5;
  ctx.fillStyle = ink;
  ctx.fillText(club.code, 20, 24);
  ctx.restore();
}

// The Gibson Cup mark. GENERATED — do not hand-edit. This kit is spliced into a page as
// a plain <script>, so it cannot import src/lib/cup.js the way LogoMark and the OG card
// do. It carries a copy instead, and verify.js proves the copy still matches the source.
// To update: change src/lib/cup.js, then run `node scripts/sync-cup.mjs`.
const CUP_D=["M96.9 9.2 A3.1 3.1 0 1 0 103.1 9.2 A3.1 3.1 0 1 0 96.9 9.2 Z","M97.6 12.4 L102.4 12.4 L103 19.8 L97 19.8 Z","M95.8 13.2 L97.6 13.2 L97.6 19.4 L96 19.4 Z","M102.4 13.2 L104.2 13.2 L104 19.4 L102.4 19.4 Z","M97.8 19.8 L99.6 19.8 L99.6 23.4 L97.8 23.4 Z","M95.4 23.4 L99.6 23.4 L99.6 25.2 L95.4 25.2 Z","M93.7 27.4 A2.7 2.7 0 1 0 99.10000000000001 27.4 A2.7 2.7 0 1 0 93.7 27.4 Z","M100.8 19.8 L102.6 19.8 L102.6 27.6 L100.8 27.6 Z","M100.4 27.6 L104.4 27.6 L104.4 29.4 L100.4 29.4 Z","M94.4 29.6 L105.6 29.6 L105.6 32 L94.4 32 Z","M100 33 C88 33 78 40 74.5 46 L125.5 46 C122 40 112 33 100 33 Z","M71.5 46.8 L128.5 46.8 L128.5 51.6 L71.5 51.6 Z","M67 52.8 L133 52.8 L132 61 L68 61 Z","M67.8 62.6 L132.2 62.6 C131 78 127.4 96 121 106.5 C118 111 114 113.8 110 114.8 L90 114.8 C86 113.8 82 111 79 106.5 C72.6 96 69 78 67.8 62.6 Z","M68.6 55.5 C53.9 50.8 40.3 57.1 37.7 70.6 C35.6 83 42.4 94.5 55 100.2 C60.2 102.4 66.5 103.2 72.2 103 L72.6 95.1 C67.5 95.1 62.3 94.1 58.1 92 C48.7 87.2 45.1 78.9 47 70.6 C48.7 63.3 56.5 59.6 68.8 63.7 Z","M131.4 55.5 C146.1 50.8 159.7 57.1 162.3 70.6 C164.4 83 157.6 94.5 145 100.2 C139.8 102.4 133.5 103.2 127.8 103 L127.4 95.1 C132.5 95.1 137.7 94.1 141.9 92 C151.3 87.2 154.9 78.9 153 70.6 C151.3 63.3 143.5 59.6 131.2 63.7 Z","M94.6 115.6 L105.4 115.6 L105.4 119.8 L94.6 119.8 Z","M88 120.4 L112 120.4 L109.4 126.6 L90.6 126.6 Z","M67 127.4 L133 127.4 L133 132.5 L67 132.5 Z","M67.0 132.5 L73.0 132.5 L73.0 135.2 Q73.0 139.6 70.0 139.6 Q67.0 139.6 67.0 135.2 Z","M74.5 132.5 L80.5 132.5 L80.5 135.2 Q80.5 139.6 77.5 139.6 Q74.5 139.6 74.5 135.2 Z","M82.0 132.5 L88.0 132.5 L88.0 135.2 Q88.0 139.6 85.0 139.6 Q82.0 139.6 82.0 135.2 Z","M89.5 132.5 L95.5 132.5 L95.5 135.2 Q95.5 139.6 92.5 139.6 Q89.5 139.6 89.5 135.2 Z","M97.0 132.5 L103.0 132.5 L103.0 135.2 Q103.0 139.6 100.0 139.6 Q97.0 139.6 97.0 135.2 Z","M104.5 132.5 L110.5 132.5 L110.5 135.2 Q110.5 139.6 107.5 139.6 Q104.5 139.6 104.5 135.2 Z","M112.0 132.5 L118.0 132.5 L118.0 135.2 Q118.0 139.6 115.0 139.6 Q112.0 139.6 112.0 135.2 Z","M119.5 132.5 L125.5 132.5 L125.5 135.2 Q125.5 139.6 122.5 139.6 Q119.5 139.6 119.5 135.2 Z","M127.0 132.5 L133.0 132.5 L133.0 135.2 Q133.0 139.6 130.0 139.6 Q127.0 139.6 127.0 135.2 Z","M60 140 L140 140 L140 145.1 L60 145.1 Z","M60.0 145.1 L65.9 145.1 L65.9 147.8 Q65.9 152.2 63.0 152.2 Q60.0 152.2 60.0 147.8 Z","M67.4 145.1 L73.3 145.1 L73.3 147.8 Q73.3 152.2 70.4 152.2 Q67.4 152.2 67.4 147.8 Z","M74.8 145.1 L80.7 145.1 L80.7 147.8 Q80.7 152.2 77.8 152.2 Q74.8 152.2 74.8 147.8 Z","M82.2 145.1 L88.1 145.1 L88.1 147.8 Q88.1 152.2 85.2 152.2 Q82.2 152.2 82.2 147.8 Z","M89.6 145.1 L95.5 145.1 L95.5 147.8 Q95.5 152.2 92.6 152.2 Q89.6 152.2 89.6 147.8 Z","M97.0 145.1 L103.0 145.1 L103.0 147.8 Q103.0 152.2 100.0 152.2 Q97.0 152.2 97.0 147.8 Z","M104.5 145.1 L110.4 145.1 L110.4 147.8 Q110.4 152.2 107.4 152.2 Q104.5 152.2 104.5 147.8 Z","M111.9 145.1 L117.8 145.1 L117.8 147.8 Q117.8 152.2 114.8 152.2 Q111.9 152.2 111.9 147.8 Z","M119.3 145.1 L125.2 145.1 L125.2 147.8 Q125.2 152.2 122.2 152.2 Q119.3 152.2 119.3 147.8 Z","M126.7 145.1 L132.6 145.1 L132.6 147.8 Q132.6 152.2 129.6 152.2 Q126.7 152.2 126.7 147.8 Z","M134.1 145.1 L140.0 145.1 L140.0 147.8 Q140.0 152.2 137.0 152.2 Q134.1 152.2 134.1 147.8 Z","M53 152.6 L147 152.6 L147 157.7 L53 157.7 Z","M53.0 157.7 L58.8 157.7 L58.8 160.4 Q58.8 164.8 55.9 164.8 Q53.0 164.8 53.0 160.4 Z","M60.3 157.7 L66.2 157.7 L66.2 160.4 Q66.2 164.8 63.3 164.8 Q60.3 164.8 60.3 160.4 Z","M67.7 157.7 L73.5 157.7 L73.5 160.4 Q73.5 164.8 70.6 164.8 Q67.7 164.8 67.7 160.4 Z","M75.0 157.7 L80.9 157.7 L80.9 160.4 Q80.9 164.8 78.0 164.8 Q75.0 164.8 75.0 160.4 Z","M82.4 157.7 L88.2 157.7 L88.2 160.4 Q88.2 164.8 85.3 164.8 Q82.4 164.8 82.4 160.4 Z","M89.7 157.7 L95.6 157.7 L95.6 160.4 Q95.6 164.8 92.7 164.8 Q89.7 164.8 89.7 160.4 Z","M97.1 157.7 L102.9 157.7 L102.9 160.4 Q102.9 164.8 100.0 164.8 Q97.1 164.8 97.1 160.4 Z","M104.4 157.7 L110.3 157.7 L110.3 160.4 Q110.3 164.8 107.3 164.8 Q104.4 164.8 104.4 160.4 Z","M111.8 157.7 L117.6 157.7 L117.6 160.4 Q117.6 164.8 114.7 164.8 Q111.8 164.8 111.8 160.4 Z","M119.1 157.7 L125.0 157.7 L125.0 160.4 Q125.0 164.8 122.0 164.8 Q119.1 164.8 119.1 160.4 Z","M126.5 157.7 L132.3 157.7 L132.3 160.4 Q132.3 164.8 129.4 164.8 Q126.5 164.8 126.5 160.4 Z","M133.8 157.7 L139.7 157.7 L139.7 160.4 Q139.7 164.8 136.7 164.8 Q133.8 164.8 133.8 160.4 Z","M141.2 157.7 L147.0 157.7 L147.0 160.4 Q147.0 164.8 144.1 164.8 Q141.2 164.8 141.2 160.4 Z","M48 166 L152 166 L152 174.4 L48 174.4 Z","M43 175.4 L157 175.4 L157 192 L43 192 Z"];
const CUP = CUP_D.map(d => new Path2D(d));
function cup(cx, cy, size) {
  const sc = size / 200;
  ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(sc, sc);
  const g = ctx.createLinearGradient(0, 0, 200, 200); g.addColorStop(0, GOLD_HI); g.addColorStop(1, '#FFA51F');
  ctx.fillStyle = g;
  CUP.forEach(p => ctx.fill(p));
  ctx.restore();
}

function grain(fr, amt) {
  const r = rng(fr + 7); ctx.fillStyle = 'rgba(255,255,255,' + amt + ')';
  for (let i = 0; i < 700; i++) ctx.fillRect(r() * W | 0, r() * H | 0, 2, 2);
}
function vignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// Diagonal colour sweep, knocked back so type over it always clears contrast.
function sweep(p, c1, c2) {
  const x = (-W * 0.6) + p * (W * 2.2);
  ctx.save(); ctx.globalAlpha = .9;
  ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + W * 0.42, 0); ctx.lineTo(x + W * 0.62, 0); ctx.lineTo(x + W * 0.2, H); ctx.closePath();
  ctx.fillStyle = c1; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + W * 0.2, H); ctx.lineTo(x + W * 0.62, 0); ctx.lineTo(x + W * 0.70, 0); ctx.lineTo(x + W * 0.28, H); ctx.closePath();
  ctx.fillStyle = c2; ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(11,21,18,0.46)'; ctx.fillRect(0, 0, W, H);
}

// Rounded panel matching the app's card surface.
function panel(x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill || 'rgba(240,255,245,0.04)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(237,245,239,0.10)'; ctx.stroke();
}
// Left-aligned label/value row used inside the mock UI panels.
function rowText(txt, x, y, size, color, weight, align) {
  ctx.font = (weight || 600) + ' ' + size + 'px "Barlow Condensed"';
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.fillText(txt, x, y);
}
