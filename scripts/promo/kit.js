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
const CUP_D=["M95.8 9.5 A4.2 4.2 0 1 0 104.2 9.5 A4.2 4.2 0 1 0 95.8 9.5 Z","M96 15 L104 15 L104.8 28 L95.2 28 Z","M93.4 16 L96 16 L96 27 L93.8 27 Z","M104 16 L106.6 16 L106.6 27 L104.2 27 Z","M95.8 28 L99.2 28 L99.2 34.5 L95.8 34.5 Z","M91.5 34.5 L99.2 34.5 L99.2 37.6 L91.5 37.6 Z","M88 41.6 A5 5 0 1 0 98 41.6 A5 5 0 1 0 88 41.6 Z","M100.8 28 L104.2 28 L104.2 42.5 L100.8 42.5 Z","M100 42.5 L107 42.5 L107 45.6 L100 45.6 Z","M89.8 45.8 L110.2 45.8 L110.2 49.4 L89.8 49.4 Z","M100 50.2 C89 50.2 79.5 56.8 76 64.8 L124 64.8 C120.5 56.8 111 50.2 100 50.2 Z","M73 65.8 L127 65.8 L127 70.8 L73 70.8 Z","M68.5 72 L131.5 72 L130.6 80.4 L69.4 80.4 Z","M69.2 82 L130.8 82 C129.6 97 126 113 119.4 123 C116.4 127.4 112.6 130 108.6 131 L91.4 131 C87.4 130 83.6 127.4 80.6 123 C74 113 70.4 97 69.2 82 Z","M70 74.5 C56 70 43 76 40.5 89 C38.5 101 45 112 57 117.5 C62 119.6 68 120.4 73.5 120.2 L73.8 112.6 C69 112.6 64 111.6 60 109.6 C51 105 47.6 97 49.4 89 C51 82 58.5 78.4 70.2 82.4 Z","M130 74.5 C144 70 157 76 159.5 89 C161.5 101 155 112 143 117.5 C138 119.6 132 120.4 126.5 120.2 L126.2 112.6 C131 112.6 136 111.6 140 109.6 C149 105 152.4 97 150.6 89 C149 82 141.5 78.4 129.8 82.4 Z","M93.4 131.6 L106.6 131.6 L106.6 137 L93.4 137 Z","M86 138.2 L114 138.2 L110.6 146 L89.4 146 Z","M62 147.6 L138 147.6 L138 152.0 L62 152.0 Z","M62.0 152.0 L67.5 152.0 L67.5 154.3 Q67.5 158.0 64.8 158.0 Q62.0 158.0 62.0 154.3 Z","M69.0 152.0 L74.6 152.0 L74.6 154.3 Q74.6 158.0 71.8 158.0 Q69.0 158.0 69.0 154.3 Z","M76.1 152.0 L81.6 152.0 L81.6 154.3 Q81.6 158.0 78.9 158.0 Q76.1 158.0 76.1 154.3 Z","M83.1 152.0 L88.7 152.0 L88.7 154.3 Q88.7 158.0 85.9 158.0 Q83.1 158.0 83.1 154.3 Z","M90.2 152.0 L95.7 152.0 L95.7 154.3 Q95.7 158.0 93.0 158.0 Q90.2 158.0 90.2 154.3 Z","M97.2 152.0 L102.8 152.0 L102.8 154.3 Q102.8 158.0 100.0 158.0 Q97.2 158.0 97.2 154.3 Z","M104.3 152.0 L109.8 152.0 L109.8 154.3 Q109.8 158.0 107.0 158.0 Q104.3 158.0 104.3 154.3 Z","M111.3 152.0 L116.9 152.0 L116.9 154.3 Q116.9 158.0 114.1 158.0 Q111.3 158.0 111.3 154.3 Z","M118.4 152.0 L123.9 152.0 L123.9 154.3 Q123.9 158.0 121.1 158.0 Q118.4 158.0 118.4 154.3 Z","M125.4 152.0 L131.0 152.0 L131.0 154.3 Q131.0 158.0 128.2 158.0 Q125.4 158.0 125.4 154.3 Z","M132.5 152.0 L138.0 152.0 L138.0 154.3 Q138.0 158.0 135.2 158.0 Q132.5 158.0 132.5 154.3 Z","M54 158.8 L146 158.8 L146 163.2 L54 163.2 Z","M54.0 163.2 L59.7 163.2 L59.7 165.5 Q59.7 169.2 56.8 169.2 Q54.0 169.2 54.0 165.5 Z","M61.2 163.2 L66.9 163.2 L66.9 165.5 Q66.9 169.2 64.0 169.2 Q61.2 169.2 61.2 165.5 Z","M68.4 163.2 L74.1 163.2 L74.1 165.5 Q74.1 169.2 71.2 169.2 Q68.4 169.2 68.4 165.5 Z","M75.6 163.2 L81.3 163.2 L81.3 165.5 Q81.3 169.2 78.4 169.2 Q75.6 169.2 75.6 165.5 Z","M82.8 163.2 L88.5 163.2 L88.5 165.5 Q88.5 169.2 85.6 169.2 Q82.8 169.2 82.8 165.5 Z","M90.0 163.2 L95.7 163.2 L95.7 165.5 Q95.7 169.2 92.8 169.2 Q90.0 169.2 90.0 165.5 Z","M97.2 163.2 L102.8 163.2 L102.8 165.5 Q102.8 169.2 100.0 169.2 Q97.2 169.2 97.2 165.5 Z","M104.3 163.2 L110.0 163.2 L110.0 165.5 Q110.0 169.2 107.2 169.2 Q104.3 169.2 104.3 165.5 Z","M111.5 163.2 L117.2 163.2 L117.2 165.5 Q117.2 169.2 114.4 169.2 Q111.5 169.2 111.5 165.5 Z","M118.7 163.2 L124.4 163.2 L124.4 165.5 Q124.4 169.2 121.6 169.2 Q118.7 169.2 118.7 165.5 Z","M125.9 163.2 L131.6 163.2 L131.6 165.5 Q131.6 169.2 128.8 169.2 Q125.9 169.2 125.9 165.5 Z","M133.1 163.2 L138.8 163.2 L138.8 165.5 Q138.8 169.2 136.0 169.2 Q133.1 169.2 133.1 165.5 Z","M140.3 163.2 L146.0 163.2 L146.0 165.5 Q146.0 169.2 143.2 169.2 Q140.3 169.2 140.3 165.5 Z","M44 170.4 L156 170.4 L156 179 L44 179 Z","M39 180.4 L161 180.4 L161 192 L39 192 Z"];
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
