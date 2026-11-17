// World layouts and per-world physics. Numbers match the prototype (reference/portal-hopper.html).

export const LH = 540; // logical view height
export const GY = 460; // ground line

export type WorldId = 'hub' | 'halloween' | 'space' | 'ice';
export type ItemKind = 'star' | 'candy' | 'gem' | 'flake';
export type SlideStyle = 'rainbow' | 'bone' | 'neon' | 'ice';

export interface Plat { x: number; y: number; w: number; h: number; ground?: boolean }
export interface Slide { x1: number; y1: number; x2: number; y2: number; style: SlideStyle; k: number }
export interface Portal { x: number; y: number; to: WorldId | 'random'; label: string; color: string }
export interface Item { x: number; y: number; got: boolean }
export interface Decor { t: string; x: number }
export interface Ghost { x: number; y: number; ph: number; cd: number }
export interface Theme { ground: string; top: string; plat: string; platTop: string; dot: string }

export interface World {
  id: WorldId;
  title: string;
  sub: string;
  w: number;
  g: number; // gravity
  jump: number; // jump speed
  fric: number; // ground friction
  speed: number; // run speed
  icon: ItemKind;
  emoji: string;
  noun: string;
  spawn: number;
  plats: Plat[];
  slides: Slide[];
  portals: Portal[];
  items: Item[];
  decor: Decor[];
  ghosts: Ghost[];
  bats?: boolean;
  theme: Theme;
}

const ground = (w: number): Plat => ({ x: -150, y: GY, w: w + 300, h: 600, ground: true });
const P_ = (x: number, y: number, w: number): Plat => ({ x, y, w, h: 18 });
const items = (a: [number, number][]): Item[] => a.map(([x, y]) => ({ x, y, got: false }));
const slide = (x1: number, y1: number, x2: number, y2: number, style: SlideStyle): Slide =>
  ({ x1, y1, x2, y2, style, k: (y2 - y1) / (x2 - x1) });
const decor = (list: [string, number][]): Decor[] => list.map(([t, x]) => ({ t, x }));

export const WORLDS: Record<WorldId, World> = {
  hub: {
    id: 'hub', title: 'Portal Plaza', sub: 'Find the portals!', w: 2700, g: 1800, jump: 720, fric: 12, speed: 310,
    icon: 'star', emoji: '⭐', noun: 'stars', spawn: 160,
    plats: [ground(2700), P_(540, 400, 90), P_(650, 340, 90), P_(540, 280, 90), P_(650, 220, 130)],
    slides: [slide(780, 220, 1220, GY, 'rainbow')],
    portals: [
      { x: 1480, y: GY, to: 'halloween', label: '🎃 Spooky Hollow', color: '#ff7a1a' },
      { x: 1770, y: GY, to: 'space', label: '🚀 Moon Base', color: '#3d7bff' },
      { x: 2060, y: GY, to: 'ice', label: '❄️ Frosty Peaks', color: '#38d9f5' },
      { x: 2420, y: GY, to: 'random', label: '❓ Mystery', color: '#c13dff' },
    ],
    items: items([[585, 370], [695, 310], [585, 250], [715, 185], [880, 250], [1040, 338], [1340, 400], [1625, 330], [1915, 330], [2240, 380]]),
    decor: decor([['tree', 70], ['flower', 240], ['sign', 360], ['tree', 470], ['flower', 1290], ['tree', 1340], ['flower', 1630], ['flower', 1910], ['tree', 2240], ['flower', 2560], ['tree', 2640]]),
    ghosts: [],
    theme: { ground: '#9a6a45', top: '#6fd36a', plat: '#b77a4a', platTop: '#7ee07a', dot: 'rgba(0,0,0,.08)' },
  },
  halloween: {
    id: 'halloween', title: 'Spooky Hollow', sub: 'Collect the candy… watch out for ghosts', w: 2900, g: 1800, jump: 720, fric: 12, speed: 310,
    icon: 'candy', emoji: '🍬', noun: 'candy', spawn: 240,
    plats: [ground(2900), P_(640, 400, 90), P_(760, 340, 90), P_(640, 280, 90), P_(760, 220, 90), P_(640, 160, 200)],
    slides: [slide(840, 160, 1340, GY, 'bone')],
    portals: [
      { x: 140, y: GY, to: 'hub', label: '🏠 Portal Plaza', color: '#38e07a' },
      { x: 2730, y: GY, to: 'space', label: '🚀 Moon Base', color: '#3d7bff' },
    ],
    items: items([[685, 370], [805, 310], [685, 250], [805, 190], [740, 125], [1000, 232], [1200, 353], [1550, 400], [1900, 300], [2250, 400], [2560, 330]]),
    decor: decor([['deadtree', 330], ['grave', 450], ['grave', 520], ['pumpkin', 585], ['pumpkin', 1440], ['grave', 1700], ['house', 1960], ['pumpkin', 2160], ['pumpkin', 2200], ['deadtree', 2470], ['grave', 2610], ['pumpkin', 2850]]),
    ghosts: [{ x: 1620, y: 370, ph: 0, cd: 0 }, { x: 2060, y: 350, ph: 2, cd: 0 }, { x: 2420, y: 375, ph: 4, cd: 0 }],
    bats: true,
    theme: { ground: '#24162f', top: '#47295c', plat: '#3d3352', platTop: '#7a6896', dot: 'rgba(255,255,255,.05)' },
  },
  space: {
    id: 'space', title: 'Moon Base', sub: 'Low gravity — jump big!', w: 2500, g: 700, jump: 500, fric: 8, speed: 280,
    icon: 'gem', emoji: '💎', noun: 'gems', spawn: 240,
    plats: [ground(2500), P_(480, 350, 120), P_(700, 250, 120), P_(920, 160, 150), P_(1800, 340, 110), P_(2000, 240, 110), P_(2190, 330, 110)],
    slides: [slide(1070, 160, 1560, GY, 'neon')],
    portals: [
      { x: 140, y: GY, to: 'hub', label: '🏠 Portal Plaza', color: '#38e07a' },
      { x: 2400, y: GY, to: 'ice', label: '❄️ Frosty Peaks', color: '#38d9f5' },
    ],
    items: items([[540, 310], [760, 210], [995, 120], [1200, 216], [1400, 338], [1855, 300], [2055, 195], [2245, 290], [2100, 110]]),
    decor: decor([['flag', 320], ['crater', 420], ['rock', 1650], ['crater', 1720], ['rock', 2320]]),
    ghosts: [],
    theme: { ground: '#7f7b95', top: '#b2aec8', plat: '#4f5670', platTop: '#9fe7ff', dot: 'rgba(0,0,0,.12)' },
  },
  ice: {
    id: 'ice', title: 'Frosty Peaks', sub: 'Slippery! Slide all the way down', w: 2600, g: 1800, jump: 720, fric: 2.4, speed: 330,
    icon: 'flake', emoji: '❄️', noun: 'snowflakes', spawn: 240,
    plats: [ground(2600), P_(520, 400, 110), P_(640, 340, 110), P_(520, 280, 110), P_(640, 220, 110), P_(520, 160, 110), P_(640, 100, 160)],
    slides: [slide(800, 100, 1500, GY, 'ice')],
    portals: [
      { x: 140, y: GY, to: 'hub', label: '🏠 Portal Plaza', color: '#38e07a' },
      { x: 2460, y: GY, to: 'halloween', label: '🎃 Spooky Hollow', color: '#ff7a1a' },
    ],
    items: items([[575, 370], [695, 310], [575, 250], [695, 190], [575, 130], [720, 65], [1000, 180], [1300, 334], [1760, 400], [2000, 320], [2260, 400]]),
    decor: decor([['pine', 360], ['pine', 440], ['snowman', 1660], ['pine', 1900], ['pine', 2120], ['snowman', 2330]]),
    ghosts: [],
    theme: { ground: '#cfe9fb', top: '#ffffff', plat: '#8fcdf2', platTop: '#effcff', dot: 'rgba(60,140,200,.12)' },
  },
};

export const WORLD_IDS = Object.keys(WORLDS) as WorldId[];
export const TOTAL_ITEMS = WORLD_IDS.reduce((n, id) => n + WORLDS[id].items.length, 0);
export const collectedCount = () => WORLD_IDS.reduce((n, id) => n + WORLDS[id].items.filter(i => i.got).length, 0);
