// Gameplay: player physics and powers, slides, springs, moving platforms, item boxes, boost pads,
// bumpers, updrafts, bad guys (knock you back, never hurt you), portals, goal flag and camera.
// The world is drawn with the code-drawn art in src/art/ onto a canvas texture.
import Phaser from 'phaser';
import { GY, LH, WORLDS, type Portal, type World } from '../game/worlds';
import type { Box, Enemy, Item, Mover, Slide } from '../game/types';
import { look, saveSoon } from '../game/save';
import { beatOffset, setSong, sfx, songBpm } from '../game/audio';
import {
  TAU, FONT, view, clamp, circ, hash, rr, hexA, shade, drawBackground, drawForeground,
  drawDecor, drawSlide, drawItem, drawBat, drawPortal, drawPlayer, drawParticle, type Particle,
} from '../art/draw';
import { drawEnemy, drawSpring, drawMover, drawBox, drawBoost, drawBumper, drawUpdraft, drawGoal, drawPowerBack, drawPowerFront } from '../art/draw2';
import { keys, ui, toast, updateHud, drawPreview } from '../ui';

interface FloatText { x: number; y: number; txt: string; life: number; big?: boolean; col?: string }
interface Transition { t: number; to: string; from: string; color: string; swapped: boolean }

const ENTRY_IDS = Object.keys(WORLDS).filter(id => id !== 'hub');
const SURFACE = -140; // Bubble Lagoon's water surface

export default class PlayScene extends Phaser.Scene {
  private tex!: Phaser.Textures.CanvasTexture;
  private img!: Phaser.GameObjects.Image;
  private ctx!: CanvasRenderingContext2D;
  private scale_ = 1; // device pixels per world unit
  private touch = false;

  private W: World = WORLDS.hub;
  private P = {
    x: 160, y: GY, vx: 0, vy: 0, w: 34, h: 46, onG: true, slide: null as Slide | null, ride: null as Mover | null,
    face: 1, coy: 0, buf: 0, sq: 0, noCut: false, airJumps: 2, dashAvail: true, dashT: 0, fuel: 1, charge: 0,
    pound: false, boost: 0, sugar: 0, gliding: false, flying: false,
  };
  private camX = 0;
  private camY = 0;
  private shake = 0;
  private trans: Transition | null = null;
  private tpCd = 0;
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private T = 0;
  private envT = 0; // time for moving things (slowed in Clockwork Tower)
  private goalHit = false;

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
    if (import.meta.env.DEV) (window as unknown as { __ph: unknown }).__ph = { scene: this, keys, ui, WORLDS };
  }

  /** The 540-unit-tall world fits the screen; on touch screens the ground stays above the buttons. */
  private fit() {
    const w = Math.max(1, Math.round(this.scale.width)), h = Math.max(1, Math.round(this.scale.height));
    this.tex.setSize(w, h);
    this.img.setDisplaySize(w, h);
    this.touch = document.body.classList.contains('touch');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let band = 0;
    if (this.touch) {
      const r = document.getElementById('bL')?.getBoundingClientRect();
      const bottom = document.getElementById('app')?.getBoundingClientRect().bottom ?? window.innerHeight;
      band = r && r.height > 0 ? Math.max(0, bottom - r.top + 6) * dpr : 140 * dpr;
    }
    const need = this.touch ? 470 : LH;
    this.scale_ = Math.min((h - band) / need, w / 620);
    view.w = w / this.scale_; view.h = h / this.scale_;
    view.offY = (view.h - LH) * 0.55;
    if (this.touch) view.offY = Math.min(view.offY, (h - band) / this.scale_ - GY - 14);
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

  // ---------- helpers ----------
  private get sc() { const p = this.W.power; return p === 'giant' ? 1.9 : p === 'tiny' ? 0.55 : 1; }
  private addP(o: Partial<Particle> & { x: number; y: number }) {
    this.particles.push({ vx: 0, vy: 0, g: 0, life: .6, max: .6, size: 3, kind: 'dot', col: '#fff', ...o });
    if (this.particles.length > 500) this.particles.shift();
  }
  private burst(x: number, y: number, cols: string[], n = 14, spd = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = spd * (.4 + Math.random() * .8);
      this.addP({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 300, life: .7, max: .7, size: 2 + Math.random() * 3, kind: 'star', col: cols[i % cols.length] });
    }
  }
  private say(x: number, y: number, txt: string, big = false, col?: string) { this.texts.push({ x, y, txt, life: big ? 1 : .9, big, col }); }
  private trail() {
    const P = this.P, sc = this.sc;
    const x = P.x - P.face * 10 * sc + (Math.random() - .5) * 10 * sc, y = P.y - (10 + Math.random() * 25) * sc;
    const tr = this.W.power === 'flameshield' ? 'fire' : look.trail;
    if (tr === 'sparkle') this.addP({ x, y, vy: -20, life: .6, max: .6, size: 2 + Math.random() * 2.5, kind: 'star', col: ['#fff6a8', '#ffffff', look.color][Math.floor(Math.random() * 3)] });
    else if (tr === 'bubbles') this.addP({ x, y, vy: -45, vx: (Math.random() - .5) * 20, life: 1, max: 1, size: 3 + Math.random() * 4, kind: 'ring', col: '#bfefff' });
    else if (tr === 'ghost') this.addP({ x, y, vy: -60, life: .7, max: .7, size: 4 + Math.random() * 4, kind: 'flame', col: Math.random() < .5 ? '#8cff6b' : '#c47bff' });
    else if (tr === 'fire') this.addP({ x, y, vy: -70, life: .5, max: .5, size: 4 + Math.random() * 5, kind: 'flame', col: Math.random() < .5 ? '#ffb020' : '#ff5a2b' });
  }

  // ---------- teleport ----------
  private startTeleport(p: Portal) {
    let to = p.to;
    if (to === 'random') { const opts = ENTRY_IDS.filter(w => w !== this.W.id); to = opts[Math.floor(Math.random() * opts.length)]; }
    this.trans = { t: 0, to, from: this.W.id, color: p.color, swapped: false };
    this.P.vx = 0; this.P.vy = 0; sfx('tp');
    this.burst(p.x, p.y - 60, [p.color, '#ffffff'], 24, 300);
  }
  private loadWorld(id: string, from: string) {
    const W = this.W = WORLDS[id], P = this.P;
    setSong(id);
    const back = W.portals.find(q => q.to === from);
    if (back) { P.x = back.x + (back.x > W.w / 2 ? -90 : 90); P.y = back.y; } else { P.x = W.spawn; P.y = GY; }
    Object.assign(P, { vx: 0, vy: 0, slide: null, ride: null, onG: true, pound: false, boost: 0, sugar: 0, dashT: 0, charge: 0, fuel: 1, noCut: false });
    this.particles = []; this.texts = []; this.goalHit = false; this.camY = 0;
    this.camX = clamp(P.x - view.w / 2, 0, Math.max(0, W.w - view.w));
    updateHud(W); toast(W.title, W.sub, 2600);
  }

  private enemyPos(e: Enemy): [number, number] { return [e.x + e.px, (e.kind === 'flyer' ? e.y : e.y - 18) + e.py]; }

  private collect(it: Item) {
    const W = this.W;
    it.got = true; sfx('collect');
    const x = it.x + (it.mx ?? 0), y = it.y + (it.my ?? 0);
    this.burst(x, y, ['#ffd23d', '#ffffff', '#ff5d8f', '#5ef0ff'], 16);
    this.say(x, y - 20, '+1'); updateHud(W); saveSoon();
    if (W.power === 'sugar') { if (this.P.sugar <= 0) this.say(this.P.x, this.P.y - 70, 'SUGAR RUSH!', false, '#ff5d8f'); this.P.sugar = 2.2; }
    if (W.items.every(i => i.got)) { sfx('win'); this.time.delayedCall(300, () => toast(`All ${W.noun} found! 🎉`)); }
  }
  private hitBox(b: Box) {
    b.hit = 0.25;
    if (b.used) { sfx('bonk'); return; }
    b.used = true; sfx('box');
    const idx = this.W.boxes.indexOf(b);
    const it = this.W.items.find(i => i.box === idx);
    if (it && !it.got) this.collect(it);
    else this.burst(b.x + 20, b.y - 10, ['#ffd23d', '#ffffff'], 10, 160);
  }

  // ---------- simulation ----------
  private step(dt: number) {
    const { P } = this;
    this.tpCd -= dt;
    this.shake = Math.max(0, this.shake - dt);
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
    const W = this.W, pw = W.power, sc = this.sc;
    const edt = pw === 'slowmo' ? dt * 0.35 : dt;
    this.envT += edt;

    // moving platforms carry whoever stands on them
    for (const m of W.movers) {
      const nx = m.bx + Math.sin(this.envT * m.sp + m.ph) * m.ax, ny = m.by + Math.sin(this.envT * m.sp + m.ph) * m.ay;
      m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
    }
    if (P.ride) { P.x += P.ride.dx; P.y += P.ride.dy; }
    for (const s of W.springs) s.t = Math.max(0, s.t - dt);
    for (const b of W.boxes) b.hit = Math.max(0, b.hit - dt);
    for (const b of W.bumpers) b.t = Math.max(0, b.t - dt);

    // ----- run -----
    const g = W.g, dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    if (dir) P.face = dir;
    P.sugar -= dt; P.boost -= dt; P.dashT -= dt;
    const speed = W.speed * (P.sugar > 0 ? 1.8 : 1) * (pw === 'tiny' ? 1.1 : 1);
    const slideCap = pw === 'speed' ? 1500 : 950;
    if (P.slide) { P.vx += P.slide.k * g * 0.85 * dt + dir * 260 * dt; P.vx = clamp(P.vx, -slideCap, slideCap); }
    else if (P.dashT > 0) { /* keep dash speed */ }
    else if (dir) P.vx += (dir * speed - P.vx) * Math.min(1, (P.onG ? W.fric : 4) * dt);
    else if (P.onG) P.vx -= P.vx * Math.min(1, W.fric * dt);
    else P.vx -= P.vx * Math.min(1, (pw === 'swim' ? 2 : 1.2) * dt);
    if (P.boost > 0) P.vx = Math.max(P.vx, 380 + 520 * (P.boost / 0.7));
    if (pw === 'swim') P.vx = clamp(P.vx, -speed * 1.3, speed * 1.3);

    // ----- jump and powers -----
    const jumpV = W.jump * (pw === 'springshoes' ? 1.45 : pw === 'tiny' ? 1.2 : 1);
    const grounded = P.onG || !!P.slide;
    P.coy = grounded ? 0.1 : P.coy - dt; P.buf -= dt;
    if (grounded) { P.airJumps = 2; P.dashAvail = true; P.fuel = Math.min(1, P.fuel + dt * 1.6); }
    const doJump = (v: number) => {
      P.vy = -v; P.buf = 0; P.coy = 0; P.onG = false; P.slide = null; P.ride = null; P.sq = -0.22; sfx('jump');
      for (let i = 0; i < 6; i++) this.addP({ x: P.x + (Math.random() - .5) * 20 * sc, y: P.y, vx: (Math.random() - .5) * 120, vy: -Math.random() * 60, life: .4, max: .4, size: 3, col: 'rgba(255,255,255,.7)' });
    };
    if (pw === 'froglegs') {
      if (grounded && keys.j) { P.charge = Math.min(1, P.charge + dt * 1.4); P.sq = 0.18 * P.charge; }
      else if (grounded && P.charge > 0) { const c = P.charge; P.charge = 0; doJump(jumpV * (0.7 + 0.85 * c)); P.noCut = true; if (c > 0.95) { this.say(P.x, P.y - 70 * sc, 'MEGA LEAP!', false, '#3ddc84'); } }
      else if (!grounded) P.charge = 0;
      P.buf = 0;
    } else if (pw === 'swim') {
      if (P.buf > 0) {
        P.vy = Math.min(P.vy, -W.jump); P.buf = 0; P.onG = false; P.slide = null; P.ride = null; sfx('puff');
        for (let i = 0; i < 4; i++) this.addP({ x: P.x + (Math.random() - .5) * 16, y: P.y - 10, vy: -40 - Math.random() * 40, life: 1, max: 1, size: 2 + Math.random() * 3, kind: 'ring', col: '#dff8ff' });
      }
    } else if (P.buf > 0 && P.coy > 0) {
      let v = jumpV;
      if (pw === 'beat') {
        const off = beatOffset() ?? (((this.T * songBpm() / 60) % 1) + 1) % 1 * (60 / songBpm());
        const beatLen = 60 / songBpm(), d = Math.min(Math.abs(off), Math.abs(beatLen - Math.abs(off)));
        if (d < 0.13) { v *= 1.6; this.say(P.x, P.y - 70, 'PERFECT!', true, '#3df2ff'); sfx('perfect'); this.burst(P.x, P.y - 10, ['#3df2ff', '#ff4fd8', '#ffe14d'], 18, 260); }
      }
      doJump(v);
      if (v > jumpV) P.noCut = true;
    } else if (P.buf > 0 && !grounded) {
      if (pw === 'triple' && P.airJumps > 0) {
        P.airJumps--; P.vy = -jumpV * 0.9; P.buf = 0; P.noCut = false; sfx('jump');
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; this.addP({ x: P.x, y: P.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 40, life: .4, max: .4, size: 3, kind: 'ring', col: '#ffffff' }); }
      } else if (pw === 'airdash' && P.dashAvail) {
        P.dashAvail = false; P.dashT = 0.24; P.vx = P.face * 950; P.vy = -40; P.buf = 0; sfx('dash');
      } else if (pw === 'groundpound' && !P.pound) {
        P.pound = true; P.vy = 1500; P.vx *= 0.2; P.buf = 0; sfx('dash');
      }
    }

    // ----- gravity -----
    P.flying = false; P.gliding = false;
    if (pw === 'jetpack' && keys.j && !grounded && P.fuel > 0) {
      P.flying = true; P.fuel = Math.max(0, P.fuel - dt * 0.75);
      if (P.vy > -480) P.vy -= 3000 * dt;
      if (Math.random() < 0.8) this.addP({ x: P.x - P.face * 17 * sc, y: P.y - 6 * sc, vx: (Math.random() - .5) * 40, vy: 160 + Math.random() * 80, life: .35, max: .35, size: 4, kind: 'flame', col: Math.random() < .5 ? '#ffd23d' : '#ff6a2b' });
    }
    if (!keys.j && P.vy < 0 && !P.noCut && pw !== 'swim') P.vy += g * 1.1 * dt;
    const maxFall = pw === 'swim' ? 240 : P.pound ? 1500 : 1300;
    if (P.dashT > 0) P.vy = Math.min(P.vy, 0) * 0.9;
    else P.vy = Math.min(P.vy + g * dt, maxFall);
    if (pw === 'glide' && keys.j && P.vy > 90 && !grounded) { P.vy = 90; P.gliding = true; }
    if (P.vy >= 0) P.noCut = false;
    for (const u of W.updrafts) {
      if (P.x > u.x && P.x < u.x + u.w && P.y > u.top) { P.vy = Math.max(P.vy - 3200 * dt, -560); P.noCut = true; P.onG = false; }
    }

    // ----- move and collide -----
    const prevB = P.y, was = P.slide;
    const windX = pw === 'wind' ? (grounded ? 70 : 150) * dt : 0;
    P.x += P.vx * dt + windX; P.y += P.vy * dt;
    if (P.x < 20) { P.x = 20; P.vx = Math.max(0, P.vx); }
    if (P.x > W.w - 20) { P.x = W.w - 20; P.vx = Math.min(0, P.vx); }
    // water surface in Bubble Lagoon, and a sky ceiling everywhere else
    const ceil = pw === 'swim' ? SURFACE : -700;
    if (P.y - P.h * sc < ceil) { P.y = ceil + P.h * sc; if (P.vy < 0) P.vy = 0; }
    const wasAir = !P.onG && !was;
    P.onG = false; P.slide = null; P.ride = null;
    const hw = (P.w / 2 - 6) * sc, headH = P.h * sc;
    let launched = false;
    // springs
    for (const s of W.springs) {
      if (P.vy >= 0 && Math.abs(P.x - s.x) < 22 + hw && prevB <= s.y - 8 && P.y >= s.y - 18) {
        P.y = s.y - 18; P.vy = -W.jump * 1.5; P.noCut = true; s.t = 0.5; launched = true; P.pound = false; P.airJumps = 2; P.dashAvail = true; sfx('boing');
        break;
      }
    }
    let impact = 0;
    const land = (y: number) => { impact = Math.max(impact, P.vy); P.y = y; P.vy = 0; P.onG = true; };
    if (!launched) {
      for (const p of W.plats) if (P.vy >= 0 && P.x + hw > p.x && P.x - hw < p.x + p.w && prevB <= p.y + 1 && P.y >= p.y) land(p.y);
      for (const b of W.boxes) if (P.vy >= 0 && P.x + hw > b.x && P.x - hw < b.x + 40 && prevB <= b.y + 1 && P.y >= b.y) { if (P.pound) this.hitBox(b); land(b.y); }
      for (const m of W.movers) if (P.vy >= 0 && P.x + hw > m.x && P.x - hw < m.x + m.w && prevB <= m.y - m.dy + 2 && P.y >= m.y) { land(m.y); P.ride = m; }
      // bump item boxes from below
      if (P.vy < 0) for (const b of W.boxes) {
        if (P.x + hw > b.x && P.x - hw < b.x + 40 && prevB - headH >= b.y + 39 && P.y - headH < b.y + 40) { P.y = b.y + 40 + headH; P.vy = 80; this.hitBox(b); break; }
      }
    }
    if (P.onG) {
      if (impact > 520) {
        P.sq = Math.min(.32, impact / 2600);
        for (let i = 0; i < 5; i++) this.addP({ x: P.x + (Math.random() - .5) * 24 * sc, y: P.y, vx: (Math.random() - .5) * 140, vy: -Math.random() * 50, life: .35, max: .35, size: 3, col: 'rgba(255,255,255,.6)' });
      }
      if (P.pound) {
        P.pound = false; P.vy = -300; P.onG = false; this.shake = 0.3; sfx('pound');
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; this.addP({ x: P.x, y: P.y - 4, vx: Math.cos(a) * 320, vy: Math.sin(a) * 80, life: .5, max: .5, size: 4, kind: 'ring', col: '#ffffff' }); }
        for (const e of W.enemies) { const [ex, ey] = this.enemyPos(e); if (Math.abs(ex - P.x) < 260 && Math.abs(ey - P.y) < 140 && e.punt <= 0) { e.dizzy = 2.4; this.say(ex, ey - 30, 'WHOA!'); } }
      } else if (pw === 'pogo' && wasAir) {
        P.vy = -(jumpV * 0.62 + (keys.j ? jumpV * 0.5 : 0)); P.onG = false; P.noCut = true; P.ride = null; sfx('boing');
      }
    }
    if (!P.onG && P.vy >= 0 && !launched) {
      for (const s of W.slides) {
        if (P.x < s.x1 || P.x > s.x2) continue;
        const ly = s.y1 + s.k * (P.x - s.x1);
        if ((P.y >= ly && prevB <= ly + 14) || (was === s && P.y < ly && ly - P.y < 38)) { P.y = ly; P.vy = 0; P.slide = s; P.pound = false; break; }
      }
    }
    // bumpers
    for (const b of W.bumpers) {
      const dx = P.x - b.x, dy = P.y - 23 * sc - b.y, d = Math.hypot(dx, dy);
      if (d < b.r + 18 * sc && d > 0) {
        const k = pw === 'bumper' ? 900 : 650;
        P.vx = dx / d * k; P.vy = dy / d * k - 160; P.noCut = true; P.slide = null; P.onG = false; P.pound = false;
        P.x = b.x + dx / d * (b.r + 19 * sc); b.t = 0.25; sfx('boing'); this.burst(b.x, b.y, ['#ff4fd8', '#3df2ff'], 8, 200);
      }
    }
    for (const b of W.boosts) if (P.onG && Math.abs(P.x - b.x) < 36) { if (P.boost <= 0.2) { sfx('dash'); this.say(P.x, P.y - 60 * sc, 'ZOOM!', false, '#3df2ff'); } P.boost = 0.7; }
    if (P.slide && Math.random() < 0.7) this.addP({ x: P.x - P.face * 14, y: P.y - 2, vx: -P.vx * 0.1, vy: -30 - Math.random() * 40, life: .4, max: .4, size: 2.5, kind: 'star', col: ['#ffffff', '#fff3a0', look.color][Math.floor(Math.random() * 3)] });
    if ((P.boost > 0 || P.sugar > 0 || P.dashT > 0) && Math.random() < 0.8) this.addP({ x: P.x - P.face * 16, y: P.y - Math.random() * 40 * sc, vx: -P.vx * 0.2, life: .3, max: .3, size: 3, kind: 'star', col: P.sugar > 0 ? '#ff8fc7' : '#3df2ff' });
    P.sq *= Math.pow(0.0009, dt);
    if ((look.trail !== 'none' || pw === 'flameshield') && (Math.abs(P.vx) > 60 || !P.onG) && Math.random() < 0.55) this.trail();

    // ----- collectibles -----
    const pcy = P.y - 23 * sc, grab = 34 * Math.max(1, sc * 0.8);
    for (const it of W.items) {
      if (it.got || (it.box !== undefined && !W.boxes[it.box].used)) continue;
      let ix = it.x + (it.mx ?? 0), iy = it.y + (it.my ?? 0);
      if (pw === 'magnet') {
        const d = Math.hypot(P.x - ix, pcy - iy);
        if (d < 300) { const k = Math.min(1, (1 - d / 300) * 10 * dt + 2 * dt); it.mx = (it.mx ?? 0) + (P.x - ix) * k; it.my = (it.my ?? 0) + (pcy - iy) * k; ix = it.x + it.mx; iy = it.y + it.my; }
      }
      if (Math.hypot(P.x - ix, pcy - iy) < grab) this.collect(it);
    }

    // ----- bad guys: they bonk you back, never hurt you -----
    for (const e of W.enemies) {
      if (e.punt > 0) {
        e.punt -= dt; e.px += e.pvx * dt; e.py += e.pvy * dt; e.pvy += 1400 * dt;
        if (e.punt <= 0) { e.px = 0; e.py = 0; e.dizzy = 0.8; const [ex, ey] = this.enemyPos(e); this.burst(ex, ey, ['#ffffff'], 8, 120); }
        continue;
      }
      e.cd -= dt; e.dizzy -= dt;
      if (e.dizzy <= 0) {
        if (e.kind === 'walker') {
          e.x += e.dir * e.sp * edt;
          if (e.x < e.x0) { e.x = e.x0; e.dir = 1; } if (e.x > e.x1) { e.x = e.x1; e.dir = -1; }
        } else if (e.kind === 'hopper') {
          e.hopT -= edt;
          if (e.vy === 0 && e.hopT <= 0) { e.vy = -560; e.hopT = 1 + hash(e.x) * 1.2; }
          if (e.vy !== 0 || e.y < e.by) {
            e.x += e.dir * e.sp * edt; e.vy += 1800 * edt; e.y += e.vy * edt;
            if (e.y >= e.by) { e.y = e.by; e.vy = 0; }
          }
          if (e.x < e.x0) { e.x = e.x0; e.dir = 1; } if (e.x > e.x1) { e.x = e.x1; e.dir = -1; }
        } else {
          e.x = e.bx + Math.sin(this.envT * e.sp + e.ph) * e.ax; e.y = e.by + Math.sin(this.envT * e.spy + e.ph) * e.ay;
        }
      }
      if (e.dizzy > 0 || e.cd > 0 || pw === 'ghostmode') continue;
      const [ex, ey] = this.enemyPos(e);
      if (Math.abs(P.x - ex) < 14 * sc + 18 && Math.abs(pcy - ey) < 23 * sc + 18) {
        const stomp = P.vy > 0 && prevB <= ey - 2;
        if (stomp || P.pound) {
          e.dizzy = P.pound ? 2.4 : 1.6; P.pound = false;
          P.vy = -W.jump * (keys.j ? 0.95 : 0.7) * (pw === 'bumper' ? 1.5 : 1); P.noCut = true; P.onG = false; P.slide = null;
          sfx('stomp'); this.burst(ex, ey - 10, ['#ffe14d', '#ffffff'], 10, 180); this.say(ex, ey - 34, pw === 'bumper' ? 'BOING!' : 'BOP!');
        } else if (pw === 'giant' || pw === 'flameshield' || P.boost > 0 || P.dashT > 0 || P.sugar > 0) {
          const s = P.x < ex ? 1 : -1;
          e.punt = 2.2; e.pvx = s * 520; e.pvy = -640; sfx('bonk'); this.say(ex, ey - 30, 'POW!', true, '#ffe14d'); this.shake = 0.12;
        } else {
          const s = P.x < ex ? -1 : 1;
          P.vx = s * 460; P.vy = -420; P.slide = null; P.onG = false; P.ride = null; P.pound = false; P.noCut = true; e.cd = 1;
          sfx(e.art === 'ghost' ? 'boo' : 'bonk'); this.say(ex, ey - 40, e.art === 'ghost' ? 'BOO!' : 'BONK!', true);
        }
      }
    }

    // ----- goal flag -----
    if (W.goal > 0 && !this.goalHit && P.x >= W.goal) {
      this.goalHit = true; sfx('win');
      for (let i = 0; i < 3; i++) this.burst(W.goal + 30, GY - 150 + i * 30, ['#ff5d8f', '#ffd23d', '#3df2ff', '#7bffb0'], 22, 380);
      const got = W.items.filter(i => i.got).length;
      if (!W.done) { W.done = true; saveSoon(); toast('Level complete! 🎉', `${got}/${W.items.length} ${W.noun} found · portals ahead`, 3000); }
      else toast('Made it again! 🎉', `${got}/${W.items.length} ${W.noun} found`, 2400);
      updateHud(W);
    }

    // ----- portals -----
    if (this.tpCd <= 0) {
      for (const p of W.portals) {
        if (Math.abs(P.x - p.x) < 26 && Math.abs(pcy - (p.y - 60)) < 55) { this.startTeleport(p); break; }
      }
    }

    // ----- camera -----
    const target = P.x - view.w / 2 + P.vx * 0.25;
    this.camX += (target - this.camX) * Math.min(1, 6 * dt);
    this.camX = clamp(this.camX, 0, Math.max(0, W.w - view.w));
    const ty = Math.min(0, P.y - 46 * sc + view.offY - view.h * 0.3);
    this.camY += (ty - this.camY) * Math.min(1, 5 * dt);
  }

  // ---------- drawing ----------
  private render(t: number) {
    const c = this.ctx, s = this.scale_, W = this.W, P = this.P, camX = this.camX, offY = view.offY, sc = this.sc, et = this.envT;
    const sx = this.shake > 0 ? (Math.random() - .5) * 12 * s : 0, sy = this.shake > 0 ? (Math.random() - .5) * 12 * s : 0;
    c.setTransform(s, 0, 0, s, 0, 0);
    drawBackground(c, W.id, W.theme, camX, t, offY - this.camY * 0.3);
    c.setTransform(s, 0, 0, s, -camX * s + sx, (offY - this.camY) * s + sy);
    const th = W.theme, L = camX - 200, Rr = camX + view.w + 200, vis = (x: number, pad = 0) => x > L - pad && x < Rr + pad;
    for (const d of W.decor) if (vis(d.x, 200)) drawDecor(c, d, t, th.accent);
    if (W.bats) for (let i = 0; i < 26; i++) { const bx = 500 + i * 530 + Math.sin(t * 0.8 + i) * 90, by = 110 + Math.sin(t * 1.7 + i * 2) * 35; if (vis(bx)) drawBat(c, bx, by, t, i); }
    for (const u of W.updrafts) if (vis(u.x, u.w)) drawUpdraft(c, u.x, u.w, u.top, t);
    if (W.power === 'swim') {
      c.fillStyle = 'rgba(180,240,255,.35)'; c.beginPath(); c.moveTo(L, SURFACE - 400);
      for (let x = L; x <= Rr; x += 20) c.lineTo(x, SURFACE + Math.sin(x * 0.03 + t * 2) * 5);
      c.lineTo(Rr, SURFACE - 400); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath();
      for (let x = L; x <= Rr; x += 20) c.lineTo(x, SURFACE + Math.sin(x * 0.03 + t * 2) * 5);
      c.stroke();
    }
    // ground (flashes with the beat in the Disco Dome)
    let top = th.top;
    if (W.power === 'beat') { const off = beatOffset(); if (off !== null && Math.abs(off) < 0.09) top = '#ffffff'; }
    c.fillStyle = th.ground; c.fillRect(L, GY, Rr - L, 900);
    c.fillStyle = top; c.fillRect(L, GY, Rr - L, 10);
    c.fillStyle = th.dot;
    for (let x = Math.floor(L / 60) * 60; x < Rr; x += 60) { circ(c, x + hash(x) * 30, GY + 30 + hash(x + 1) * 40, 3 + hash(x + 2) * 4); c.fill(); }
    for (const p of W.plats) { if (p.ground || !vis(p.x, p.w)) continue; c.fillStyle = th.plat; rr(c, p.x, p.y, p.w, p.h, 7); c.fill(); c.fillStyle = W.power === 'beat' ? top === '#ffffff' ? '#ffffff' : th.platTop : th.platTop; rr(c, p.x, p.y, p.w, 6, 4); c.fill(); }
    for (const sl of W.slides) if (sl.x2 > L && sl.x1 < Rr) drawSlide(c, sl);
    for (const m of W.movers) if (vis(m.x, m.w)) drawMover(c, m.x, m.y, m.w, th);
    for (const b of W.boosts) if (vis(b.x)) drawBoost(c, b.x, b.y, t);
    for (const sp of W.springs) if (vis(sp.x)) drawSpring(c, sp.x, sp.y, sp.t);
    for (const b of W.boxes) if (vis(b.x)) drawBox(c, b.x, b.y, b.used, b.hit, t);
    for (const b of W.bumpers) if (vis(b.x)) drawBumper(c, b.x, b.y, b.r, b.t, t);
    if (W.goal > 0 && vis(W.goal, 100)) drawGoal(c, W.goal, t, W.done);
    for (const p of W.portals) {
      if (!vis(p.x, 120)) continue;
      const done = WORLDS[p.to]?.done && W.id === 'hub';
      drawPortal(c, done ? { ...p, label: p.label + ' ✓' } : p, t);
    }
    for (const it of W.items) {
      if (it.got || (it.box !== undefined && !W.boxes[it.box].used)) continue;
      const ix = it.x + (it.mx ?? 0); if (vis(ix)) drawItem(c, W.icon, ix, it.y + (it.my ?? 0), t);
    }
    for (const e of W.enemies) { const [ex, ey] = this.enemyPos(e); if (vis(ex)) drawEnemy(c, e, et, ex, e.kind === 'flyer' ? ey : ey + 18); }
    for (const p of this.particles) drawParticle(c, p);
    // hopper
    if (P.onG || P.slide) { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(P.x, P.y + 1, 18 * sc, 4 * sc, 0, 0, TAU); c.fill(); }
    if (W.power === 'ghostmode') c.globalAlpha = 0.55 + 0.1 * Math.sin(t * 4);
    drawPowerBack(c, W.power, P.x, P.y, sc, P.face, t, P.flying);
    c.save(); c.translate(P.x, P.y); c.scale(sc, sc);
    if (P.pound) c.rotate(P.face * Math.min(1, (this.T * 20) % TAU));
    drawPlayer(c, 0, 0, look, t, P.face, P.sq, P.onG && Math.abs(P.vx) > 40);
    c.restore();
    c.globalAlpha = 1;
    drawPowerFront(c, W.power, P.x, P.y, sc, t, P.gliding, P.charge, P.fuel);
    c.textAlign = 'center';
    for (const tx of this.texts) {
      c.globalAlpha = Math.min(1, tx.life * 2); c.font = `700 ${tx.big ? 30 : 20}px ${FONT}`;
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.5)'; c.strokeText(tx.txt, tx.x, tx.y);
      c.fillStyle = tx.col ?? (tx.big ? '#e9e2ff' : '#fff'); c.fillText(tx.txt, tx.x, tx.y); c.globalAlpha = 1;
    }
    c.setTransform(s, 0, 0, s, 0, 0);
    drawForeground(c, W.id, W.theme.fg, camX, t, offY - this.camY);
    if (this.trans) {
      const tt = this.trans.t, k = tt < 0.5 ? 1 - tt * 2 : (tt - 0.5) * 2, e = k * k * (3 - 2 * k);
      const maxR = Math.hypot(view.w, view.h), r = Math.max(0.5, maxR * e);
      const px = P.x - camX, py = P.y - 28 + offY - this.camY;
      c.beginPath(); c.rect(0, 0, view.w, view.h); c.arc(px, py, r, 0, TAU);
      c.fillStyle = shade(this.trans.color, -0.7); c.fill('evenodd');
      c.strokeStyle = hexA(this.trans.color, 0.9); c.lineWidth = 6; circ(c, px, py, r); c.stroke();
      for (let i = 0; i < 10; i++) { const a = t * 6 + i * TAU / 10, rad = r + 14 + Math.sin(t * 10 + i) * 6; c.fillStyle = '#fff'; circ(c, px + Math.cos(a) * rad, py + Math.sin(a) * rad, 2.5); c.fill(); }
    }
    this.tex.refresh();
  }
}
