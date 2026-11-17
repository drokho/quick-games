// Shared types for worlds, level pieces and powers.

export const LH = 540; // logical view height
export const GY = 460; // ground line

export type ItemKind =
  | 'star' | 'candy' | 'gem' | 'flake' | 'coin' | 'heart' | 'note' | 'leaf' | 'bolt' | 'cupcake'
  | 'shell' | 'feather' | 'gear' | 'apple' | 'crystal' | 'balloon' | 'flame' | 'orb' | 'flower' | 'key';

export type Power =
  | 'none' | 'lowgrav' | 'slippery' | 'jetpack' | 'triple' | 'pogo' | 'speed' | 'swim' | 'giant' | 'tiny'
  | 'magnet' | 'glide' | 'airdash' | 'wind' | 'springshoes' | 'flameshield' | 'sugar' | 'ghostmode'
  | 'froglegs' | 'bumper' | 'groundpound' | 'beat' | 'slowmo';

export type EnemyArt = 'slime' | 'roller' | 'bot' | 'crab' | 'frog' | 'flyer' | 'bee' | 'fish' | 'ghost';
export type SlideStyle = 'rainbow' | 'bone' | 'neon' | 'ice' | 'custom';
export type FarType = 'hills' | 'mountains' | 'city' | 'forest' | 'castles' | 'crystals' | 'dunes' | 'waves';
export type Fg = 'snow' | 'fog' | 'bubbles' | 'embers' | 'leaves' | 'confetti' | 'wind' | 'sparkle' | 'sepia';
export type SunKind = 'sun' | 'moon' | 'planet' | 'disco' | 'clock';

export interface Layer { type: FarType; col: string; par: number; h: number; base: number }

export interface Theme {
  ground: string; top: string; plat: string; platTop: string; dot: string;
  accent: string; // foliage / decor accent colour
  sky?: [string, string];
  far?: Layer[];
  sun?: { kind: SunKind; col: string };
  fg?: Fg;
  slide: SlideStyle;
  slideCols?: [string, string];
}

export interface SongCfg { base: 'hub' | 'halloween' | 'space' | 'ice'; root?: number; bpm?: number; wave?: OscillatorType; cut?: number }

export interface WorldDef {
  id: string;
  title: string;
  sub: string;
  label: string; // portal label, with emoji
  portalColor: string;
  icon: ItemKind;
  emoji: string;
  noun: string;
  power: Power;
  powerName: string;
  g: number; jump: number; fric: number; speed: number;
  length: number;
  theme: Theme;
  walker?: { art: EnemyArt; col: string };
  flyer?: { art: EnemyArt; col: string };
  hopper?: { art: EnemyArt; col: string };
  decorKinds: string[];
  weights?: Partial<Record<SegKind, number>>;
  song: SongCfg;
}

export type SegKind =
  | 'stairs' | 'arc' | 'patrol' | 'flyers' | 'movers' | 'boxes' | 'boost' | 'hoppers' | 'bumpers'
  | 'updraft' | 'high' | 'springs' | 'treats';

export interface Plat { x: number; y: number; w: number; h: number; ground?: boolean }
export interface Slide { x1: number; y1: number; x2: number; y2: number; style: SlideStyle; k: number; cols?: [string, string] }
export interface Portal { x: number; y: number; to: string; label: string; color: string }
export interface Item { x: number; y: number; got: boolean; box?: number; mx?: number; my?: number }
export interface Decor { t: string; x: number }
export interface Spring { x: number; y: number; t: number }
export interface Mover { bx: number; by: number; x: number; y: number; w: number; ax: number; ay: number; sp: number; ph: number; dx: number; dy: number }
export interface Box { x: number; y: number; hit: number; used: boolean }
export interface Boost { x: number; y: number }
export interface Bumper { x: number; y: number; r: number; t: number }
export interface Updraft { x: number; w: number; top: number }
export interface Enemy {
  kind: 'walker' | 'flyer' | 'hopper'; art: EnemyArt; col: string;
  x: number; y: number; bx: number; by: number; x0: number; x1: number; dir: number; sp: number;
  ax: number; ay: number; spy: number; ph: number;
  cd: number; dizzy: number; vy: number; hopT: number;
  punt: number; px: number; py: number; pvx: number; pvy: number;
}

export interface World extends WorldDef {
  plats: Plat[]; slides: Slide[]; portals: Portal[]; items: Item[]; decor: Decor[];
  springs: Spring[]; movers: Mover[]; boxes: Box[]; boosts: Boost[]; bumpers: Bumper[]; updrafts: Updraft[];
  enemies: Enemy[]; goal: number; bats?: boolean; done: boolean;
  w: number; spawn: number;
}
