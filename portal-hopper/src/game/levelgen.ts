// Builds each world's layout from a library of level sections. A fixed seed per world keeps every
// layout identical between loads, so saved collectibles (stored by index) stay valid.
import { GY, type Box, type Decor, type Enemy, type EnemyArt, type Item, type Plat, type Portal, type SegKind, type Slide, type SlideStyle, type World, type WorldDef } from './types';
import { DEFS, ORDER } from './defs';

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

class Builder {
  plats: Plat[] = [];
  slides: Slide[] = [];
  items: Item[] = [];
  decor: Decor[] = [];
  springs: World['springs'] = [];
  movers: World['movers'] = [];
  boxes: Box[] = [];
  boosts: World['boosts'] = [];
  bumpers: World['bumpers'] = [];
  updrafts: World['updrafts'] = [];
  enemies: Enemy[] = [];
  portals: Portal[] = [];
  r: () => number;
  constructor(public def: WorldDef, seed = def.id) { this.r = mulberry32(hashStr(seed)); }
  rnd(a: number, b: number) { return a + this.r() * (b - a); }
  int(a: number, b: number) { return Math.floor(this.rnd(a, b + 1)); }
  pick<T>(a: T[]): T { return a[Math.floor(this.r() * a.length)]; }
  plat(x: number, y: number, w: number) { this.plats.push({ x, y, w, h: 18 }); }
  item(x: number, y: number, box?: number) { this.items.push({ x, y, got: false, box }); }
  line(x1: number, y1: number, x2: number, y2: number, n: number) {
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); this.item(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); }
  }
  arc(x1: number, x2: number, y0: number, peak: number, n: number) {
    for (let i = 0; i < n; i++) { const t = i / (n - 1); this.item(x1 + (x2 - x1) * t, y0 - peak * 4 * t * (1 - t)); }
  }
  slide(x1: number, y1: number, x2: number, y2: number) {
    const th = this.def.theme;
    const style: SlideStyle = th.slide;
    this.slides.push({ x1, y1, x2, y2, style, k: (y2 - y1) / (x2 - x1), cols: th.slideCols });
  }
  spring(x: number, y = GY) { this.springs.push({ x, y, t: 0 }); }
  box(x: number, y: number, withItem: boolean) {
    this.boxes.push({ x, y, hit: 0, used: false });
    if (withItem) this.item(x + 20, y - 30, this.boxes.length - 1);
  }
  enemy(kind: Enemy['kind'], art: EnemyArt, col: string, x: number, y: number, o: Partial<Enemy> = {}): Enemy {
    const e: Enemy = { kind, art, col, x, y, bx: x, by: y, x0: x, x1: x, dir: this.r() < .5 ? -1 : 1, sp: 60, ax: 0, ay: 0, spy: 1, ph: this.rnd(0, 6), cd: 0, dizzy: 0, vy: 0, hopT: this.rnd(0.3, 1.5), punt: 0, px: 0, py: 0, pvx: 0, pvy: 0, ...o };
    this.enemies.push(e);
    return e;
  }
  walker(x0: number, x1: number, y = GY) {
    const d = this.def.walker; if (!d) return;
    this.enemy('walker', d.art, d.col, this.rnd(x0, x1), y, { x0, x1, sp: this.rnd(55, 95) });
  }
  flyer(x: number, y: number, ax = 110, ay = 22) {
    const d = this.def.flyer; if (!d) return;
    this.enemy('flyer', d.art, d.col, x, y, { ax, ay, sp: this.rnd(0.6, 1.0), spy: this.rnd(1.6, 2.4) });
  }
  hopper(x0: number, x1: number) {
    const d = this.def.hopper ?? this.def.walker; if (!d) return;
    this.enemy('hopper', d.art, d.col, this.rnd(x0, x1), GY, { x0, x1, sp: this.rnd(90, 130) });
  }
  decorAt(x: number) { if (this.def.decorKinds.length) this.decor.push({ t: this.pick(this.def.decorKinds), x }); }
  /** Height and horizontal range of a spring launch in this world. */
  springArc() {
    const v = this.def.jump * 1.5, g = this.def.g;
    const h = Math.min(380, (v * v) / (2 * g));
    const range = Math.min(520, 2 * (v / g) * this.def.speed * 0.9);
    return { h, range };
  }
}

type Seg = (b: Builder, x: number) => number;

const SEGS: Record<SegKind | 'slide', Seg> = {
  stairs(b, x) {
    const n = b.int(3, 5);
    let px = x, py = GY;
    for (let i = 0; i < n; i++) { px = x + i * 115; py = GY - 62 * (i + 1); b.plat(px, py, 95); b.item(px + 47, py - 32); }
    b.item(px + 47, py - 105);
    if (b.r() < 0.4) b.walker(x + 20, x + n * 115);
    return x + n * 115 + 110;
  },
  slide(b, x) {
    const n = b.int(3, 5);
    let px = x, py = GY;
    for (let i = 0; i < n; i++) { px = x + i * 100; py = GY - 62 * (i + 1); b.plat(px, py, i === n - 1 ? 130 : 90); if (i % 2 === 1) b.item(px + 45, py - 32); }
    const sx1 = px + 130, len = b.rnd(380, 640) + n * 50;
    b.slide(sx1, py, sx1 + len, GY);
    for (let t = 0.12; t < 0.95; t += 0.16) b.item(sx1 + len * t, py + (GY - py) * t - 36);
    return sx1 + len + 120;
  },
  arc(b, x) {
    b.spring(x + 40);
    const { h, range } = b.springArc();
    b.arc(x + 70, x + 40 + range, GY - 40, h - 20, 7);
    return x + 60 + range + 80;
  },
  patrol(b, x) {
    const w = b.rnd(520, 720);
    b.walker(x + 60, x + w - 60);
    if (b.r() < 0.5) b.walker(x + 60, x + w - 60);
    b.line(x + w * 0.3, GY - 110, x + w * 0.7, GY - 110, 3);
    if (b.r() < 0.6) { const px = x + w / 2 - 80; b.plat(px, GY - 150, 160); b.line(px + 30, GY - 185, px + 130, GY - 185, 2); }
    return x + w;
  },
  flyers(b, x) {
    b.flyer(x + 180, GY - 110); b.flyer(x + 430, GY - 175, 90, 30);
    b.line(x + 60, GY - 30, x + 540, GY - 30, 5);
    b.item(x + 300, GY - 250);
    return x + 600;
  },
  movers(b, x) {
    b.movers.push({ bx: x + 260, by: GY - 150, x: x + 260, y: GY - 150, w: 110, ax: 140, ay: 0, sp: 1.1, ph: b.rnd(0, 6), dx: 0, dy: 0 });
    b.line(x + 140, GY - 190, x + 380, GY - 190, 4);
    b.movers.push({ bx: x + 560, by: GY - 200, x: x + 560, y: GY - 200, w: 100, ax: 0, ay: 110, sp: 1.0, ph: b.rnd(0, 6), dx: 0, dy: 0 });
    b.plat(x + 650, GY - 330, 150); b.line(x + 680, GY - 365, x + 770, GY - 365, 3);
    return x + 860;
  },
  boxes(b, x) {
    const n = b.int(3, 5), bx0 = x + 80;
    for (let i = 0; i < n; i++) b.box(bx0 + i * 40, GY - 140, i % 2 === 0);
    b.item(bx0 + n * 20, GY - 210);
    if (b.r() < 0.5) b.walker(x + 20, bx0 + n * 40 + 100);
    return bx0 + n * 40 + 150;
  },
  boost(b, x) {
    b.boosts.push({ x: x + 40, y: GY });
    b.line(x + 150, GY - 34, x + 710, GY - 34, 8);
    return x + 780;
  },
  hoppers(b, x) {
    b.hopper(x + 100, x + 300); b.hopper(x + 380, x + 560);
    b.line(x + 120, GY - 200, x + 540, GY - 200, 4);
    return x + 640;
  },
  bumpers(b, x) {
    const pts: [number, number][] = [[120, 150], [300, 240], [480, 150]];
    for (const [dx, dy] of pts) b.bumpers.push({ x: x + dx, y: GY - dy, r: 30, t: 0 });
    b.item(x + 210, GY - 250); b.item(x + 390, GY - 250); b.item(x + 300, GY - 340);
    b.line(x + 80, GY - 30, x + 520, GY - 30, 4);
    return x + 620;
  },
  updraft(b, x) {
    b.updrafts.push({ x: x + 80, w: 100, top: GY - 430 });
    b.plat(x + 210, GY - 360, 160); b.plat(x + 420, GY - 270, 140);
    b.line(x + 130, GY - 140, x + 130, GY - 360, 3);
    b.line(x + 240, GY - 395, x + 340, GY - 395, 2); b.line(x + 450, GY - 305, x + 530, GY - 305, 2);
    return x + 620;
  },
  high(b, x) {
    const steps: [number, number][] = [[80, 190], [260, 270], [440, 350], [620, 270]];
    for (const [dx, dy] of steps) { b.plat(x + dx, GY - dy, 120); b.line(x + dx + 30, GY - dy - 35, x + dx + 90, GY - dy - 35, 2); }
    b.line(x + 120, GY - 30, x + 680, GY - 30, 3);
    return x + 800;
  },
  springs(b, x) {
    b.spring(x + 40);
    const { h } = b.springArc();
    const py = GY - Math.min(300, h - 30);
    b.plat(x + 150, py, 150); b.line(x + 175, py - 35, x + 275, py - 35, 3);
    b.spring(x + 230, py);
    b.arc(x + 250, x + 470, py - 40, Math.min(300, h - 40), 5);
    return x + 560;
  },
  treats(b, x) {
    b.plat(x + 100, GY - 80, 200);
    const cx = x + 200;
    for (const [dx, dy] of [[-60, 0], [0, -50], [60, 0], [0, 50], [-30, -25], [30, -25]] as [number, number][]) b.item(cx + dx, GY - 180 + dy);
    return x + 380;
  },
};

const DEFAULT_W: Record<SegKind, number> = {
  stairs: 2, arc: 2, patrol: 3, flyers: 2, movers: 1.5, boxes: 2, boost: 1, hoppers: 0.7, bumpers: 0.5, updraft: 0.5, high: 0.7, springs: 1.5, treats: 1.5,
};
const ENEMY_SEGS: SegKind[] = ['patrol', 'flyers', 'hoppers'];

function weightsFor(def: WorldDef, safe: boolean): [SegKind, number][] {
  const w = { ...DEFAULT_W };
  for (const [k, v] of Object.entries(def.weights ?? {})) w[k as SegKind] += v as number;
  if (!def.flyer) w.flyers = 0;
  if (!def.hopper) w.hoppers = 0;
  if (!def.walker) w.patrol = 0;
  if (safe) for (const k of ENEMY_SEGS) w[k] = 0;
  return Object.entries(w).filter(([, v]) => v > 0) as [SegKind, number][];
}

function pickSeg(b: Builder, ws: [SegKind, number][]): SegKind {
  const total = ws.reduce((n, [, v]) => n + v, 0);
  let r = b.r() * total;
  for (const [k, v] of ws) { r -= v; if (r <= 0) return k; }
  return ws[ws.length - 1][0];
}

/** Fills [x, end) with sections; every 3rd section is a slide. */
function fill(b: Builder, x: number, end: number, safe = false): number {
  const ws = weightsFor(b.def, safe);
  let i = 0;
  while (x < end) {
    const kind = i % 3 === 1 ? 'slide' : pickSeg(b, ws);
    const start = x;
    x = SEGS[kind](b, x);
    // extra bad guys wandering through other sections, so every level has plenty to dodge
    if (!safe && !ENEMY_SEGS.includes(kind as SegKind) && kind !== 'slide') {
      if (b.r() < 0.5) b.walker(start + 30, x - 30);
      else if (b.r() < 0.35) b.flyer(b.rnd(start + 80, x - 80), GY - b.rnd(90, 170));
    }
    if (b.r() < 0.7) b.decorAt(b.rnd(start, x));
    x += b.rnd(60, 160);
    if (b.r() < 0.5) b.decorAt(x - 40);
    i++;
  }
  return x;
}

const nextOf = (id: string) => ORDER[(ORDER.indexOf(id) + 1) % ORDER.length];
const defOf = (id: string) => DEFS.find(d => d.id === id)!;

// ---------- hand-made openings from the prototype ----------
type Prefix = (b: Builder) => number;
const PREFIX: Record<string, Prefix> = {
  hub(b) {
    for (const [x, y, w] of [[540, 400, 90], [650, 340, 90], [540, 280, 90], [650, 220, 130]]) b.plat(x, y, w);
    b.slide(780, 220, 1220, GY);
    for (const [x, y] of [[585, 370], [695, 310], [585, 250], [715, 185], [880, 250], [1040, 338], [1340, 400]]) b.item(x, y);
    for (const [t, x] of [['tree', 70], ['flower', 240], ['sign', 360], ['tree', 470], ['flower', 1290], ['tree', 1340]] as [string, number][]) b.decor.push({ t, x });
    return 1500;
  },
  halloween(b) {
    for (const [x, y, w] of [[640, 400, 90], [760, 340, 90], [640, 280, 90], [760, 220, 90], [640, 160, 200]]) b.plat(x, y, w);
    b.slide(840, 160, 1340, GY);
    for (const [x, y] of [[685, 370], [805, 310], [685, 250], [805, 190], [740, 125], [1000, 232], [1200, 353], [1550, 400], [1900, 300], [2250, 400], [2560, 330]]) b.item(x, y);
    for (const [t, x] of [['deadtree', 330], ['grave', 450], ['grave', 520], ['pumpkin', 585], ['pumpkin', 1440], ['grave', 1700], ['house', 1960], ['pumpkin', 2160], ['pumpkin', 2200], ['deadtree', 2470], ['grave', 2610]] as [string, number][]) b.decor.push({ t, x });
    for (const [x, y, ph] of [[1620, 370, 0], [2060, 350, 2], [2420, 375, 4]]) b.enemy('flyer', 'ghost', '#f4f0ff', x, y, { ax: 110, ay: 16, sp: 0.7, spy: 2.2, ph });
    return 2700;
  },
  space(b) {
    for (const [x, y, w] of [[480, 350, 120], [700, 250, 120], [920, 160, 150], [1800, 340, 110], [2000, 240, 110], [2190, 330, 110]]) b.plat(x, y, w);
    b.slide(1070, 160, 1560, GY);
    for (const [x, y] of [[540, 310], [760, 210], [995, 120], [1200, 216], [1400, 338], [1855, 300], [2055, 195], [2245, 290], [2100, 110]]) b.item(x, y);
    for (const [t, x] of [['flag', 320], ['crater', 420], ['rock', 1650], ['crater', 1720]] as [string, number][]) b.decor.push({ t, x });
    return 2380;
  },
  ice(b) {
    for (const [x, y, w] of [[520, 400, 110], [640, 340, 110], [520, 280, 110], [640, 220, 110], [520, 160, 110], [640, 100, 160]]) b.plat(x, y, w);
    b.slide(800, 100, 1500, GY);
    for (const [x, y] of [[575, 370], [695, 310], [575, 250], [695, 190], [575, 130], [720, 65], [1000, 180], [1300, 334], [1760, 400], [2000, 320], [2260, 400]]) b.item(x, y);
    for (const [t, x] of [['pine', 360], ['pine', 440], ['snowman', 1660], ['pine', 1900], ['pine', 2120]] as [string, number][]) b.decor.push({ t, x });
    return 2380;
  },
};

function finish(b: Builder, w: number, goal: number, spawn: number): World {
  const def = b.def;
  b.plats.unshift({ x: -150, y: GY, w: w + 300, h: 600, ground: true });
  return {
    ...def, w, spawn, goal,
    plats: b.plats, slides: b.slides, portals: b.portals, items: b.items, decor: b.decor,
    springs: b.springs, movers: b.movers, boxes: b.boxes, boosts: b.boosts, bumpers: b.bumpers, updrafts: b.updrafts,
    enemies: b.enemies, bats: def.id === 'halloween', done: false,
  };
}

function buildHub(def: WorldDef): World {
  const b = new Builder(def);
  let x = PREFIX.hub(b);
  const dests = [...ORDER, 'random'];
  const safeKinds: SegKind[] = ['stairs', 'arc', 'boxes', 'treats', 'springs', 'movers', 'boost'];
  dests.forEach((id, k) => {
    if (id === 'random') b.portals.push({ x, y: GY, to: 'random', label: '❓ Mystery', color: '#c13dff' });
    else { const d = defOf(id); b.portals.push({ x, y: GY, to: id, label: d.label, color: d.portalColor }); }
    if (b.r() < 0.6) b.decorAt(x + 160);
    x += 300;
    if (k % 4 === 3 && k < dests.length - 1) {
      const kind = k % 8 === 3 ? 'slide' : b.pick(safeKinds);
      x = SEGS[kind](b, x) + 120;
    }
  });
  return finish(b, x + 200, -1, 160);
}

function buildLevel(def: WorldDef): World {
  const b = new Builder(def);
  b.portals.push({ x: 140, y: GY, to: 'hub', label: '🏠 Portal Plaza', color: '#38e07a' });
  let x = PREFIX[def.id]?.(b) ?? 420;
  x = fill(b, x, def.length - 900);
  const goal = x + 120;
  const nx = nextOf(def.id), nd = defOf(nx);
  b.portals.push({ x: goal + 260, y: GY, to: 'hub', label: '🏠 Portal Plaza', color: '#38e07a' });
  b.portals.push({ x: goal + 480, y: GY, to: nx, label: `Next: ${nd.label}`, color: nd.portalColor });
  b.decorAt(goal - 90);
  return finish(b, goal + 640, goal, 240);
}

export function buildWorld(def: WorldDef): World {
  return def.id === 'hub' ? buildHub(def) : buildLevel(def);
}
