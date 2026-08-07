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

// The Gibson Cup mark, same geometry as LogoMark.jsx (200x200 viewBox).
const CUP = ['M54 38 L146 38 L138 76 C133 101 118 114 100 114 C82 114 67 101 62 76 Z',
  'M56 46 C30 46 26 78 49 88 L54 78 C40 71 44 55 56 55 Z',
  'M144 46 C170 46 174 78 151 88 L146 78 C160 71 156 55 144 55 Z'].map(d => new Path2D(d));
function cup(cx, cy, size) {
  const sc = size / 200;
  ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(sc, sc);
  const g = ctx.createLinearGradient(0, 0, 200, 200); g.addColorStop(0, GOLD_HI); g.addColorStop(1, '#FFA51F');
  ctx.fillStyle = g;
  CUP.forEach(p => ctx.fill(p));
  ctx.fillRect(92, 114, 16, 15); ctx.fillRect(70, 132, 60, 10); ctx.fillRect(57, 145, 86, 10); ctx.fillRect(43, 158, 114, 10);
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
