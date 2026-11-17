// All worlds, built once at start-up from defs.ts by levelgen.ts.
import { DEFS, ORDER } from './defs';
import { buildWorld } from './levelgen';
import type { World } from './types';

export { GY, LH } from './types';
export type { World, Portal, Item, ItemKind, Power } from './types';
export { ORDER };

export type WorldId = string;

export const WORLDS: Record<string, World> = Object.fromEntries(DEFS.map(d => [d.id, buildWorld(d)]));
export const WORLD_IDS = Object.keys(WORLDS);
export const TOTAL_ITEMS = WORLD_IDS.reduce((n, id) => n + WORLDS[id].items.length, 0);
export const collectedCount = () => WORLD_IDS.reduce((n, id) => n + WORLDS[id].items.filter(i => i.got).length, 0);
export const levelsDone = () => ORDER.filter(id => WORLDS[id].done).length;
