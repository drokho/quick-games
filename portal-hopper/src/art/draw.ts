// Code-drawn art (Canvas 2D), ported from the prototype. Every piece can be swapped for a PNG
// through src/art/sprites.ts without touching the game code.
import { GY, type Decor, type ItemKind, type Portal, type Slide, type WorldId } from '../game/worlds';
import type { Look } from '../game/save';
import { drawSprite } from './sprites';

export const TAU = Math.PI * 2;
export const FONT = "Fredoka, ui-rounded, 'Segoe UI Rounded', system-ui, sans-serif";

/** Visible area in world units (set by the scene on resize). */
export const view = { w: 960, h: 540, offY: 0 };

type C = CanvasRenderingContext2D;

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const mod = (a: number, m: number) => ((a % m) + m) % m;
export const hash = (i: number) => { const s = Math.sin(i * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); };
export function rr(c: C, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
export function circ(c: C, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function hexRgb(h: string) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
export function hexA(h: string, a: number) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
export function shade(h: string, amt: number) {
  const [r, g, b] = hexRgb(h);
  const f = (v: number) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function seeded(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const R = seeded(424242);
const STARS = Array.from({ length: 150 }, () => ({ x: R() * 2000, y: R() * 720, s: R() * 1.7 + .4, p: R() * 6 }));
const FLAKES = Array.from({ length: 80 }, () => ({ x: R(), y: R(), s: R() * 2.4 + 1, sp: 30 + R() * 50, p: R() * 6 }));

// ---------- character ----------
export function drawPlayer(c: C, x: number, y: number, lk: Look, t: number, face: number, sq: number, run: boolean) {
  const w = 36, h = 46;
  c.save(); c.translate(x, y); c.scale(1 + sq * 0.55, 1 - sq * 0.55);
  if (!drawSprite(c, 'player-body', 0, 0)) {
    const step = run ? Math.sin(t * 18) * 3 : 0;
    c.fillStyle = shade(lk.color, -0.4);
    c.beginPath(); c.ellipse(-8, -3 + Math.max(0, step), 8, 5, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(8, -3 + Math.max(0, -step), 8, 5, 0, 0, TAU); c.fill();
    c.fillStyle = lk.color; rr(c, -w / 2, -h, w, h - 3, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; rr(c, -w / 2 + 5, -h + 6, 9, h - 22, 5); c.fill();
    c.fillStyle = 'rgba(0,0,0,.12)'; rr(c, -w / 2, -14, w, 11, 8); c.fill();
    const ex = face * 4, blink = mod(t, 3.4) < 0.12 ? 0.15 : 1;
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(-7 + ex, -h + 18, 6, 6.5 * blink, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(7 + ex, -h + 18, 6, 6.5 * blink, 0, 0, TAU); c.fill();
    c.fillStyle = '#1d1430';
    c.beginPath(); c.ellipse(-7 + ex + face * 2, -h + 18, 3, 3.4 * blink, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(7 + ex + face * 2, -h + 18, 3, 3.4 * blink, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,120,150,.45)';
    circ(c, -12 + ex, -h + 27, 3.5); c.fill(); circ(c, 12 + ex, -h + 27, 3.5); c.fill();
    c.strokeStyle = '#1d1430'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.arc(ex, -h + 25, 4, 0.2, Math.PI - 0.2); c.stroke();
  }
  if (lk.hat !== 'none' && !drawSprite(c, 'hat-' + lk.hat, 0, -h + 4)) drawHat(c, lk.hat, -h, t, lk.color);
  c.restore();
}

function drawHat(c: C, hat: string, top: number, t: number, col: string) {
  c.save();
  if (hat === 'witch') {
    c.fillStyle = '#2b1846';
    c.beginPath(); c.ellipse(0, top + 3, 27, 6, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-15, top + 2); c.lineTo(15, top + 2); c.quadraticCurveTo(8, top - 20, 18, top - 38); c.quadraticCurveTo(-2, top - 24, -15, top + 2); c.fill();
    c.fillStyle = '#ff8a1f'; c.fillRect(-14, top - 5, 28, 5);
  } else if (hat === 'pumpkin') {
    c.fillStyle = '#ff7a1a';
    c.beginPath(); c.ellipse(-6, top - 6, 10, 11, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(6, top - 6, 10, 11, 0, 0, TAU); c.fill();
    c.fillStyle = '#ff9a3d'; c.beginPath(); c.ellipse(0, top - 6, 9, 12, 0, 0, TAU); c.fill();
    c.fillStyle = '#3f7a2a'; c.fillRect(-2, top - 22, 4, 7);
    c.fillStyle = '#2a1200';
    c.beginPath(); c.moveTo(-7, top - 8); c.lineTo(-3, top - 8); c.lineTo(-5, top - 12); c.fill();
    c.beginPath(); c.moveTo(3, top - 8); c.lineTo(7, top - 8); c.lineTo(5, top - 12); c.fill();
  } else if (hat === 'crown') {
    c.fillStyle = '#ffd23d'; c.strokeStyle = '#d69a00'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-14, top + 3); c.lineTo(-14, top - 12); c.lineTo(-7, top - 4); c.lineTo(0, top - 16); c.lineTo(7, top - 4); c.lineTo(14, top - 12); c.lineTo(14, top + 3); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ff3d6e'; circ(c, 0, top - 3, 2.6); c.fill();
    c.fillStyle = '#3dd6ff'; circ(c, -8, top - 1, 2); c.fill(); circ(c, 8, top - 1, 2); c.fill();
  } else if (hat === 'cat') {
    for (const s of [-1, 1]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(s * 16, top + 8); c.lineTo(s * 4, top + 2); c.lineTo(s * 15, top - 12); c.closePath(); c.fill();
      c.fillStyle = '#ffb3c8'; c.beginPath(); c.moveTo(s * 13, top + 5); c.lineTo(s * 7, top + 3); c.lineTo(s * 13, top - 5); c.closePath(); c.fill();
    }
  } else if (hat === 'prop') {
    c.fillStyle = '#2b7bff'; c.beginPath(); c.arc(0, top + 4, 15, Math.PI, 0); c.fill();
    c.fillStyle = '#ff3d6e'; c.beginPath(); c.arc(0, top + 4, 15, Math.PI, Math.PI * 1.33); c.lineTo(0, top + 4); c.fill();
    c.fillStyle = '#ffd23d'; c.beginPath(); c.arc(0, top + 4, 15, Math.PI * 1.66, 0); c.lineTo(0, top + 4); c.fill();
    c.fillStyle = '#555'; c.fillRect(-1.5, top - 16, 3, 8);
    const pw = 22 * Math.cos(t * 22);
    c.fillStyle = '#ff3d6e'; c.beginPath(); c.ellipse(0, top - 16, Math.abs(pw), 3, 0, 0, TAU); c.fill();
  } else if (hat === 'astro') {
    c.fillStyle = 'rgba(180,230,255,.22)'; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3;
    circ(c, 0, top + 18, 30); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(0, top + 18, 24, -2.6, -1.9); c.stroke();
    c.strokeStyle = '#ccc'; c.lineWidth = 2; c.beginPath(); c.moveTo(14, top - 6); c.lineTo(20, top - 20); c.stroke();
    c.fillStyle = mod(t, 1) < .5 ? '#ff3d3d' : '#ff9a9a'; circ(c, 20, top - 21, 3.5); c.fill();
  }
  c.restore();
}

// ---------- backgrounds ----------
function hills(c: C, off: number, base: number, col: string, amp: number, fr: number, ph: number) {
  c.fillStyle = col; c.beginPath(); c.moveTo(-10, base + 600);
  for (let x = -10; x <= view.w + 20; x += 16) { const wx = x + off; c.lineTo(x, base - amp * (0.55 + 0.35 * Math.sin(wx * fr + ph) + 0.2 * Math.sin(wx * fr * 2.7 + ph * 2))); }
  c.lineTo(view.w + 20, base + 600); c.closePath(); c.fill();
}
function mountains(c: C, off: number, base: number, col: string, cap: string, h: number, sp: number) {
  const start = -mod(off, sp) - sp;
  for (let x = start; x < view.w + sp; x += sp) {
    const i = Math.round((x + off) / sp), hh = h * (0.6 + 0.4 * hash(i)), px = x + sp / 2;
    c.fillStyle = col; c.beginPath(); c.moveTo(x - sp * 0.2, base); c.lineTo(px, base - hh); c.lineTo(x + sp * 1.2, base); c.closePath(); c.fill();
    c.fillStyle = cap; c.beginPath(); c.moveTo(px, base - hh); c.lineTo(px - hh * 0.28, base - hh * 0.72); c.lineTo(px - hh * 0.1, base - hh * 0.78); c.lineTo(px + hh * 0.05, base - hh * 0.7); c.lineTo(px + hh * 0.32, base - hh * 0.72); c.closePath(); c.fill();
  }
}
function starsDraw(c: C, cx: number, t: number, maxY: number, par: number) {
  for (const s of STARS) {
    const x = mod(s.x - cx * par, 2000) - 20, y = s.y - 60;
    if (y > maxY || x > view.w + 20) continue;
    c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + s.p)); c.fillStyle = '#fff'; circ(c, x, y, s.s); c.fill();
  }
  c.globalAlpha = 1;
}
function cloud(c: C, x: number, y: number, s: number) {
  c.fillStyle = 'rgba(255,255,255,.9)';
  circ(c, x, y, 22 * s); c.fill(); circ(c, x + 24 * s, y - 10 * s, 28 * s); c.fill(); circ(c, x + 52 * s, y, 22 * s); c.fill();
  rr(c, x - 6 * s, y, 64 * s, 20 * s, 10 * s); c.fill();
}
function castle(c: C, x: number, base: number) {
  c.fillStyle = '#220d31'; c.fillRect(x, base - 110, 170, 110);
  c.fillRect(x - 24, base - 170, 44, 170); c.beginPath(); c.moveTo(x - 32, base - 170); c.lineTo(x - 2, base - 230); c.lineTo(x + 28, base - 170); c.fill();
  c.fillRect(x + 150, base - 195, 40, 195); c.beginPath(); c.moveTo(x + 142, base - 195); c.lineTo(x + 170, base - 255); c.lineTo(x + 198, base - 195); c.fill();
  for (let i = 0; i < 5; i++) c.fillRect(x + 10 + i * 32, base - 124, 18, 14);
  c.fillStyle = 'rgba(255,200,90,.85)'; c.fillRect(x - 8, base - 140, 10, 14); c.fillRect(x + 164, base - 160, 10, 14); c.fillRect(x + 60, base - 70, 12, 16);
}

export const BG: Record<WorldId, (c: C, cx: number, t: number, oy: number) => void> = {
  hub(c, cx, t, oy) {
    const hz = GY + oy, g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#5fb8ff'); g.addColorStop(1, '#d6f1ff'); c.fillStyle = g; c.fillRect(0, 0, view.w, view.h);
    const sx = view.w * 0.8 - cx * 0.02, sy = 90 + oy * 0.3, sg = c.createRadialGradient(sx, sy, 10, sx, sy, 120);
    sg.addColorStop(0, 'rgba(255,245,170,.9)'); sg.addColorStop(1, 'rgba(255,245,170,0)'); c.fillStyle = sg; circ(c, sx, sy, 120); c.fill();
    c.fillStyle = '#fff3a0'; circ(c, sx, sy, 42); c.fill();
    for (let i = 0; i < 7; i++) { const x = mod(i * 380 - cx * 0.15 + t * 10, 2660) - 220; cloud(c, x, 70 + (i % 3) * 45 + oy * 0.5, 0.8 + (i % 2) * 0.4); }
    hills(c, cx * 0.3, hz - 30, '#a9e0a0', 120, 0.004, 0);
    hills(c, cx * 0.55, hz, '#7fcf78', 80, 0.007, 2);
  },
  halloween(c, cx, t, oy) {
    const hz = GY + oy, g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#0c0520'); g.addColorStop(0.62, '#3a1352'); g.addColorStop(1, '#c4471f'); c.fillStyle = g; c.fillRect(0, 0, view.w, view.h);
    starsDraw(c, cx, t, hz - 160, 0.04);
    const mx = view.w * 0.72 - cx * 0.03, my = 110 + oy * 0.4, mg = c.createRadialGradient(mx, my, 40, mx, my, 160);
    mg.addColorStop(0, 'rgba(255,240,200,.35)'); mg.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = mg; circ(c, mx, my, 160); c.fill();
    c.fillStyle = '#fff2c9'; circ(c, mx, my, 56); c.fill();
    c.fillStyle = 'rgba(205,180,130,.35)'; circ(c, mx - 18, my - 12, 11); c.fill(); circ(c, mx + 16, my + 14, 8); c.fill(); circ(c, mx + 6, my - 24, 5); c.fill();
    hills(c, cx * 0.22, hz - 50, '#2a1038', 90, 0.003, 1.3);
    for (let i = 0; i < 3; i++) { const x = mod(i * 700 - cx * 0.32, 2100) - 300; castle(c, x, hz - 40 + 8 * Math.sin(i)); }
    hills(c, cx * 0.45, hz, '#1b0b27', 60, 0.006, 0.7);
  },
  space(c, cx, t, oy) {
    const hz = GY + oy, g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#04020d'); g.addColorStop(1, '#231a55'); c.fillStyle = g; c.fillRect(0, 0, view.w, view.h);
    for (const [nx, ny, nr, col] of [[0.3, 150, 260, 'rgba(140,60,255,.22)'], [0.65, 260, 220, 'rgba(255,70,170,.14)']] as [number, number, number, string][]) {
      const x = view.w * nx - cx * 0.04, y = ny + oy * 0.5, ng = c.createRadialGradient(x, y, 0, x, y, nr);
      ng.addColorStop(0, col); ng.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = ng; circ(c, x, y, nr); c.fill();
    }
    starsDraw(c, cx, t, hz - 20, 0.05);
    const ph = mod(t, 7);
    if (ph < 0.8) {
      const k = ph / 0.8, x = view.w * (0.15 + k * 0.5), y = 60 + k * 120 + oy * 0.3;
      const lg = c.createLinearGradient(x - 90, y - 35, x, y); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(255,255,255,.9)');
      c.strokeStyle = lg; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 90, y - 35); c.lineTo(x, y); c.stroke();
    }
    const px = view.w * 0.78 - cx * 0.06, py = 130 + oy * 0.5, pg = c.createLinearGradient(px - 70, py - 70, px + 70, py + 70);
    pg.addColorStop(0, '#7fe0ff'); pg.addColorStop(1, '#2b3fd1');
    c.strokeStyle = 'rgba(255,220,160,.35)'; c.lineWidth = 7; c.beginPath(); c.ellipse(px, py, 118, 24, -0.3, Math.PI, TAU); c.stroke();
    c.fillStyle = pg; circ(c, px, py, 68); c.fill();
    c.strokeStyle = 'rgba(255,220,160,.75)'; c.lineWidth = 7; c.beginPath(); c.ellipse(px, py, 118, 24, -0.3, 0, Math.PI); c.stroke();
    hills(c, cx * 0.4, hz, '#3b3654', 70, 0.005, 1);
  },
  ice(c, cx, _t, oy) {
    const hz = GY + oy, g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#6fbff2'); g.addColorStop(1, '#e8f8ff'); c.fillStyle = g; c.fillRect(0, 0, view.w, view.h);
    c.fillStyle = 'rgba(255,255,255,.75)'; circ(c, view.w * 0.2 - cx * 0.02, 90 + oy * 0.3, 38); c.fill();
    mountains(c, cx * 0.2, hz - 10, '#a8d4f0', '#ffffff', 260, 300);
    mountains(c, cx * 0.45, hz + 10, '#c9e6f8', '#ffffff', 170, 220);
  },
};

export const FG: Partial<Record<WorldId, (c: C, cx: number, t: number, oy: number) => void>> = {
  halloween(c, cx, t, oy) {
    const hz = GY + oy;
    for (let i = 0; i < 4; i++) {
      const x = mod(i * 520 + t * 18 - cx * 0.9, view.w + 900) - 450;
      c.fillStyle = 'rgba(210,190,255,.07)'; c.beginPath(); c.ellipse(x, hz - 8 + i * 6, 420, 26, 0, 0, TAU); c.fill();
    }
  },
  ice(c, cx, t) {
    c.fillStyle = 'rgba(255,255,255,.9)';
    for (const f of FLAKES) {
      const x = mod(f.x * 1600 - cx * 0.8 + Math.sin(t * 0.8 + f.p) * 30, view.w + 40) - 20, y = mod(f.y * 900 + t * f.sp, view.h + 20) - 10;
      circ(c, x, y, f.s); c.fill();
    }
  },
};

// ---------- world pieces ----------
function drawPumpkin(c: C, x: number, y: number, t: number) {
  c.save(); c.translate(x, y);
  const fl = 0.75 + 0.25 * Math.sin(t * 9 + x) * Math.sin(t * 5.3 + x * 0.1);
  const g = c.createRadialGradient(0, -18, 4, 0, -18, 64); g.addColorStop(0, `rgba(255,160,40,${0.4 * fl})`); g.addColorStop(1, 'rgba(255,160,40,0)'); c.fillStyle = g; circ(c, 0, -18, 64); c.fill();
  c.fillStyle = '#e8650f'; c.beginPath(); c.ellipse(-11, -18, 14, 18, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(11, -18, 14, 18, 0, 0, TAU); c.fill();
  c.fillStyle = '#ff7a1a'; c.beginPath(); c.ellipse(0, -18, 13, 19, 0, 0, TAU); c.fill();
  c.fillStyle = '#3f7a2a'; c.fillRect(-2, -42, 5, 9);
  c.fillStyle = `rgb(255,${190 + Math.round(50 * fl)},90)`;
  c.beginPath(); c.moveTo(-14, -22); c.lineTo(-5, -22); c.lineTo(-9.5, -31); c.fill();
  c.beginPath(); c.moveTo(5, -22); c.lineTo(14, -22); c.lineTo(9.5, -31); c.fill();
  c.beginPath(); c.moveTo(-14, -14); c.lineTo(-9, -10); c.lineTo(-5, -13); c.lineTo(0, -8); c.lineTo(5, -13); c.lineTo(9, -10); c.lineTo(14, -14); c.lineTo(9, -4); c.lineTo(-9, -4); c.closePath(); c.fill();
  c.restore();
}

export function drawDecor(c: C, d: Decor, t: number) {
  const x = d.x, y = GY;
  if (drawSprite(c, 'decor-' + d.t, x, y)) return;
  switch (d.t) {
    case 'tree':
      c.fillStyle = '#8a5a3b'; c.fillRect(x - 8, y - 72, 16, 72); c.fillStyle = '#4fbf5a'; circ(c, x, y - 96, 40); c.fill();
      c.fillStyle = '#5fd16a'; circ(c, x - 28, y - 74, 28); c.fill(); circ(c, x + 28, y - 76, 28); c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)'; circ(c, x - 12, y - 112, 14); c.fill(); break;
    case 'flower': {
      c.strokeStyle = '#3c9c48'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 26); c.stroke();
      c.fillStyle = ['#ff5d8f', '#ffb020', '#9b5cff'][Math.floor(hash(x) * 3)];
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t; circ(c, x + Math.cos(a) * 7, y - 28 + Math.sin(a) * 7, 5); c.fill(); }
      c.fillStyle = '#ffe14d'; circ(c, x, y - 28, 4.5); c.fill(); break;
    }
    case 'sign':
      c.fillStyle = '#7a4a2a'; c.fillRect(x - 60, y - 80, 8, 80); c.fillRect(x + 52, y - 80, 8, 80);
      c.fillStyle = '#c98b55'; rr(c, x - 84, y - 128, 168, 58, 10); c.fill(); c.strokeStyle = '#8a5a3b'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#4a2a14'; c.textAlign = 'center'; c.font = `700 18px ${FONT}`; c.fillText('Portal Plaza', x, y - 102);
      c.font = `500 14px ${FONT}`; c.fillText('slide & portals ahead →', x, y - 82); break;
    case 'deadtree':
      c.strokeStyle = '#14091d'; c.lineCap = 'round'; c.lineWidth = 12; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 4, y - 112); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.moveTo(x + 2, y - 70); c.lineTo(x - 34, y - 102); c.moveTo(x + 3, y - 90); c.lineTo(x + 38, y - 130); c.moveTo(x + 4, y - 110); c.lineTo(x - 10, y - 146); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.moveTo(x - 22, y - 92); c.lineTo(x - 26, y - 118); c.moveTo(x + 24, y - 112); c.lineTo(x + 46, y - 114); c.stroke(); break;
    case 'grave':
      c.fillStyle = '#6d6680'; c.beginPath(); c.moveTo(x - 18, y); c.lineTo(x - 18, y - 34); c.arc(x, y - 34, 18, Math.PI, 0); c.lineTo(x + 18, y); c.fill();
      c.fillStyle = '#3e3850'; c.textAlign = 'center'; c.font = `700 11px ${FONT}`; c.fillText('RIP', x, y - 30); break;
    case 'pumpkin': drawPumpkin(c, x, y, t); break;
    case 'house': {
      c.save(); c.translate(x, y); c.fillStyle = '#1c1029'; c.fillRect(-130, -200, 260, 200);
      c.beginPath(); c.moveTo(-152, -198); c.lineTo(0, -300); c.lineTo(152, -198); c.fill();
      c.fillRect(70, -290, 60, 90); c.beginPath(); c.moveTo(60, -288); c.lineTo(100, -372); c.lineTo(140, -288); c.fill();
      const f = 0.65 + 0.35 * Math.abs(Math.sin(t * 2.3)); c.fillStyle = `rgba(255,200,80,${f})`;
      const wins = [[-100, -170, 40, 46], [60, -170, 40, 46], [-20, -252, 40, 36], [86, -272, 28, 30]];
      for (const [wx, wy, ww, wh] of wins) c.fillRect(wx, wy, ww, wh);
      c.strokeStyle = '#1c1029'; c.lineWidth = 3;
      for (const [wx, wy, ww, wh] of wins) { c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke(); }
      c.fillStyle = '#3a1f12'; rr(c, -26, -92, 52, 92, 22); c.fill(); c.fillStyle = '#ffd23d'; circ(c, 14, -44, 3); c.fill();
      c.restore(); break;
    }
    case 'crater':
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, y + 7, 52, 9, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(x, y + 4, 52, 4, 0, Math.PI, TAU); c.fill(); break;
    case 'rock':
      c.fillStyle = '#5f5b75'; c.beginPath(); c.ellipse(x, y - 12, 30, 18, 0, Math.PI, TAU); c.fill();
      c.fillStyle = '#78738f'; c.beginPath(); c.ellipse(x - 6, y - 16, 12, 7, 0, 0, TAU); c.fill(); break;
    case 'flag': {
      c.fillStyle = '#ccc'; c.fillRect(x, y - 110, 4, 110); const w = Math.sin(t * 3) * 5;
      c.fillStyle = '#ff3d6e'; c.beginPath(); c.moveTo(x + 4, y - 108); c.quadraticCurveTo(x + 28, y - 112 + w, x + 52, y - 106); c.lineTo(x + 52, y - 80); c.quadraticCurveTo(x + 28, y - 86 - w, x + 4, y - 82); c.fill();
      c.fillStyle = '#fff'; c.font = `700 14px ${FONT}`; c.textAlign = 'center'; c.fillText('★', x + 28, y - 89); break;
    }
    case 'pine':
      c.fillStyle = '#7a5236'; c.fillRect(x - 6, y - 24, 12, 24);
      for (let i = 0; i < 3; i++) {
        const yy = y - 20 - i * 30, ww = 46 - i * 11;
        c.fillStyle = '#2f7d6d'; c.beginPath(); c.moveTo(x - ww, yy); c.lineTo(x, yy - 46); c.lineTo(x + ww, yy); c.closePath(); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - ww * 0.45, yy - 25); c.lineTo(x, yy - 46); c.lineTo(x + ww * 0.45, yy - 25); c.quadraticCurveTo(x, yy - 20, x - ww * 0.45, yy - 25); c.fill();
      }
      break;
    case 'snowman':
      c.fillStyle = '#fff'; c.strokeStyle = '#b9dcf2'; c.lineWidth = 2;
      circ(c, x, y - 24, 26); c.fill(); c.stroke(); circ(c, x, y - 64, 19); c.fill(); c.stroke(); circ(c, x, y - 94, 14); c.fill(); c.stroke();
      c.fillStyle = '#222'; circ(c, x - 5, y - 97, 2.2); c.fill(); circ(c, x + 5, y - 97, 2.2); c.fill(); circ(c, x, y - 68, 2.5); c.fill(); circ(c, x, y - 58, 2.5); c.fill();
      c.fillStyle = '#ff8a1f'; c.beginPath(); c.moveTo(x, y - 93); c.lineTo(x + 16, y - 90); c.lineTo(x, y - 89); c.fill();
      c.fillStyle = '#222'; c.fillRect(x - 14, y - 108, 28, 4); c.fillRect(x - 9, y - 124, 18, 17); c.fillStyle = '#ff3d6e'; c.fillRect(x - 9, y - 111, 18, 3); break;
  }
}

export function drawSlide(c: C, s: Slide) {
  const th = 18, bot = (x: number) => s.y1 + s.k * (x - s.x1);
  const sup = { rainbow: '#8a5a3b', bone: '#3a2b4a', neon: '#36406a', ice: '#9fd2f0' }[s.style];
  c.strokeStyle = sup; c.lineWidth = 7; c.lineCap = 'round';
  for (let x = s.x1 + 50; x < s.x2 - 40; x += 110) { c.beginPath(); c.moveTo(x, bot(x) + th - 2); c.lineTo(x, GY); c.stroke(); }
  const band = (o1: number, o2: number, col: string) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(s.x1, s.y1 + o1); c.lineTo(s.x2, s.y2 + o1); c.lineTo(s.x2, s.y2 + o2); c.lineTo(s.x1, s.y1 + o2); c.closePath(); c.fill();
  };
  if (s.style === 'rainbow') { ['#ff4d6d', '#ffb020', '#ffe14d', '#3ddc84', '#3d9bff', '#9b5cff'].forEach((col, i) => band(i * th / 6, (i + 1) * th / 6 + 0.5, col)); }
  else if (s.style === 'bone') { band(0, th, '#efe6d2'); band(th * 0.7, th, '#c7b996'); c.fillStyle = '#ff7a1a'; for (let x = s.x1 + 30; x < s.x2; x += 60) { circ(c, x, bot(x) + th * 0.45, 3); c.fill(); } }
  else if (s.style === 'neon') { c.save(); c.shadowColor = '#3df2ff'; c.shadowBlur = 18; band(0, th, '#18264a'); c.restore(); band(0, 3, '#3df2ff'); band(th - 3, th, '#ff4fd8'); }
  else if (s.style === 'ice') {
    band(0, th, 'rgba(180,230,255,.92)'); band(0, 4, '#ffffff'); c.fillStyle = 'rgba(255,255,255,.6)';
    for (let x = s.x1 + 20; x < s.x2; x += 70) { c.beginPath(); c.moveTo(x, bot(x) + th); c.lineTo(x + 6, bot(x) + th + 14); c.lineTo(x + 12, bot(x) + th); c.fill(); }
  }
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(s.x1, s.y1 + 1); c.lineTo(s.x2, s.y2 + 1); c.stroke();
}

export function drawItem(c: C, kind: ItemKind, x: number, y: number, t: number) {
  y += Math.sin(t * 3 + x * 0.05) * 5;
  c.save(); c.translate(x, y);
  const glow = c.createRadialGradient(0, 0, 2, 0, 0, 28); glow.addColorStop(0, 'rgba(255,255,255,.55)'); glow.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = glow; circ(c, 0, 0, 28); c.fill();
  c.rotate(kind === 'flake' ? t * 0.8 : Math.sin(t * 2 + x) * 0.18);
  if (drawSprite(c, 'item-' + kind, 0, 0, true)) { c.restore(); return; }
  if (kind === 'star') {
    c.fillStyle = '#ffd23d'; c.strokeStyle = '#e09b00'; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 14, a = i / 10 * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.stroke();
  } else if (kind === 'candy') {
    c.fillStyle = '#ff9fd0'; c.beginPath(); c.moveTo(-9, 0); c.lineTo(-19, -8); c.lineTo(-19, 8); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(9, 0); c.lineTo(19, -8); c.lineTo(19, 8); c.closePath(); c.fill();
    c.fillStyle = '#ff4fa0'; circ(c, 0, 0, 10); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(-4, 0, 7, -1, 1); c.stroke(); c.beginPath(); c.arc(4, 0, 7, 2.1, 4.2); c.stroke();
  } else if (kind === 'gem') {
    c.fillStyle = '#5ef0ff'; c.strokeStyle = '#1aa3c8'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -14); c.lineTo(12, -3); c.lineTo(0, 15); c.lineTo(-12, -3); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(0, -14); c.lineTo(5, -3); c.lineTo(-5, -3); c.closePath(); c.fill();
  } else if (kind === 'flake') {
    c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round'; c.shadowColor = '#3d9bff'; c.shadowBlur = 8;
    for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -14); c.moveTo(0, -8); c.lineTo(-5, -12); c.moveTo(0, -8); c.lineTo(5, -12); c.stroke(); }
  }
  c.restore();
}

export function drawGhost(c: C, x: number, y: number, t: number, ph: number) {
  c.save(); c.translate(x, y); c.globalAlpha = 0.9;
  const g = c.createRadialGradient(0, 0, 10, 0, 0, 50); g.addColorStop(0, 'rgba(200,180,255,.35)'); g.addColorStop(1, 'rgba(200,180,255,0)'); c.fillStyle = g; circ(c, 0, 0, 50); c.fill();
  if (!drawSprite(c, 'ghost', 0, 0, true)) {
    c.fillStyle = '#f4f0ff'; c.beginPath(); c.arc(0, -6, 24, Math.PI, 0); c.lineTo(24, 22);
    for (let i = 1; i <= 6; i++) c.lineTo(24 - i * 8, 22 + (i % 2 ? -6 : 0) + Math.sin(t * 6 + i + ph) * 2);
    c.closePath(); c.fill();
    c.fillStyle = '#1d1430'; c.beginPath(); c.ellipse(-8, -6, 4, 6, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(8, -6, 4, 6, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, 7, 4, 5, 0, 0, TAU); c.fill();
  }
  c.restore();
}

export function drawBat(c: C, x: number, y: number, t: number, i: number) {
  if (drawSprite(c, 'bat', x, y, true)) return;
  const f = Math.sin(t * 16 + i) * 9; c.fillStyle = '#120818';
  c.beginPath(); c.ellipse(x, y, 6, 8, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x - 4, y - 2); c.quadraticCurveTo(x - 16, y - 12 + f, x - 28, y - 4 + f); c.quadraticCurveTo(x - 20, y - 2 + f * 0.5, x - 16, y + 4); c.quadraticCurveTo(x - 10, y, x - 4, y + 3); c.fill();
  c.beginPath(); c.moveTo(x + 4, y - 2); c.quadraticCurveTo(x + 16, y - 12 + f, x + 28, y - 4 + f); c.quadraticCurveTo(x + 20, y - 2 + f * 0.5, x + 16, y + 4); c.quadraticCurveTo(x + 10, y, x + 4, y + 3); c.fill();
  c.fillStyle = '#ff4d4d'; circ(c, x - 2, y - 2, 1.2); c.fill(); circ(c, x + 2, y - 2, 1.2); c.fill();
}

export function drawPortal(c: C, p: Portal, t: number) {
  const cx = p.x, cy = p.y - 62;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(cx, p.y + 2, 46, 8, 0, 0, TAU); c.fill();
  c.save(); c.translate(cx, cy);
  const g = c.createRadialGradient(0, 0, 6, 0, 0, 90); g.addColorStop(0, hexA(p.color, .6)); g.addColorStop(1, hexA(p.color, 0)); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 74, 94, 0, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.ellipse(0, 0, 33, 55, 0, 0, TAU); c.clip();
  c.fillStyle = shade(p.color, -0.6); c.fillRect(-40, -60, 80, 120);
  c.scale(0.62, 1);
  for (let i = 0; i < 6; i++) {
    const sp = (i % 2 ? 1 : -1) * 2.4, a = t * sp + i;
    c.strokeStyle = i % 2 ? hexA(p.color, 0.9 - i * 0.1) : `rgba(255,255,255,${0.75 - i * 0.1})`; c.lineWidth = 5;
    c.beginPath(); c.arc(0, 0, 52 - i * 8, a, a + 3.8); c.stroke();
  }
  c.fillStyle = '#fff'; circ(c, 0, 0, 4 + Math.sin(t * 5) * 1.5); c.fill();
  c.restore();
  c.lineWidth = 8; c.strokeStyle = shade(p.color, -0.3); c.beginPath(); c.ellipse(0, 0, 36, 58, 0, 0, TAU); c.stroke();
  c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(0, 0, 36, 58, 0, -2.4, -1.2); c.stroke();
  for (let i = 0; i < 5; i++) { const a = t * 1.6 + i * TAU / 5; c.fillStyle = '#fff'; circ(c, Math.cos(a) * 44, Math.sin(a) * 66, 2.2); c.fill(); }
  c.restore();
  c.font = `700 15px ${FONT}`; c.textAlign = 'center';
  const tw = c.measureText(p.label).width + 20;
  c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, cx - tw / 2, cy - 96, tw, 26, 13); c.fill();
  c.fillStyle = '#fff'; c.fillText(p.label, cx, cy - 78);
}

export interface Particle { x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; size: number; kind: 'dot' | 'star' | 'ring' | 'flame'; col: string }
export function drawParticle(c: C, p: Particle) {
  const a = Math.max(0, p.life / p.max); c.globalAlpha = a;
  if (p.kind === 'ring') { c.strokeStyle = p.col; c.lineWidth = 1.5; circ(c, p.x, p.y, p.size); c.stroke(); }
  else if (p.kind === 'flame') { c.fillStyle = p.col; circ(c, p.x, p.y, p.size * a + 1); c.fill(); }
  else if (p.kind === 'star') { c.fillStyle = p.col; c.save(); c.translate(p.x, p.y); c.rotate(p.life * 6); c.fillRect(-p.size, -p.size * 0.3, p.size * 2, p.size * 0.6); c.fillRect(-p.size * 0.3, -p.size, p.size * 0.6, p.size * 2); c.restore(); }
  else { c.fillStyle = p.col; circ(c, p.x, p.y, p.size); c.fill(); }
  c.globalAlpha = 1;
}
