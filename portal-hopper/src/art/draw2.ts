// Code-drawn art for the 20 new worlds: generic backgrounds, bad guys, new treats and decor, and the
// level pieces (springs, moving platforms, item boxes, boost pads, bumpers, updrafts, goal flag).
import { GY, type Enemy, type Fg, type Layer, type Theme } from '../game/types';
import { TAU, view, mod, hash, rr, circ, shade, hexA } from './draw';
import { drawSprite } from './sprites';

type C = CanvasRenderingContext2D;

// ---------- backgrounds ----------
function layer(c: C, L: Layer, cx: number, hz: number) {
  const off = cx * L.par, base = hz + L.base;
  c.fillStyle = L.col;
  switch (L.type) {
    case 'hills': case 'dunes': case 'waves': {
      const fr = L.type === 'dunes' ? 0.0025 : L.type === 'waves' ? 0.02 : 0.005;
      c.beginPath(); c.moveTo(-10, base + 600);
      for (let x = -10; x <= view.w + 20; x += 12) {
        const wx = x + off;
        const y = L.type === 'waves' ? base - L.h * (0.6 + 0.4 * Math.sin(wx * fr)) : base - L.h * (0.55 + 0.35 * Math.sin(wx * fr + L.h) + 0.2 * Math.sin(wx * fr * 2.7));
        c.lineTo(x, y);
      }
      c.lineTo(view.w + 20, base + 600); c.closePath(); c.fill(); break;
    }
    case 'mountains': case 'crystals': {
      const sp = L.type === 'crystals' ? 90 : 260;
      for (let x = -mod(off, sp) - sp; x < view.w + sp; x += sp) {
        const i = Math.round((x + off) / sp), hh = L.h * (0.55 + 0.45 * hash(i * 3.1));
        c.beginPath();
        if (L.type === 'crystals') { c.moveTo(x, base); c.lineTo(x + sp * 0.3, base - hh); c.lineTo(x + sp * 0.5, base - hh * 0.8); c.lineTo(x + sp * 0.8, base); }
        else { c.moveTo(x - sp * 0.2, base); c.lineTo(x + sp / 2, base - hh); c.lineTo(x + sp * 1.2, base); }
        c.closePath(); c.fill();
      }
      break;
    }
    case 'city': {
      const sp = 70;
      for (let x = -mod(off, sp) - sp; x < view.w + sp; x += sp) {
        const i = Math.round((x + off) / sp), hh = L.h * (0.35 + 0.65 * hash(i * 1.7)), ww = sp * (0.6 + 0.35 * hash(i * 2.3));
        c.fillStyle = L.col; c.fillRect(x, base - hh, ww, hh + 600);
        c.fillStyle = 'rgba(255,230,150,.35)';
        for (let wy = base - hh + 12; wy < base - 10; wy += 22) for (let wx = x + 8; wx < x + ww - 8; wx += 16) if (hash(wx * 0.3 + wy) > 0.45) c.fillRect(wx, wy, 7, 9);
      }
      break;
    }
    case 'forest': {
      const sp = 60;
      for (let x = -mod(off, sp) - sp; x < view.w + sp; x += sp) {
        const i = Math.round((x + off) / sp), hh = 90 + 70 * hash(i * 1.3), r = 30 + 14 * hash(i * 2.9);
        c.fillRect(x + sp / 2 - 5, base - hh * 0.6, 10, hh);
        circ(c, x + sp / 2, base - hh, r); c.fill(); circ(c, x + sp / 2 - r * 0.7, base - hh + r * 0.6, r * 0.75); c.fill(); circ(c, x + sp / 2 + r * 0.7, base - hh + r * 0.6, r * 0.75); c.fill();
      }
      c.fillRect(-10, base - 20, view.w + 20, 640); break;
    }
    case 'castles': {
      const sp = 620;
      for (let x = -mod(off, sp) - sp; x < view.w + sp; x += sp) {
        c.fillRect(x, base - 120, 180, 640); c.fillRect(x - 26, base - 190, 46, 700); c.fillRect(x + 160, base - 220, 44, 700);
        c.beginPath(); c.moveTo(x - 34, base - 190); c.lineTo(x - 3, base - 250); c.lineTo(x + 28, base - 190); c.fill();
        c.beginPath(); c.moveTo(x + 152, base - 220); c.lineTo(x + 182, base - 285); c.lineTo(x + 212, base - 220); c.fill();
        for (let i = 0; i < 5; i++) c.fillRect(x + 10 + i * 34, base - 134, 18, 14);
      }
      break;
    }
  }
}

function sun(c: C, th: Theme, cx: number, t: number, oy: number) {
  if (!th.sun) return;
  const s = th.sun, x = view.w * 0.78 - cx * 0.02, y = 100 + oy * 0.3;
  const g = c.createRadialGradient(x, y, 10, x, y, 130); g.addColorStop(0, hexA(s.col.length === 7 ? s.col : '#ffffff', 0.55)); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; circ(c, x, y, 130); c.fill();
  if (s.kind === 'sun' || s.kind === 'moon') { c.fillStyle = s.col; circ(c, x, y, s.kind === 'sun' ? 44 : 52); c.fill(); }
  if (s.kind === 'moon') { c.fillStyle = 'rgba(200,180,140,.35)'; circ(c, x - 16, y - 10, 10); c.fill(); circ(c, x + 14, y + 12, 7); c.fill(); }
  if (s.kind === 'planet') { c.fillStyle = s.col; circ(c, x, y, 60); c.fill(); }
  if (s.kind === 'disco') {
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y - 50); c.stroke();
    c.fillStyle = '#c9c9e8'; circ(c, x, y, 50); c.fill();
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
      const px = x + i * 11, py = y + j * 11; if ((px - x) ** 2 + (py - y) ** 2 > 46 * 46) continue;
      c.fillStyle = hash(i * 7 + j * 13 + Math.floor(t * 4)) > 0.6 ? '#ffffff' : ['#3df2ff', '#ff4fd8', '#ffe14d', '#9a9ac0'][Math.abs(i + j) % 4]; c.fillRect(px - 5, py - 5, 10, 10);
    }
    for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * TAU / 6; c.strokeStyle = hexA(['#3df2ff', '#ff4fd8', '#ffe14d'][i % 3], 0.18); c.lineWidth = 26; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 900, y + Math.abs(Math.sin(a)) * 900); c.stroke(); }
  }
  if (s.kind === 'clock') {
    c.fillStyle = s.col; circ(c, x, y, 58); c.fill(); c.strokeStyle = '#5a3a20'; c.lineWidth = 5; circ(c, x, y, 58); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.fillStyle = '#5a3a20'; circ(c, x + Math.cos(a) * 46, y + Math.sin(a) * 46, 3); c.fill(); }
    c.lineCap = 'round'; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(t * 0.1 - 1.6) * 28, y + Math.sin(t * 0.1 - 1.6) * 28); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(t * 1.2) * 42, y + Math.sin(t * 1.2) * 42); c.stroke();
  }
}

export function bgGeneric(c: C, th: Theme, cx: number, t: number, oy: number) {
  const hz = GY + oy, sky = th.sky ?? ['#5fb8ff', '#d6f1ff'];
  const g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); c.fillStyle = g; c.fillRect(0, 0, view.w, view.h);
  if (th.fg === 'sparkle' || th.sky && isDark(sky[0])) for (let i = 0; i < 70; i++) {
    const x = mod(hash(i) * 2000 - cx * 0.04, 2000) - 20, y = hash(i + 50) * (hz - 100);
    if (x > view.w + 20) continue;
    c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i)); c.fillStyle = '#fff'; circ(c, x, y, 0.6 + hash(i + 9) * 1.4); c.fill();
  }
  c.globalAlpha = 1;
  sun(c, th, cx, t, oy);
  for (const L of th.far ?? []) layer(c, L, cx, hz);
}
const isDark = (h: string) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) < 200; };

let FLAKES: { x: number; y: number; s: number; sp: number; p: number }[] | null = null;
export function fgGeneric(c: C, fg: Fg | undefined, cx: number, t: number, oy: number) {
  if (!fg) return;
  if (fg === 'sepia') { c.fillStyle = 'rgba(140,90,30,.12)'; c.fillRect(0, 0, view.w, view.h); return; }
  if (fg === 'fog') {
    for (let i = 0; i < 4; i++) { const x = mod(i * 520 + t * 18 - cx * 0.9, view.w + 900) - 450; c.fillStyle = 'rgba(210,190,255,.07)'; c.beginPath(); c.ellipse(x, GY + oy - 8 + i * 6, 420, 26, 0, 0, TAU); c.fill(); }
    return;
  }
  FLAKES ??= Array.from({ length: 70 }, (_, i) => ({ x: hash(i * 1.1), y: hash(i * 2.3), s: 1 + hash(i * 3.7) * 2.6, sp: 30 + hash(i * 4.1) * 60, p: hash(i * 5.9) * 6 }));
  for (const f of FLAKES) {
    let x = mod(f.x * 1600 - cx * 0.8 + Math.sin(t * 0.8 + f.p) * 30, view.w + 40) - 20, y = 0;
    if (fg === 'bubbles') { y = view.h - mod(f.y * 900 + t * f.sp, view.h + 20); c.strokeStyle = 'rgba(220,250,255,.6)'; c.lineWidth = 1.5; circ(c, x, y, f.s * 1.6); c.stroke(); continue; }
    if (fg === 'embers') { y = view.h - mod(f.y * 900 + t * f.sp * 1.2, view.h + 20); c.fillStyle = hexA(f.p > 3 ? '#ffb020' : '#ff5a2b', 0.8); circ(c, x, y, f.s * 0.8); c.fill(); continue; }
    if (fg === 'wind') { x = mod(f.x * 1600 - cx * 1.2 + t * 500 * (0.6 + f.p / 10), view.w + 200) - 100; y = mod(f.y * 600, view.h); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 50 - f.s * 10, y); c.stroke(); continue; }
    y = mod(f.y * 900 + t * f.sp, view.h + 20) - 10;
    if (fg === 'leaves') { c.save(); c.translate(x, y); c.rotate(t * 2 + f.p); c.fillStyle = f.p > 3 ? '#e0782a' : '#ffb050'; c.beginPath(); c.ellipse(0, 0, 6, 3, 0, 0, TAU); c.fill(); c.restore(); continue; }
    if (fg === 'confetti') { c.save(); c.translate(x, y); c.rotate(t * 3 + f.p); c.fillStyle = ['#ff5d8f', '#ffe14d', '#3df2ff', '#7bffb0'][Math.floor(f.p) % 4]; c.fillRect(-3, -2, 6, 4); c.restore(); continue; }
    if (fg === 'sparkle') { c.globalAlpha = Math.abs(Math.sin(t * 2 + f.p)); c.fillStyle = '#fff6c0'; c.fillRect(x - f.s, y - 0.5, f.s * 2, 1); c.fillRect(x - 0.5, y - f.s, 1, f.s * 2); c.globalAlpha = 1; continue; }
    if (fg === 'snow') { c.fillStyle = 'rgba(255,255,255,.9)'; circ(c, x, y, f.s); c.fill(); }
  }
}

// ---------- new treats ----------
export function drawItem2(c: C, kind: string, t: number) {
  switch (kind) {
    case 'coin': { const sx = Math.abs(Math.cos(t * 3)) * 0.8 + 0.2; c.save(); c.scale(sx, 1); c.fillStyle = '#ffd23d'; c.strokeStyle = '#d69a00'; c.lineWidth = 2.5; circ(c, 0, 0, 12); c.fill(); c.stroke(); c.fillStyle = '#fff3a0'; c.fillRect(-2, -7, 4, 14); c.restore(); break; }
    case 'heart': c.fillStyle = '#ff4f8a'; c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-18, 0, -12, -16, 0, -6); c.bezierCurveTo(12, -16, 18, 0, 0, 12); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; circ(c, -6, -5, 3); c.fill(); break;
    case 'note': c.fillStyle = '#3df2ff'; c.strokeStyle = '#3df2ff'; c.lineWidth = 3; c.beginPath(); c.ellipse(-5, 8, 6, 4.5, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(0, 7); c.lineTo(0, -12); c.lineTo(9, -8); c.stroke(); break;
    case 'leaf': c.fillStyle = '#ff8a2b'; c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(14, -2, 0, 14); c.quadraticCurveTo(-14, -2, 0, -14); c.fill(); c.strokeStyle = '#b8501a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -12); c.lineTo(0, 16); c.stroke(); break;
    case 'bolt': c.fillStyle = '#ffe14d'; c.strokeStyle = '#d69a00'; c.lineWidth = 2; c.beginPath(); c.moveTo(3, -15); c.lineTo(-9, 2); c.lineTo(-1, 2); c.lineTo(-4, 15); c.lineTo(9, -3); c.lineTo(1, -3); c.closePath(); c.fill(); c.stroke(); break;
    case 'cupcake': c.fillStyle = '#c98b55'; c.beginPath(); c.moveTo(-10, 0); c.lineTo(10, 0); c.lineTo(7, 13); c.lineTo(-7, 13); c.closePath(); c.fill(); c.fillStyle = '#ffb3d9'; circ(c, -6, -2, 7); c.fill(); circ(c, 6, -2, 7); c.fill(); circ(c, 0, -7, 8); c.fill(); c.fillStyle = '#ff3d6e'; circ(c, 0, -15, 3.5); c.fill(); break;
    case 'shell': c.fillStyle = '#ffc2b0'; c.beginPath(); c.moveTo(0, 12); c.lineTo(-14, -4); c.quadraticCurveTo(0, -18, 14, -4); c.closePath(); c.fill(); c.strokeStyle = '#e0806a'; c.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, 11); c.lineTo(i * 6, -8); c.stroke(); } break;
    case 'feather': c.fillStyle = '#9ad0ff'; c.beginPath(); c.moveTo(-8, 14); c.quadraticCurveTo(-10, -6, 8, -15); c.quadraticCurveTo(10, 4, -8, 14); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-8, 14); c.lineTo(6, -12); c.stroke(); break;
    case 'gear': { c.fillStyle = '#c0c8d0'; c.strokeStyle = '#7a8490'; c.lineWidth = 2; c.save(); c.rotate(t); c.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 9 : 13, a = i / 16 * TAU; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#7a8490'; circ(c, 0, 0, 4); c.fill(); c.restore(); break; }
    case 'apple': c.fillStyle = '#ff3d3d'; circ(c, -4, 2, 9); c.fill(); circ(c, 4, 2, 9); c.fill(); c.fillStyle = '#6a3f22'; c.fillRect(-1, -12, 2.5, 7); c.fillStyle = '#4fbf5a'; c.beginPath(); c.ellipse(5, -10, 5, 2.5, -0.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; circ(c, -6, -2, 3); c.fill(); break;
    case 'crystal': c.fillStyle = '#d07bff'; c.strokeStyle = '#8a3fd0'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -16); c.lineTo(8, -4); c.lineTo(5, 14); c.lineTo(-5, 14); c.lineTo(-8, -4); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(0, -14); c.lineTo(3, -4); c.lineTo(-3, -4); c.closePath(); c.fill(); break;
    case 'balloon': c.strokeStyle = '#888'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 10); c.quadraticCurveTo(4, 16, 0, 22); c.stroke(); c.fillStyle = '#ff5d8f'; c.beginPath(); c.ellipse(0, -2, 11, 13, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-4, -7, 3, 5, -0.4, 0, TAU); c.fill(); break;
    case 'flame': { const f = 1 + Math.sin(t * 12) * 0.08; c.save(); c.scale(1, f); c.fillStyle = '#ff5a2b'; c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(14, 0, 8, 10); c.quadraticCurveTo(0, 16, -8, 10); c.quadraticCurveTo(-14, 0, 0, -16); c.fill(); c.fillStyle = '#ffd23d'; c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(7, 3, 4, 9); c.quadraticCurveTo(0, 12, -4, 9); c.quadraticCurveTo(-7, 3, 0, -6); c.fill(); c.restore(); break; }
    case 'orb': { const g = c.createRadialGradient(-4, -4, 2, 0, 0, 13); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#ffd06b'); g.addColorStop(1, '#ff8a2b'); c.fillStyle = g; circ(c, 0, 0, 12); c.fill(); break; }
    case 'flower': c.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t; circ(c, Math.cos(a) * 8, Math.sin(a) * 8, 6); c.fill(); } c.fillStyle = '#ffd23d'; circ(c, 0, 0, 6); c.fill(); break;
    case 'key': c.strokeStyle = '#ffd23d'; c.fillStyle = '#ffd23d'; c.lineWidth = 4; circ(c, -6, 0, 6); c.stroke(); c.fillRect(0, -2, 14, 4); c.fillRect(9, 2, 3, 6); c.fillRect(4, 2, 3, 5); break;
  }
}

// ---------- new decor ----------
export function drawDecor2(c: C, kind: string, x: number, t: number, accent: string): boolean {
  const y = GY;
  switch (kind) {
    case 'bush': c.fillStyle = shade(accent, -0.15); circ(c, x - 18, y - 16, 18); c.fill(); circ(c, x + 18, y - 16, 18); c.fill(); c.fillStyle = accent; circ(c, x, y - 24, 22); c.fill(); return true;
    case 'mushroom': c.fillStyle = '#f4ead8'; c.fillRect(x - 7, y - 30, 14, 30); c.fillStyle = '#ff4d4d'; c.beginPath(); c.ellipse(x, y - 30, 28, 18, 0, Math.PI, TAU); c.fill(); c.fillStyle = '#fff'; circ(c, x - 10, y - 38, 4); c.fill(); circ(c, x + 8, y - 42, 5); c.fill(); return true;
    case 'cactus': c.fillStyle = '#3f9a4a'; rr(c, x - 9, y - 80, 18, 80, 9); c.fill(); rr(c, x - 30, y - 56, 12, 30, 6); c.fill(); rr(c, x - 30, y - 34, 26, 10, 5); c.fill(); rr(c, x + 18, y - 64, 12, 34, 6); c.fill(); rr(c, x + 6, y - 38, 24, 10, 5); c.fill(); c.fillStyle = '#ff7ab0'; circ(c, x, y - 82, 5); c.fill(); return true;
    case 'lamp': { c.fillStyle = '#3a3a48'; c.fillRect(x - 3, y - 110, 6, 110); c.fillRect(x - 10, y - 6, 20, 6); const f = 0.7 + 0.3 * Math.sin(t * 3 + x); const g = c.createRadialGradient(x, y - 112, 2, x, y - 112, 40); g.addColorStop(0, `rgba(255,230,140,${0.6 * f})`); g.addColorStop(1, 'rgba(255,230,140,0)'); c.fillStyle = g; circ(c, x, y - 112, 40); c.fill(); c.fillStyle = '#fff2b0'; circ(c, x, y - 112, 8); c.fill(); return true; }
    case 'crystal': c.fillStyle = hexA('#b07bff', 0.9); c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x - 12, y - 50); c.lineTo(x - 2, y); c.fill(); c.fillStyle = hexA('#7be0ff', 0.9); c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + 4, y - 70); c.lineTo(x + 16, y); c.fill(); c.fillStyle = hexA('#ff7ad9', 0.9); c.beginPath(); c.moveTo(x + 10, y); c.lineTo(x + 20, y - 40); c.lineTo(x + 28, y); c.fill(); return true;
    case 'coral': c.strokeStyle = '#ff7a9a'; c.lineCap = 'round'; c.lineWidth = 8; for (const [dx, h] of [[-12, 50], [0, 70], [12, 45]]) { c.beginPath(); c.moveTo(x + dx, y); c.quadraticCurveTo(x + dx + Math.sin(t + dx) * 8, y - h / 2, x + dx + Math.sin(t * 1.3 + dx) * 10, y - h); c.stroke(); } c.strokeStyle = '#2fbf7a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 24, y); c.quadraticCurveTo(x + 34 + Math.sin(t) * 10, y - 40, x + 26, y - 80); c.stroke(); return true;
    case 'lollipop': c.fillStyle = '#ffffff'; c.fillRect(x - 3, y - 80, 6, 80); c.fillStyle = '#ff5d8f'; circ(c, x, y - 92, 22); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.arc(x, y - 92, 13, t, t + 4.4); c.stroke(); return true;
    case 'candycane': c.lineCap = 'round'; c.lineWidth = 11; c.strokeStyle = '#ffffff'; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 80); c.arc(x + 16, y - 80, 16, Math.PI, 0); c.stroke(); c.strokeStyle = '#ff3d6e'; c.lineWidth = 11; c.setLineDash([9, 9]); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 80); c.arc(x + 16, y - 80, 16, Math.PI, 0); c.stroke(); c.setLineDash([]); return true;
    case 'gear': c.save(); c.translate(x, y - 40); c.rotate(t * 0.5); c.fillStyle = '#8a7a6a'; c.beginPath(); for (let i = 0; i < 20; i++) { const r = i % 2 ? 30 : 40, a = i / 20 * TAU; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = '#5a4a3a'; circ(c, 0, 0, 12); c.fill(); c.restore(); return true;
    case 'palm': c.strokeStyle = '#8a5a32'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 60, x - 4, y - 120); c.stroke(); c.fillStyle = '#3dbf6a'; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.6 + Math.sin(t + i) * 0.05; c.save(); c.translate(x - 4, y - 120); c.rotate(a); c.beginPath(); c.ellipse(28, 0, 32, 8, 0.3, 0, TAU); c.fill(); c.restore(); } return true;
    case 'column': c.fillStyle = '#eef0ff'; c.fillRect(x - 14, y - 120, 28, 120); c.fillRect(x - 20, y - 128, 40, 10); c.fillRect(x - 20, y - 10, 40, 10); c.fillStyle = 'rgba(0,0,40,.08)'; for (let i = -8; i <= 8; i += 8) c.fillRect(x + i - 1, y - 118, 2, 108); return true;
    case 'cloudbush': c.fillStyle = '#ffffff'; circ(c, x - 20, y - 14, 18); c.fill(); circ(c, x + 4, y - 24, 24); c.fill(); circ(c, x + 26, y - 14, 16); c.fill(); return true;
    case 'wheat': c.strokeStyle = '#c9a040'; c.lineWidth = 3; for (let i = -2; i <= 2; i++) { const sw = Math.sin(t * 2 + x * 0.01 + i) * 8; c.beginPath(); c.moveTo(x + i * 7, y); c.quadraticCurveTo(x + i * 7, y - 30, x + i * 7 + sw, y - 60); c.stroke(); c.fillStyle = '#e6cf5a'; c.beginPath(); c.ellipse(x + i * 7 + sw, y - 66, 4, 10, sw * 0.04, 0, TAU); c.fill(); } return true;
    case 'barrel': c.fillStyle = '#8a5a32'; rr(c, x - 20, y - 50, 40, 50, 10); c.fill(); c.fillStyle = '#5a3a20'; c.fillRect(x - 20, y - 40, 40, 5); c.fillRect(x - 20, y - 16, 40, 5); return true;
    case 'speaker': { c.fillStyle = '#2a2238'; rr(c, x - 24, y - 90, 48, 90, 6); c.fill(); const p = 1 + Math.max(0, Math.sin(t * 12.56)) * 0.12; c.fillStyle = '#ff4fd8'; circ(c, x, y - 32, 15 * p); c.fill(); c.fillStyle = '#3df2ff'; circ(c, x, y - 70, 9 * p); c.fill(); c.fillStyle = '#1a1228'; circ(c, x, y - 32, 6); c.fill(); return true; }
    case 'toyblock': { const cols = ['#ff6f6f', '#5fb8ff', '#ffe14d', '#5fd16a']; const k = Math.floor(hash(x) * 4); c.fillStyle = cols[k]; c.fillRect(x - 22, y - 44, 44, 44); c.fillStyle = cols[(k + 1) % 4]; c.fillRect(x - 6, y - 74, 30, 30); c.fillStyle = '#fff'; c.font = "700 22px Fredoka, sans-serif"; c.textAlign = 'center'; c.fillText('ABC'[k % 3], x, y - 14); return true; }
  }
  return false;
}

// ---------- slide (custom colours) ----------
export function drawSlideCustom(c: C, x1: number, y1: number, x2: number, y2: number, cols: [string, string]) {
  const th = 18, k = (y2 - y1) / (x2 - x1);
  c.fillStyle = cols[1]; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x2, y2 + th); c.lineTo(x1, y1 + th); c.closePath(); c.fill();
  c.fillStyle = cols[0];
  for (let x = x1; x < x2; x += 36) { const xe = Math.min(x2, x + 18); c.beginPath(); c.moveTo(x, y1 + k * (x - x1)); c.lineTo(xe, y1 + k * (xe - x1)); c.lineTo(xe, y1 + k * (xe - x1) + th * 0.6); c.lineTo(x, y1 + k * (x - x1) + th * 0.6); c.closePath(); c.fill(); }
}

// ---------- bad guys ----------
export function drawEnemy(c: C, e: Enemy, t: number, x: number, y: number) {
  const dz = e.dizzy > 0, face = e.kind === 'walker' || e.kind === 'hopper' ? e.dir : Math.cos(t * e.sp + e.ph) >= 0 ? 1 : -1;
  c.save(); c.translate(x, y);
  if (e.punt > 0) c.rotate(e.punt * 10);
  if (drawSprite(c, 'enemy-' + e.art, 0, 0, e.kind === 'flyer')) { c.restore(); return; }
  const eyes = (ex: number, ey: number, r = 4.5) => {
    c.fillStyle = '#fff'; circ(c, ex - 6, ey, r); c.fill(); circ(c, ex + 6, ey, r); c.fill();
    if (dz) { c.strokeStyle = '#1d1430'; c.lineWidth = 1.6; for (const s of [-6, 6]) { c.beginPath(); c.moveTo(ex + s - 2.5, ey - 2.5); c.lineTo(ex + s + 2.5, ey + 2.5); c.moveTo(ex + s + 2.5, ey - 2.5); c.lineTo(ex + s - 2.5, ey + 2.5); c.stroke(); } }
    else { c.fillStyle = '#1d1430'; circ(c, ex - 6 + face * 1.8, ey + 0.5, r * 0.5); c.fill(); circ(c, ex + 6 + face * 1.8, ey + 0.5, r * 0.5); c.fill(); }
  };
  const sq = dz ? 0.7 : 1;
  switch (e.art) {
    case 'slime': { const b = Math.sin(t * 6 + e.ph) * 2; c.scale(1 + (1 - sq) * 0.6, sq); c.fillStyle = e.col; c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(-22, -34 - b, 0, -34 - b); c.quadraticCurveTo(22, -34 - b, 22, 0); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-9, -24, 5, 3, -0.4, 0, TAU); c.fill(); eyes(face * 3, -18); break; }
    case 'roller': { c.save(); c.rotate((e.x * 0.05) % TAU); c.fillStyle = e.col; circ(c, 0, -20, 20); c.fill(); c.strokeStyle = shade(e.col.length === 7 ? e.col : '#888888', -0.25); c.lineWidth = 3; c.beginPath(); c.arc(0, -20, 14, 0.5, 2.2); c.stroke(); c.restore(); eyes(face * 4, -24, 4.5); break; }
    case 'bot': { c.scale(1, sq); c.fillStyle = e.col; rr(c, -18, -38, 36, 30, 6); c.fill(); c.fillStyle = shade(e.col, -0.3); c.fillRect(-14, -8, 8, 8); c.fillRect(6, -8, 8, 8); c.strokeStyle = shade(e.col, -0.3); c.lineWidth = 2; c.beginPath(); c.moveTo(0, -38); c.lineTo(0, -48); c.stroke(); c.fillStyle = Math.sin(t * 6) > 0 ? '#ff3d3d' : '#ffd23d'; circ(c, 0, -50, 3.5); c.fill(); c.fillStyle = '#1d1430'; rr(c, -12, -32, 24, 13, 4); c.fill(); if (!dz) { c.fillStyle = '#5ef0ff'; circ(c, -5 + face * 2, -26, 3); c.fill(); circ(c, 5 + face * 2, -26, 3); c.fill(); } else eyes(0, -26, 3); break; }
    case 'crab': { c.scale(1, sq); c.fillStyle = e.col; c.beginPath(); c.ellipse(0, -14, 20, 13, 0, 0, TAU); c.fill(); const cl = Math.sin(t * 8) * 4; for (const s of [-1, 1]) { circ(c, s * 26, -22 + cl * s, 8); c.fill(); c.strokeStyle = e.col; c.lineWidth = 3; c.beginPath(); c.moveTo(s * 14, -6); c.lineTo(s * 22, 0); c.stroke(); } c.strokeStyle = e.col; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -26); c.lineTo(-6, -32); c.moveTo(6, -26); c.lineTo(6, -32); c.stroke(); eyes(0, -34, 4); break; }
    case 'frog': { const air = e.vy !== 0; c.fillStyle = e.col; c.beginPath(); c.ellipse(0, -16, 20, air ? 18 : 14, 0, 0, TAU); c.fill(); c.fillStyle = shade(e.col, -0.25); c.beginPath(); c.ellipse(-14, -2, 9, air ? 7 : 4, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(14, -2, 9, air ? 7 : 4, 0, 0, TAU); c.fill(); c.fillStyle = e.col; circ(c, -8, -30, 7); c.fill(); circ(c, 8, -30, 7); c.fill(); eyes(0, -30, 4.5); c.strokeStyle = '#1d1430'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, -16, 7, 0.3, Math.PI - 0.3); c.stroke(); break; }
    case 'flyer': case 'bee': { const f = Math.sin(t * 22 + e.ph) * 8; c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(-12, -6 - f * 0.5, 12, 6, -0.6 + f * 0.04, 0, TAU); c.fill(); c.beginPath(); c.ellipse(12, -6 - f * 0.5, 12, 6, 0.6 - f * 0.04, 0, TAU); c.fill(); c.fillStyle = e.col; circ(c, 0, 0, 15); c.fill(); if (e.art === 'bee') { c.fillStyle = '#2a1a10'; c.fillRect(-12, -2, 24, 4); c.fillRect(-9, 6, 18, 3); } eyes(face * 3, -4, 4); c.fillStyle = '#ffb020'; c.beginPath(); c.moveTo(face * 14, 0); c.lineTo(face * 21, 3); c.lineTo(face * 14, 5); c.fill(); break; }
    case 'fish': { c.scale(face, 1); const w = Math.sin(t * 10 + e.ph) * 4; c.fillStyle = e.col; c.beginPath(); c.ellipse(0, 0, 18, 12, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-14, 0); c.lineTo(-28, -10 + w); c.lineTo(-28, 10 + w); c.closePath(); c.fill(); c.fillStyle = '#fff'; circ(c, 8, -3, 4.5); c.fill(); c.fillStyle = '#1d1430'; circ(c, 9, -3, 2.2); c.fill(); break; }
    case 'ghost': { c.globalAlpha = 0.9; c.fillStyle = e.col; c.beginPath(); c.arc(0, -6, 24, Math.PI, 0); c.lineTo(24, 22); for (let i = 1; i <= 6; i++) c.lineTo(24 - i * 8, 22 + (i % 2 ? -6 : 0) + Math.sin(t * 6 + i + e.ph) * 2); c.closePath(); c.fill(); c.fillStyle = '#1d1430'; c.beginPath(); c.ellipse(-8, -6, 4, 6, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(8, -6, 4, 6, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, 7, 4, 5, 0, 0, TAU); c.fill(); break; }
  }
  c.restore();
  if (dz) for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; c.fillStyle = '#ffe14d'; circ(c, x + Math.cos(a) * 16, y - (e.kind === 'flyer' ? 26 : 48) + Math.sin(a) * 5, 3); c.fill(); }
}

// ---------- level pieces ----------
export function drawSpring(c: C, x: number, y: number, t: number) {
  const k = t > 0 ? 1 - t * 1.8 : 0, h = 16 + k * 10;
  c.strokeStyle = '#8a8a9a'; c.lineWidth = 3; c.beginPath();
  for (let i = 0; i <= 6; i++) c.lineTo(x + (i % 2 ? 9 : -9), y - 3 - (h - 6) * i / 6);
  c.stroke();
  c.fillStyle = '#ff3d6e'; rr(c, x - 22, y - h - 6, 44, 8, 4); c.fill();
  c.fillStyle = '#5a5a6a'; rr(c, x - 18, y - 4, 36, 4, 2); c.fill();
}
export function drawMover(c: C, x: number, y: number, w: number, th: Theme) {
  c.fillStyle = th.plat; rr(c, x, y, w, 18, 7); c.fill(); c.fillStyle = th.platTop; rr(c, x, y, w, 6, 4); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 3; i++) { circ(c, x + w / 2 - 12 + i * 12, y + 12, 2.2); c.fill(); }
}
export function drawBox(c: C, x: number, y: number, used: boolean, hit: number, t: number) {
  const dy = hit > 0 ? -Math.sin(hit / 0.25 * Math.PI) * 8 : 0;
  c.save(); c.translate(0, dy);
  c.fillStyle = used ? '#9a8a7a' : '#ffb020'; rr(c, x, y, 40, 40, 6); c.fill();
  c.strokeStyle = used ? '#6a5a4a' : '#c97a00'; c.lineWidth = 3; rr(c, x + 1.5, y + 1.5, 37, 37, 5); c.stroke();
  if (!used) { c.fillStyle = '#fff'; c.font = "700 26px Fredoka, sans-serif"; c.textAlign = 'center'; c.globalAlpha = 0.75 + 0.25 * Math.sin(t * 4); c.fillText('?', x + 20, y + 30); c.globalAlpha = 1; }
  c.restore();
}
export function drawBoost(c: C, x: number, y: number, t: number) {
  c.fillStyle = '#2a2a3a'; rr(c, x - 36, y - 6, 72, 10, 4); c.fill();
  for (let i = 0; i < 3; i++) { const a = (Math.sin(t * 10 - i) + 1) / 2; c.fillStyle = hexA('#3df2ff', 0.4 + 0.6 * a); c.beginPath(); const px = x - 22 + i * 16; c.moveTo(px, y - 5); c.lineTo(px + 10, y - 1); c.lineTo(px, y + 3); c.closePath(); c.fill(); }
}
export function drawBumper(c: C, x: number, y: number, r: number, hit: number, t: number) {
  const s = 1 + (hit > 0 ? hit * 1.2 : 0);
  const g = c.createRadialGradient(x, y, 4, x, y, r * 2); g.addColorStop(0, 'rgba(255,79,216,.45)'); g.addColorStop(1, 'rgba(255,79,216,0)'); c.fillStyle = g; circ(c, x, y, r * 2); c.fill();
  c.fillStyle = '#ff4fd8'; circ(c, x, y, r * s); c.fill();
  c.strokeStyle = '#3df2ff'; c.lineWidth = 5; circ(c, x, y, r * s - 3); c.stroke();
  c.fillStyle = '#fff'; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); circ(c, x, y, r * 0.35); c.fill(); c.globalAlpha = 1;
}
export function drawUpdraft(c: C, x: number, w: number, top: number, t: number) {
  const g = c.createLinearGradient(0, top, 0, GY); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.22)');
  c.fillStyle = g; c.fillRect(x, top, w, GY - top);
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2;
  for (let i = 0; i < 7; i++) { const px = x + 10 + (i * 37) % (w - 20), py = GY - mod(t * 260 + i * 70, GY - top); c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.sin(t * 5 + i) * 4, py - 22); c.stroke(); }
}
export function drawGoal(c: C, x: number, t: number, done: boolean) {
  c.fillStyle = '#e0e0e8'; c.fillRect(x - 3, GY - 170, 6, 170); c.fillStyle = '#ffd23d'; circ(c, x, GY - 174, 8); c.fill();
  const w = Math.sin(t * 4) * 6;
  c.fillStyle = done ? '#3ddc84' : '#ff3d6e';
  c.beginPath(); c.moveTo(x + 3, GY - 166); c.quadraticCurveTo(x + 35, GY - 172 + w, x + 70, GY - 160); c.lineTo(x + 70, GY - 122); c.quadraticCurveTo(x + 35, GY - 130 - w, x + 3, GY - 124); c.fill();
  c.fillStyle = '#fff'; c.font = "700 20px Fredoka, sans-serif"; c.textAlign = 'center'; c.fillText(done ? '✓' : '★', x + 36, GY - 136);
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, GY + 2, 22, 5, 0, 0, TAU); c.fill();
}

// ---------- power effects on the hopper ----------
export function drawPowerBack(c: C, power: string, x: number, y: number, sc: number, face: number, t: number, flying: boolean) {
  if (power === 'jetpack') {
    c.save(); c.translate(x - face * 17 * sc, y - 28 * sc); c.scale(sc, sc);
    c.fillStyle = '#7c8aa5'; rr(c, -7, -14, 14, 26, 5); c.fill(); c.fillStyle = '#ff5d5d'; rr(c, -7, -16, 14, 6, 3); c.fill();
    if (flying) { c.fillStyle = '#ffd23d'; c.beginPath(); c.moveTo(-5, 12); c.lineTo(0, 26 + Math.random() * 10); c.lineTo(5, 12); c.fill(); c.fillStyle = '#ff6a2b'; c.beginPath(); c.moveTo(-3, 12); c.lineTo(0, 20 + Math.random() * 6); c.lineTo(3, 12); c.fill(); }
    c.restore();
  }
  if (power === 'flameshield') {
    const g = c.createRadialGradient(x, y - 24 * sc, 10 * sc, x, y - 24 * sc, 44 * sc); g.addColorStop(0, 'rgba(255,140,40,0)'); g.addColorStop(0.7, `rgba(255,120,30,${0.25 + 0.1 * Math.sin(t * 10)})`); g.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = g; circ(c, x, y - 24 * sc, 44 * sc); c.fill();
  }
}
export function drawPowerFront(c: C, power: string, x: number, y: number, sc: number, t: number, gliding: boolean, charge: number, fuel: number) {
  if (power === 'glide' && gliding) {
    c.save(); c.translate(x, y - 70 * sc); c.rotate(Math.sin(t * 3) * 0.1);
    c.fillStyle = '#e0782a'; c.beginPath(); c.moveTo(-34, 6); c.quadraticCurveTo(0, -26, 34, 6); c.quadraticCurveTo(0, -6, -34, 6); c.fill();
    c.strokeStyle = '#8a4a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 24); c.stroke(); c.restore();
  }
  if (power === 'froglegs' && charge > 0) {
    c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, x - 24, y + 8, 48, 7, 3); c.fill();
    c.fillStyle = charge > 0.95 ? '#ffe14d' : '#3ddc84'; rr(c, x - 24, y + 8, 48 * charge, 7, 3); c.fill();
  }
  if (power === 'jetpack' && fuel < 0.999) {
    c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, x - 22, y - 62 * sc - 14, 44, 6, 3); c.fill();
    c.fillStyle = fuel > 0.25 ? '#ffd23d' : '#ff5d5d'; rr(c, x - 22, y - 62 * sc - 14, 44 * fuel, 6, 3); c.fill();
  }
}
