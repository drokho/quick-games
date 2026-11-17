// Saved look and collectibles, on the RUN SDK's appStorage (cloud-synced per title).
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { WORLDS, WORLD_IDS } from './worlds';

export const COLORS = ['#ff5d8f', '#7b3ff2', '#2bb3ff', '#2ed47a', '#ffb020', '#ff6a2b', '#f4f4f4', '#3a3550'];
export const HATS: [string, string][] = [['none', 'None'], ['witch', 'Witch hat'], ['pumpkin', 'Pumpkin'], ['crown', 'Crown'], ['cat', 'Cat ears'], ['prop', 'Propeller'], ['astro', 'Space helmet']];
export const TRAILS: [string, string][] = [['none', 'None'], ['sparkle', 'Sparkles'], ['bubbles', 'Bubbles'], ['ghost', 'Ghost fire']];

export interface Look { color: string; hat: string; trail: string }
export const look: Look = { color: '#ff5d8f', hat: 'witch', trail: 'sparkle' };

const KEY = 'save';
interface SaveBlob { v: 1; look: Look; got: Record<string, number[]> }

export async function loadSave(): Promise<void> {
  try {
    const raw = await RundotGameAPI.appStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as Partial<SaveBlob>;
    if (s.look) {
      if (COLORS.includes(s.look.color)) look.color = s.look.color;
      if (HATS.some(h => h[0] === s.look!.hat)) look.hat = s.look.hat;
      if (TRAILS.some(t => t[0] === s.look!.trail)) look.trail = s.look.trail;
    }
    for (const id of WORLD_IDS) {
      for (const i of s.got?.[id] ?? []) { const it = WORLDS[id].items[i]; if (it) it.got = true; }
    }
  } catch (e) {
    console.warn('[save] load failed', e);
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
export function saveSoon(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void saveNow(); }, 600);
}

export async function saveNow(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  const got: Record<string, number[]> = {};
  for (const id of WORLD_IDS) got[id] = WORLDS[id].items.flatMap((it, i) => (it.got ? [i] : []));
  const blob: SaveBlob = { v: 1, look: { ...look }, got };
  try {
    await RundotGameAPI.appStorage.setItem(KEY, JSON.stringify(blob));
  } catch (e) {
    console.warn('[save] write failed', e);
  }
}
