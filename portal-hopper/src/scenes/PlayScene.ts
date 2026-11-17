// Gameplay: player physics, slides, portals, collectibles, ghosts and the camera.
// The world is drawn with the code-drawn art in src/art/draw.ts onto a canvas texture.
import Phaser from 'phaser';
import { GY, LH, WORLDS, type Portal, type World, type WorldId } from '../game/worlds';
import { look, saveSoon } from '../game/save';
import { setSong, sfx } from '../game/audio';
import {
  BG, FG, TAU, FONT, view, clamp, circ, hash, rr, hexA, shade,
  drawDecor, drawSlide, drawItem, drawGhost, drawBat, drawPortal, drawPlayer, drawParticle, type Particle,
} from '../art/draw';
import { keys, ui, toast, updateHud, drawPreview } from '../ui';

interface FloatText { x: number; y: number; txt: string; life: number; big?: boolean }
interface Transition { t: number; to: WorldId; from: WorldId; color: string; swapped: boolean }

export default class PlayScene extends Phaser.Scene {
  private tex!: Phaser.Textures.CanvasTexture;
  private img!: Phaser.GameObjects.Image;
  private ctx!: CanvasRenderingContext2D;
  private scale_ = 1; // device pixels per world unit
  private touch = false;

  private W: World = WORLDS.hub;
  private P = { x: 160, y: GY, vx: 0, vy: 0, w: 34, h: 46, onG: true, slide: null as World['slides'][number] | null, face: 1, coy: 0, buf: 0, sq: 0 };
  private camX = 0;
  private trans: Transition | null = null;
  private tpCd = 0;
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private T = 0;

  constructor() { super('play'); }

  create() {
    this.tex = this.textures.createCanvas('world', 4, 4)!;
    this.ctx = this.tex.getContext();
    this.img = this.add.image(0, 0, 'world').setOrigin(0, 0);
    this.fit();
    this.scale.on('resize', () => this.fit());
    ui.onJumpPress = () => { this.P.buf = 0.12; };
    ui.onStart = () => { setSong(this.W.id); toast(this.W.title, this.W.sub); };
    updateHud(this.W);
  }

  /** Matches the prototype: the 540-unit-tall world fits the screen height (or 620 units of width). */
  private fit() {
    const w = Math.max(1, Math.round(this.scale.width)), h = Math.max(1, Math.round(this.scale.height));
    this.tex.setSize(w, h);
    this.img.setDisplaySize(w, h);
    // On touch screens keep the ground line above the on-screen buttons.
    this.touch = document.body.classList.contains('touch');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const band = this.touch ? 120 * dpr : 0;
    this.scale_ = Math.min((h - band) / LH, w / 620);
    view.w = w / this.scale_; view.h = h / this.scale_;
    view.offY = (view.h - band / this.scale_ - LH) * 0.55;
    this.camX = clamp(this.camX, 0, Math.max(0, this.W.w - view.w));
  }

  update(_time: number, deltaMs: number) {
    if (document.body.classList.contains('touch') !== this.touch) this.fit();
    const dt = Math.min(0.033, deltaMs / 1000);
    this.T += dt;
    if (ui.playing && !ui.wardOpen) this.step(dt);
    this.render(this.T);
    drawPreview(this.T);
  }

  // ---------- particles ----------
  private addP(o: Partial<Particle> & { x: number; y: number }) {
    this.particles.push({ vx: 0, vy: 0, g: 0, life: .6, max: .6, size: 3, kind: 'dot', col: '#fff', ...o });
    if (this.particles.length > 400) this.particles.shift();
  }
  private burst(x: number, y: number, cols: string[], n = 14, spd = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = spd * (.4 + Math.random() * .8);
      this.addP({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 300, life: .7, max: .7, size: 2 + Math.random() * 3, kind: 'star', col: cols[i % cols.length] });
    }
  }
  private trail() {
    const P = this.P;
    const x = P.x - P.face * 10 + (Math.random() - .5) * 10, y = P.y - 10 - Math.random() * 25;
    if (look.trail === 'sparkle') this.addP({ x, y, vy: -20, life: .6, max: .6, size: 2 + Math.random() * 2.5, kind: 'star', col: ['#fff6a8', '#ffffff', look.color][Math.floor(Math.random() * 3)] });
    else if (look.trail === 'bubbles') this.addP({ x, y, vy: -45, vx: (Math.random() - .5) * 20, life: 1, max: 1, size: 3 + Math.random() * 4, kind: 'ring', col: '#bfefff' });
    else if (look.trail === 'ghost') this.addP({ x, y, vy: -60, life: .7, max: .7, size: 4 + Math.random() * 4, kind: 'flame', col: Math.random() < .5 ? '#8cff6b' : '#c47bff' });
  }

  // ---------- teleport ----------
  private startTeleport(p: Portal) {
    let to = p.to;
    if (to === 'random') {
      const opts = (['halloween', 'space', 'ice'] as WorldId[]).filter(w => w !== this.W.id);
      to = opts[Math.floor(Math.random() * opts.length)];
    }
    this.trans = { t: 0, to, from: this.W.id, color: p.color, swapped: false };
    this.P.vx = 0; this.P.vy = 0; sfx('tp');
    this.burst(p.x, p.y - 60, [p.color, '#ffffff'], 24, 300);
  }
  private loadWorld(id: WorldId, from: WorldId) {
    const W = this.W = WORLDS[id], P = this.P;
    setSong(id);
    const back = W.portals.find(q => q.to === from);
    if (back) { P.x = back.x + (back.x > W.w / 2 ? -90 : 90); P.y = back.y; } else { P.x = W.spawn; P.y = GY; }
    P.vx = 0; P.vy = 0; P.slide = null; P.onG = true; this.particles = []; this.texts = [];
    this.camX = clamp(P.x - view.w / 2, 0, Math.max(0, W.w - view.w));
    updateHud(W); toast(W.title, W.sub);
  }

  private ghostPos(g: { x: number; y: number; ph: number }): [number, number] {
    return [g.x + Math.sin(this.T * 0.7 + g.ph) * 110, g.y + Math.sin(this.T * 2.2 + g.ph) * 16];
  }

  // ---------- simulation (numbers match the prototype) ----------
  private step(dt: number) {
    const { P } = this;
    this.tpCd -= dt;
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const tx of this.texts) { tx.y -= 40 * dt; tx.life -= dt; }
    this.texts = this.texts.filter(t => t.life > 0);
    if (this.trans) {
      const tr = this.trans;
      tr.t += dt / 0.9;
      if (tr.t >= 0.5 && !tr.swapped) { tr.swapped = true; this.loadWorld(tr.to, tr.from); }
      if (tr.t >= 1) { this.trans = null; this.tpCd = 0.8; }
      return;
    }
    const W = this.W, g = W.g, dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    if (dir) P.face = dir;
    if (P.slide) { P.vx += P.slide.k * g * 0.85 * dt + dir * 260 * dt; P.vx = clamp(P.vx, -950, 950); }
    else if (dir) P.vx += (dir * W.speed - P.vx) * Math.min(1, (P.onG ? W.fric : 4) * dt);
    else if (P.onG) P.vx -= P.vx * Math.min(1, W.fric * dt);
    else P.vx -= P.vx * Math.min(1, 1.2 * dt);
    P.coy = (P.onG || P.slide) ? 0.1 : P.coy - dt; P.buf -= dt;
    if (P.buf > 0 && P.coy > 0) {
      P.vy = -W.jump; P.buf = 0; P.coy = 0; P.onG = false; P.slide = null; P.sq = -0.22; sfx('jump');
      for (let i = 0; i < 6; i++) this.addP({ x: P.x + (Math.random() - .5) * 20, y: P.y, vx: (Math.random() - .5) * 120, vy: -Math.random() * 60, life: .4, max: .4, size: 3, col: 'rgba(255,255,255,.7)' });
    }
    if (!keys.j && P.vy < 0) P.vy += g * 1.1 * dt;
    P.vy = Math.min(P.vy + g * dt, 1300);
    const prevB = P.y, was = P.slide;
    P.x += P.vx * dt; P.y += P.vy * dt;
    if (P.x < 20) { P.x = 20; P.vx = 0; }
    if (P.x > W.w - 20) { P.x = W.w - 20; P.vx = 0; }
    P.onG = false; P.slide = null;
    const hw = P.w / 2 - 6;
    for (const p of W.plats) {
      if (P.vy >= 0 && P.x + hw > p.x && P.x - hw < p.x + p.w && prevB <= p.y + 1 && P.y >= p.y) {
        if (P.vy > 520) {
          P.sq = Math.min(.32, P.vy / 2600);
          for (let i = 0; i < 5; i++) this.addP({ x: P.x + (Math.random() - .5) * 24, y: p.y, vx: (Math.random() - .5) * 140, vy: -Math.random() * 50, life: .35, max: .35, size: 3, col: 'rgba(255,255,255,.6)' });
        }
        P.y = p.y; P.vy = 0; P.onG = true;
      }
    }
    if (!P.onG && P.vy >= 0) {
      for (const s of W.slides) {
        if (P.x < s.x1 || P.x > s.x2) continue;
        const ly = s.y1 + s.k * (P.x - s.x1);
        if ((P.y >= ly && prevB <= ly + 14) || (was === s && P.y < ly && ly - P.y < 38)) { P.y = ly; P.vy = 0; P.slide = s; break; }
      }
    }
    if (P.slide && Math.random() < 0.7) this.addP({ x: P.x - P.face * 14, y: P.y - 2, vx: -P.vx * 0.1, vy: -30 - Math.random() * 40, life: .4, max: .4, size: 2.5, kind: 'star', col: ['#ffffff', '#fff3a0', look.color][Math.floor(Math.random() * 3)] });
    P.sq *= Math.pow(0.0009, dt);
    if (look.trail !== 'none' && (Math.abs(P.vx) > 60 || !P.onG) && Math.random() < 0.55) this.trail();

    // collectibles
    const pcy = P.y - 23;
    for (const it of W.items) {
      if (it.got) continue;
      if (Math.hypot(P.x - it.x, pcy - it.y) < 34) {
        it.got = true; sfx('collect'); this.burst(it.x, it.y, ['#ffd23d', '#ffffff', '#ff5d8f', '#5ef0ff'], 16);
        this.texts.push({ x: it.x, y: it.y - 20, txt: '+1', life: .9 }); updateHud(W); saveSoon();
        if (W.items.every(i => i.got)) { sfx('win'); this.time.delayedCall(300, () => toast(`All ${W.noun} found! 🎉`)); }
      }
    }
    // ghosts
    for (const gh of W.ghosts) {
      gh.cd -= dt; const [gx, gy] = this.ghostPos(gh);
      if (gh.cd <= 0 && Math.abs(P.x - gx) < 36 && Math.abs(pcy - gy) < 40) {
        gh.cd = 1.2; const s = P.x < gx ? -1 : 1; P.vx = s * 460; P.vy = -480; P.slide = null; P.onG = false; sfx('boo');
        this.texts.push({ x: gx, y: gy - 40, txt: 'BOO!', life: 1, big: true });
      }
    }
    // portals
    if (this.tpCd <= 0) {
      for (const p of W.portals) {
        if (Math.abs(P.x - p.x) < 26 && Math.abs(pcy - (p.y - 60)) < 55) { this.startTeleport(p); break; }
      }
    }
    const target = P.x - view.w / 2 + P.vx * 0.25;
    this.camX += (target - this.camX) * Math.min(1, 6 * dt);
    this.camX = clamp(this.camX, 0, Math.max(0, W.w - view.w));
  }

  // ---------- drawing ----------
  private render(t: number) {
    const c = this.ctx, s = this.scale_, W = this.W, P = this.P, camX = this.camX, offY = view.offY;
    c.setTransform(s, 0, 0, s, 0, 0);
    BG[W.id](c, camX, t, offY);
    c.setTransform(s, 0, 0, s, -camX * s, offY * s);
    const th = W.theme, L = camX - 200, Rr = camX + view.w + 200;
    for (const d of W.decor) if (d.x > L - 200 && d.x < Rr + 200) drawDecor(c, d, t);
    if (W.bats) for (let i = 0; i < 6; i++) { const bx = 500 + i * 430 + Math.sin(t * 0.8 + i) * 90, by = 110 + Math.sin(t * 1.7 + i * 2) * 35; if (bx > L && bx < Rr) drawBat(c, bx, by, t, i); }
    c.fillStyle = th.ground; c.fillRect(L, GY, Rr - L, 700);
    c.fillStyle = th.top; c.fillRect(L, GY, Rr - L, 10);
    c.fillStyle = th.dot;
    for (let x = Math.floor(L / 60) * 60; x < Rr; x += 60) { circ(c, x + hash(x) * 30, GY + 30 + hash(x + 1) * 40, 3 + hash(x + 2) * 4); c.fill(); }
    for (const p of W.plats) { if (p.ground) continue; c.fillStyle = th.plat; rr(c, p.x, p.y, p.w, p.h, 7); c.fill(); c.fillStyle = th.platTop; rr(c, p.x, p.y, p.w, 6, 4); c.fill(); }
    for (const sl of W.slides) drawSlide(c, sl);
    for (const p of W.portals) drawPortal(c, p, t);
    for (const it of W.items) if (!it.got) drawItem(c, W.icon, it.x, it.y, t);
    for (const gh of W.ghosts) { const [gx, gy] = this.ghostPos(gh); drawGhost(c, gx, gy, t, gh.ph); }
    for (const p of this.particles) drawParticle(c, p);
    if (P.onG || P.slide) { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(P.x, P.y + 1, 18, 4, 0, 0, TAU); c.fill(); }
    drawPlayer(c, P.x, P.y, look, t, P.face, P.sq, P.onG && Math.abs(P.vx) > 40);
    c.textAlign = 'center';
    for (const tx of this.texts) {
      c.globalAlpha = Math.min(1, tx.life * 2); c.font = `700 ${tx.big ? 30 : 20}px ${FONT}`;
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.5)'; c.strokeText(tx.txt, tx.x, tx.y);
      c.fillStyle = tx.big ? '#e9e2ff' : '#fff'; c.fillText(tx.txt, tx.x, tx.y); c.globalAlpha = 1;
    }
    c.setTransform(s, 0, 0, s, 0, 0);
    FG[W.id]?.(c, camX, t, offY);
    if (this.trans) {
      const tt = this.trans.t, k = tt < 0.5 ? 1 - tt * 2 : (tt - 0.5) * 2, e = k * k * (3 - 2 * k);
      const maxR = Math.hypot(view.w, view.h), r = Math.max(0.5, maxR * e);
      const sx = P.x - camX, sy = P.y - 28 + offY;
      c.beginPath(); c.rect(0, 0, view.w, view.h); c.arc(sx, sy, r, 0, TAU);
      c.fillStyle = shade(this.trans.color, -0.7); c.fill('evenodd');
      c.strokeStyle = hexA(this.trans.color, 0.9); c.lineWidth = 6; circ(c, sx, sy, r); c.stroke();
      for (let i = 0; i < 10; i++) { const a = t * 6 + i * TAU / 10, rad = r + 14 + Math.sin(t * 10 + i) * 6; c.fillStyle = '#fff'; circ(c, sx + Math.cos(a) * rad, sy + Math.sin(a) * rad, 2.5); c.fill(); }
    }
    this.tex.refresh();
  }

}
