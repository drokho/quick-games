/**
 * Persistence: the per-player save, in RUN's appStorage via the shared save
 * system (src/systems/save/README.md). Cloud only: never copy the save to
 * deviceCache (no player id in its key).
 */
import { createSaveSystem, type LegacySave } from '../systems/save/save.ts';
import { CONFIG } from '../game/config.ts';
import { TOWERS } from '../game/data/towers.ts';
import { sdkReady } from '../sdk/runSdk.ts';
import type { AdsState } from '../systems/ads.ts';

// New optional fields with defaults need no bump (normalize() fills them in).
// ADAPT: your game's save key.
const SAVE_KEY = 'antivirus-defense:save:v1';

export type MetaStat = 'damage' | 'speed' | 'range' | 'unique';

export interface MetaStatLevels {
    damage: number;
    speed: number;
    range: number;
    /** The tower's signature track (towers.ts metaUnique). */
    unique: number;
}

export type MetaLevels = Record<string, MetaStatLevels>;

export interface SaveData {
    /** Schema version, stamped by the save system. */
    version: number;
    /** Highest wave fully cleared across all runs. */
    bestWave: number;
    /** Meta currency, earned at the end of every run. */
    gems: number;
    /** Persistent per-tower upgrade levels. */
    meta: MetaLevels;
    /** Audio volumes, 0..1 per bus. */
    audio: { music: number; sfx: number };
    /** Rewarded-ads daily cap slice (systems/ads.ts mutates it in place). */
    ads: AdsState;
}

function emptyMeta(): MetaLevels {
    const meta: MetaLevels = {};
    for (const t of TOWERS) meta[t.id] = { damage: 0, speed: 0, range: 0, unique: 0 };
    return meta;
}

const DEFAULTS: SaveData = {
    version: 1,
    bestWave: 0,
    gems: 0,
    meta: emptyMeta(),
    audio: { music: 0.6, sfx: 0.8 },
    ads: { watchedToday: 0, lastResetDay: null },
};

/** Coerce a stored object into a valid SaveData (wrong types become defaults). */
function normalize(parsed: LegacySave): SaveData {
    const num = (v: unknown, min: number, max: number): number => {
        const n = Math.floor(Number(v));
        return Number.isFinite(n) && n >= min ? Math.min(n, max) : 0;
    };
    const meta = emptyMeta();
    const rawMeta = (parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {}) as Partial<MetaLevels>;
    for (const t of TOWERS) {
        const m = rawMeta[t.id];
        if (!m || typeof m !== 'object') continue;
        meta[t.id] = {
            damage: num(m.damage, 0, CONFIG.meta.maxLevel),
            speed: num(m.speed, 0, CONFIG.meta.maxLevel),
            range: num(m.range, 0, CONFIG.meta.maxLevel),
            unique: num(m.unique, 0, t.metaUnique.maxLevel),
        };
    }
    const vol = (v: unknown, fallback: number): number => {
        const f = Number(v);
        return Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : fallback;
    };
    const rawAudio = (parsed.audio && typeof parsed.audio === 'object' ? parsed.audio : {}) as Partial<SaveData['audio']>;
    const rawAds = (parsed.ads && typeof parsed.ads === 'object' ? parsed.ads : {}) as Partial<AdsState>;
    return {
        version: DEFAULTS.version,
        bestWave: num(parsed.bestWave, 0, Number.MAX_SAFE_INTEGER),
        gems: num(parsed.gems, 0, Number.MAX_SAFE_INTEGER),
        meta,
        audio: {
            music: vol(rawAudio.music, DEFAULTS.audio.music),
            sfx: vol(rawAudio.sfx, DEFAULTS.audio.sfx),
        },
        ads: {
            watchedToday: num(rawAds.watchedToday, 0, 10000),
            lastResetDay: typeof rawAds.lastResetDay === 'string' ? rawAds.lastResetDay : null,
        },
    };
}

const saves = createSaveSystem<SaveData>({
    key: SAVE_KEY,
    version: DEFAULTS.version,
    defaultSave: () => structuredClone(DEFAULTS),
    validate: (s) => { Object.assign(s, normalize(s)); },
});

/** In-memory save for plain-browser dev without the RUN SDK. Never persisted. */
let sdkLess: SaveData | null = null;

/**
 * Load the save into memory. Call once at boot, after initSdk(). One cloud
 * read: if it fails, play runs on defaults and nothing is saved this session,
 * so the stored save is never overwritten.
 */
export async function loadSave(): Promise<SaveData> {
    if (!sdkReady()) {
        console.warn('[save] RUN SDK not ready: progress is kept in memory only and is not saved');
        sdkLess ??= structuredClone(DEFAULTS);
        return sdkLess;
    }
    return saves.load();
}

/** The live save. Throws before loadSave() resolves. */
export function getSave(): SaveData {
    const data = saves.data ?? sdkLess;
    if (!data) throw new Error('[save] getSave() called before loadSave() resolved');
    return data;
}

/**
 * Write-through persist of the live save. Fire-and-forget, never throws.
 * Call from every save point (mutations, onPause, onSleep, onQuit). A failed
 * write is logged and retried by the next call.
 */
export function flushSave(): void {
    if (saves.data) saves.save();
}

/**
 * True when this session's changes reach storage. False before load, without
 * the RUN SDK, and after a failed read, a corrupt save, or a newer save. Check
 * it before you sell anything that only the save keeps.
 */
export function canSave(): boolean {
    return saves.canSave;
}

/** Apply field changes to the live save (its identity never changes). */
function update(patch: Partial<SaveData>): SaveData {
    return Object.assign(getSave(), patch);
}

/**
 * A run ended: record the best wave and pay out gems. Clearing wave N pays
 * N * gemsPerWave, so later waves are worth more (a full run pays the
 * triangular sum). Returns the gems earned for the end screen.
 */
export function recordRunEnd(wavesCleared: number): { gemsEarned: number; save: SaveData } {
    const n = Math.max(0, Math.floor(wavesCleared));
    let gemsEarned = 0;
    for (let w = 1; w <= n; w++) gemsEarned += w * CONFIG.meta.gemsPerWave;
    const data = getSave();
    update({
        bestWave: Math.max(data.bestWave, n),
        gems: data.gems + gemsEarned,
    });
    flushSave();
    return { gemsEarned, save: data };
}

/** Grant bonus gems (rewarded-ad placement). Returns the new save. */
export function addGems(amount: number): SaveData {
    const data = update({ gems: getSave().gems + Math.max(0, Math.floor(amount)) });
    flushSave();
    return data;
}

/** Cost in gems of buying INTO the next level, given the current level. */
export function metaUpgradeCost(currentLevel: number): number {
    return CONFIG.meta.costBase + CONFIG.meta.costStep * currentLevel;
}

let audioFlushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Persist slider-driven volume changes, debounced 400ms so dragging a
 * slider does not hammer storage. Values apply to the buses immediately at
 * the call site; this only records them.
 */
export function setAudioVolumes(music: number, sfxVol: number): void {
    update({ audio: { music, sfx: sfxVol } });
    if (audioFlushTimer) clearTimeout(audioFlushTimer);
    audioFlushTimer = setTimeout(() => {
        audioFlushTimer = null;
        flushSave();
    }, 400);
}

/**
 * Buy one meta upgrade level for a tower's stat. Returns the new save, or
 * null if maxed or unaffordable (callers disable the button, but never
 * trust the UI).
 */
export function buyMetaUpgrade(towerId: string, stat: MetaStat): SaveData | null {
    const data = getSave();
    const levels = data.meta[towerId];
    if (!levels) return null;
    const level = levels[stat];
    const cap = stat === 'unique'
        ? TOWERS.find((t) => t.id === towerId)?.metaUnique.maxLevel ?? 0
        : CONFIG.meta.maxLevel;
    if (level >= cap) return null;
    const cost = metaUpgradeCost(level);
    if (data.gems < cost) return null;
    update({
        gems: data.gems - cost,
        meta: {
            ...data.meta,
            [towerId]: { ...levels, [stat]: level + 1 },
        },
    });
    flushSave();
    return data;
}
