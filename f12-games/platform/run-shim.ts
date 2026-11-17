// F12 Games stand-in for `@series-inc/rundot-game-sdk/api`.
//
// The PWA build aliases the RUN SDK import to this file, so a game written for
// RUN runs on games.f12crowd.com without code changes. It covers the parts of
// the SDK our games use: saving, CDN assets, realtime relay rooms, lifecycles,
// analytics and logging. Anything else logs a warning instead of crashing.

declare const __F12_GAME__: {
  slug: string;
  api: string;
  rooms: Record<string, { sticky?: string[] }>;
  /** Shared leaderboard endpoint, for games that opted in; null = this device only */
  board?: string | null;
};

const GAME = __F12_GAME__;
const NS = `f12:${GAME.slug}:`;

// ---------------------------------------------------------------- storage

/** Ask the browser not to evict our saves when the phone runs low on space. */
let persistAsked = false;
function askPersist() {
  if (persistAsked) return;
  persistAsked = true;
  void navigator.storage?.persist?.().catch(() => undefined);
}

function makeStorage(prefix: string) {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        return localStorage.getItem(prefix + key);
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      askPersist();
      localStorage.setItem(prefix + key, value);
    },
    async removeItem(key: string): Promise<void> {
      localStorage.removeItem(prefix + key);
    },
    async clear(): Promise<void> {
      for (const k of Object.keys(localStorage)) if (k.startsWith(prefix)) localStorage.removeItem(k);
    },
    async length(): Promise<number> {
      return Object.keys(localStorage).filter((k) => k.startsWith(prefix)).length;
    },
    async key(i: number): Promise<string | null> {
      const k = Object.keys(localStorage).filter((x) => x.startsWith(prefix))[i];
      return k ? k.slice(prefix.length) : null;
    },
    async setMultipleItems(items: { key: string; value: string }[]): Promise<void> {
      askPersist();
      for (const it of items) localStorage.setItem(prefix + it.key, it.value);
    },
    async removeMultipleItems(keys: string[]): Promise<void> {
      for (const k of keys) localStorage.removeItem(prefix + k);
    },
  };
}

// ---------------------------------------------------------------- assets

async function fetchAsset(path: string): Promise<Blob> {
  const res = await fetch(`${import.meta.env.BASE_URL}cdn-assets/${path.replace(/^\/+/, '')}`);
  if (!res.ok) throw new Error(`Asset ${path} failed to load (${res.status})`);
  return res.blob();
}

// ---------------------------------------------------------------- lifecycles

type Fn = () => void;
const hooks = { pause: new Set<Fn>(), resume: new Set<Fn>(), sleep: new Set<Fn>(), awake: new Set<Fn>(), quit: new Set<Fn>() };
const fire = (set: Set<Fn>) => set.forEach((f) => f());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    fire(hooks.pause);
    fire(hooks.sleep);
  } else {
    fire(hooks.awake);
    fire(hooks.resume);
  }
});
window.addEventListener('pagehide', () => fire(hooks.quit));
const on = (set: Set<Fn>) => (f: Fn) => {
  set.add(f);
  return { unsubscribe: () => set.delete(f) };
};

// ---------------------------------------------------------------- realtime

interface Player {
  id: string;
  username: string;
  avatarUrl?: string | null;
}
interface Joined {
  code: string;
  playerId: string;
  token: string;
  since: number;
  maxPlayers: number;
  locked: boolean;
  creator: boolean;
  sticky: string[];
  players: Player[];
}
interface Polled {
  since: number;
  locked: boolean;
  players: Player[];
  msgs: { to: string | null; body: unknown }[];
}
interface Events {
  onMessage?: (m: unknown) => void;
  onPrivateMessage?: (m: unknown) => void;
  onPlayerJoined?: (p: Player) => void;
  onPlayerLeft?: (id: string) => void;
  onLock?: () => void;
  onUnlock?: () => void;
  onError?: (e: string) => void;
  onDisconnect?: () => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
}

const FAST = 250;
const GAP = 180;
const SLOW = 1500;
const GIVE_UP_MS = 20000;

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(GAME.api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: GAME.slug, ...body }),
  });
  const json = (await res.json().catch(() => ({ error: `Server error ${res.status}` }))) as T & { error?: string };
  if (!res.ok || json.error) throw new Error(json.error ?? `Server error ${res.status}`);
  return json;
}

/** A RUN-style realtime room, carried over short HTTP polls to our PHP relay. */
class F12Room {
  roomCode: string;
  playerId: string;
  locked: boolean;
  players: Player[];
  maxPlayers: number;
  isCreator: boolean;
  latency = 0;
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' = 'connected';

  private token: string;
  private sticky: Set<string>;
  private since: number;
  private out: unknown[] = [];
  private ev: Events = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  private lastOk = Date.now();
  private lastStart = 0;
  private due = 0;
  private quiet = 0;

  constructor(j: Joined) {
    this.roomCode = j.code;
    this.playerId = j.playerId;
    this.token = j.token;
    this.since = j.since;
    this.locked = j.locked;
    this.players = j.players;
    this.maxPlayers = j.maxPlayers;
    this.isCreator = j.creator;
    this.sticky = new Set(j.sticky);
    window.addEventListener('pagehide', this.beacon);
    this.schedule(0);
  }

  on(events: Events) {
    Object.assign(this.ev, events);
  }

  send(message: unknown) {
    if (this.connectionState === 'disconnected') return;
    this.out.push(message);
    this.quiet = 0;
    // Batch sends: at most one request every GAP ms
    const soon = Math.max(30, this.lastStart + GAP - Date.now());
    if (!this.busy && this.due - Date.now() > soon) this.schedule(soon);
  }

  setSeatingOpen() {
    // Rooms lock themselves when full; nothing to do here
  }

  leave() {
    if (this.connectionState === 'disconnected') return;
    this.stop();
    void call({ action: 'leave', code: this.roomCode, playerId: this.playerId, token: this.token }).catch(() => undefined);
  }

  getServerTime() {
    return Date.now();
  }

  private stop() {
    this.connectionState = 'disconnected';
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    window.removeEventListener('pagehide', this.beacon);
  }

  private beacon = () => {
    const body = JSON.stringify({ game: GAME.slug, action: 'leave', code: this.roomCode, playerId: this.playerId, token: this.token });
    navigator.sendBeacon?.(GAME.api, new Blob([body], { type: 'application/json' }));
  };

  private schedule(ms: number) {
    if (this.connectionState === 'disconnected') return;
    if (this.timer) clearTimeout(this.timer);
    this.due = Date.now() + ms;
    this.timer = setTimeout(() => void this.poll(), ms);
  }

  private async poll() {
    this.timer = null;
    if (this.busy || this.connectionState === 'disconnected') return;
    this.busy = true;
    this.lastStart = Date.now();
    const out = latestOnly(this.out.splice(0, 40), this.sticky);
    const t0 = performance.now();
    try {
      const r = await call<Polled>({ action: 'poll', code: this.roomCode, playerId: this.playerId, token: this.token, since: this.since, out });
      this.latency = Math.round((performance.now() - t0) / 2);
      this.lastOk = Date.now();
      if (this.connectionState === 'reconnecting') {
        this.connectionState = 'connected';
        this.ev.onReconnected?.();
      }
      this.apply(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/not in this room|room not found/i.test(msg) || Date.now() - this.lastOk > GIVE_UP_MS) {
        this.stop();
        this.ev.onDisconnect?.();
        return;
      }
      this.out.unshift(...out);
      if (this.connectionState === 'connected') {
        this.connectionState = 'reconnecting';
        this.ev.onReconnecting?.();
      }
    } finally {
      this.busy = false;
    }
    // Poll fast while things are happening, ease off when everyone is idle
    this.schedule(this.out.length ? Math.max(30, this.lastStart + GAP - Date.now()) : this.quiet > 20 ? SLOW : FAST);
  }

  private apply(r: Polled) {
    this.since = r.since;
    if (r.msgs.length) this.quiet = 0;
    else this.quiet++;
    const before = new Map(this.players.map((p) => [p.id, p]));
    this.players = r.players;
    for (const p of r.players) if (!before.has(p.id)) this.ev.onPlayerJoined?.(p);
    for (const id of before.keys()) if (!r.players.some((p) => p.id === id)) this.ev.onPlayerLeft?.(id);
    if (r.locked !== this.locked) {
      this.locked = r.locked;
      if (r.locked) this.ev.onLock?.();
      else this.ev.onUnlock?.();
    }
    for (const m of r.msgs) {
      if (m.to) this.ev.onPrivateMessage?.(m.body);
      else this.ev.onMessage?.(m.body);
    }
  }
}

/** Sticky kinds (like position) only matter as their latest value, so drop older queued copies. */
function latestOnly(msgs: unknown[], sticky: Set<string>): unknown[] {
  const seen = new Set<string>();
  return msgs
    .reverse()
    .filter((m) => {
      const u = m as { type?: string; kind?: string; to?: string };
      if (u.type !== 'up' || u.to || !u.kind || !sticky.has(u.kind)) return true;
      if (seen.has(u.kind)) return false;
      seen.add(u.kind);
      return true;
    })
    .reverse();
}

function username(): string {
  try {
    return localStorage.getItem('f12:name') || 'Friend';
  } catch {
    return 'Friend';
  }
}

const realtime = {
  async createRoom(roomType: string, opts?: { createOptions?: { maxPlayers?: number } }) {
    const j = await call<Joined>({
      action: 'create',
      type: roomType,
      name: username(),
      maxPlayers: opts?.createOptions?.maxPlayers ?? 2,
      sticky: GAME.rooms[roomType]?.sticky ?? [],
    });
    return new F12Room(j);
  },
  async joinRoomByCode(code: string) {
    return new F12Room(await call<Joined>({ action: 'join', code: code.trim().toUpperCase(), name: username() }));
  },
};

// ---------------------------------------------------------------- haptics

// RUN's HapticFeedbackStyle values ('light', 'heavy', ...) mapped to vibration patterns (ms).
const HAPTICS: Record<string, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 35,
  success: [15, 40, 15],
  warning: [25, 50, 25],
  error: [40, 40, 40],
};

/** Vibrates where the browser can (Android); a silent no-op elsewhere (iPhone, desktop), like RUN on devices without a motor. */
async function triggerHapticAsync(style: string): Promise<void> {
  try {
    navigator.vibrate?.(HAPTICS[style] ?? 15);
  } catch {
    /* not allowed here — fine */
  }
}

// ---------------------------------------------------------------- system (screen, device, fullscreen)

/** The notch / home-indicator insets, measured from CSS env() with a hidden probe. */
let safeArea: { top: number; right: number; bottom: number; left: number } | null = null;
window.addEventListener('resize', () => (safeArea = null));
function getSafeArea() {
  if (safeArea) return { ...safeArea };
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.documentElement.appendChild(probe);
  const cs = getComputedStyle(probe);
  safeArea = {
    // Under the F12 bar (home-bar.ts) the notch is the bar's, not the game's
    top: (window as { __f12Bar?: boolean }).__f12Bar ? 0 : parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return { ...safeArea };
}

const ua = navigator.userAgent;
const isTablet = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isMobile = !isTablet && /Mobi|Android|iPhone/i.test(ua);

function getDevice() {
  return {
    screenSize: { width: screen.width, height: screen.height },
    viewportSize: { width: window.innerWidth, height: window.innerHeight },
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    pixelRatio: window.devicePixelRatio || 1,
    fontScale: 1,
    deviceType: isTablet ? 'tablet' : isMobile ? 'phone' : 'desktop',
    hapticsEnabled: 'vibrate' in navigator,
    haptics: { supported: 'vibrate' in navigator, enabled: 'vibrate' in navigator },
  };
}

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
const fsDoc = document as FsDoc;
const fsEl = document.documentElement as FsEl;
const fsAvailable = !!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen);
/** An installed F12 app already fills the screen, like RUN's Steam Deck "always-on". */
const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
const fsState = () => ({ active: standalone || !!(fsDoc.fullscreenElement ?? fsDoc.webkitFullscreenElement), pointerLocked: false });

/** A plain web build: no ads, no purchases, fullscreen where the browser allows it (not iPhone Safari). */
function getEnvironment() {
  return {
    isDevelopment: false,
    platform: 'web',
    platformVersion: 'f12-games',
    browserInfo: { browser: 'web', userAgent: ua, isMobile, isTablet, language: navigator.language },
    capabilities: {
      ads: false,
      purchases: false,
      subscriptions: false,
      fullscreen: standalone ? 'always-on' : fsAvailable ? 'toggleable' : 'unavailable',
      pointerLock: false,
    },
    isSteamDesktop: false,
    isSteamDeck: false,
  };
}

const system = {
  getSafeArea,
  getDevice,
  getEnvironment,
  async requestFullscreen() {
    try {
      if (!fsState().active) await (fsEl.requestFullscreen?.() ?? fsEl.webkitRequestFullscreen?.());
    } catch {
      /* refused: stay windowed */
    }
    return fsState();
  },
  async exitFullscreen() {
    try {
      if (fsDoc.fullscreenElement) await document.exitFullscreen();
      else if (fsDoc.webkitFullscreenElement) await fsDoc.webkitExitFullscreen?.();
    } catch {
      /* already out */
    }
    return fsState();
  },
  async getFullscreenState() {
    return fsState();
  },
  onFullscreenStateChange(listener: (s: { active: boolean; pointerLocked: boolean }) => void) {
    const f = () => listener(fsState());
    document.addEventListener('fullscreenchange', f);
    document.addEventListener('webkitfullscreenchange', f);
    return () => {
      document.removeEventListener('fullscreenchange', f);
      document.removeEventListener('webkitfullscreenchange', f);
    };
  },
};

// ---------------------------------------------------------------- profile

/** A device-only player: a random id made once, the playdate name if one was picked. Nothing leaves the device. */
function getProfile() {
  let id = '';
  try {
    id = localStorage.getItem('f12:profile-id') ?? '';
    if (!id) localStorage.setItem('f12:profile-id', (id = `f12-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`));
  } catch {
    id = 'f12-player';
  }
  return { id, username: username(), name: username(), avatarUrl: null, isAnonymous: true };
}

// ---------------------------------------------------------------- gamepad

// RUN's normalized pad model over the browser's Gamepad API (standard mapping).
const PAD_BUTTONS = ['a', 'b', 'x', 'y', 'leftBumper', 'rightBumper', 'leftTrigger', 'rightTrigger', 'select', 'start', 'leftStick', 'rightStick', 'dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight', 'guide'];
const gamepad = {
  async ready() {},
  isSupported: () => typeof navigator.getGamepads === 'function',
  getGamepads() {
    const list = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    return Array.from(list)
      .filter((p): p is Gamepad => !!p && p.connected)
      .map((p) => {
        const t = performance.now();
        const buttons: Record<string, { pressed: boolean; value: number }> = {};
        PAD_BUTTONS.forEach((name, i) => (buttons[name] = { pressed: !!p.buttons[i]?.pressed, value: p.buttons[i]?.value ?? 0 }));
        return {
          index: p.index,
          id: p.id,
          connected: true,
          source: 'web-gamepad',
          standardMapping: p.mapping === 'standard',
          buttons,
          axes: { leftX: p.axes[0] ?? 0, leftY: p.axes[1] ?? 0, rightX: p.axes[2] ?? 0, rightY: p.axes[3] ?? 0 },
          sourceTimestamp: p.timestamp || t,
          deliveredTimestamp: t,
        };
      });
  },
  onConnected(callback: (e: { index: number; id: string; source: string }) => void) {
    const f = (e: GamepadEvent) => callback({ index: e.gamepad.index, id: e.gamepad.id, source: 'web-gamepad' });
    window.addEventListener('gamepadconnected', f);
    return { unsubscribe: () => window.removeEventListener('gamepadconnected', f) };
  },
};

// ---------------------------------------------------------------- leaderboards (this device only)

interface BoardEntry {
  profileId: string;
  username: string;
  avatarUrl: null;
  score: number;
  duration: number;
  submittedAt: number;
  rank: number | null;
  metadata?: Record<string, unknown> | null;
}
const boardKey = (mode?: string) => `${NS}board:${mode ?? 'default'}`;
function myBest(mode?: string): BoardEntry | null {
  try {
    const raw = localStorage.getItem(boardKey(mode));
    return raw ? { ...(JSON.parse(raw) as BoardEntry), rank: 1 } : null;
  } catch {
    return null;
  }
}
/** Keeps this device's best score per mode (higher is better, like RUN's default). */
const deviceLeaderboard = {
  async submitScore(p: { score: number; duration: number; mode?: string; metadata?: Record<string, unknown> }) {
    const old = myBest(p.mode);
    if (old && old.score >= p.score) return { accepted: false, rank: 1, reason: 'Not a new best' };
    const me = getProfile();
    const e: BoardEntry = { profileId: me.id, username: me.username, avatarUrl: null, score: p.score, duration: p.duration, submittedAt: Date.now(), rank: 1, metadata: p.metadata ?? null };
    try {
      localStorage.setItem(boardKey(p.mode), JSON.stringify(e));
    } catch {
      /* storage full */
    }
    return { accepted: true, rank: 1 };
  },
  async getPagedScores(o: { mode?: string } = {}) {
    const me = myBest(o.mode);
    return { variant: 'standard', entries: me ? [me] : [], totalEntries: me ? 1 : 0, nextCursor: null, playerRank: me ? 1 : null, periodInstance: 'alltime' };
  },
  async getMyRank(o: { mode?: string } = {}) {
    const me = myBest(o.mode);
    return { rank: me ? 1 : null, score: me?.score ?? null, totalPlayers: me ? 1 : 0 };
  },
  async getPodiumScores(o: { mode?: string } = {}) {
    const me = myBest(o.mode);
    const list = me ? [me] : [];
    return {
      variant: 'highlight',
      entries: list,
      totalEntries: list.length,
      nextCursor: null,
      playerRank: me ? 1 : null,
      periodInstance: 'alltime',
      context: { topEntries: list, beforePlayer: [], playerEntry: me, afterPlayer: [], totalBefore: 0, totalAfter: 0, omittedBefore: 0, omittedAfter: 0 },
    };
  },
};

// ---------------------------------------------------------------- shared leaderboards (opt-in)
// Games with "leaderboard": "shared" in f12.config.json post scores to api/board.php.
// Players show up under a nickname made from fixed word lists (the server checks it),
// so nothing personal leaves the device. The device board above is kept too, as the
// fallback when the server can't be reached.

const NICK_ADJ = ['Brave', 'Bouncy', 'Cosmic', 'Turbo', 'Sneaky', 'Mighty', 'Fuzzy', 'Zippy', 'Jolly', 'Rocket', 'Sparkly', 'Wild', 'Lucky', 'Speedy', 'Giant', 'Tiny', 'Super', 'Happy', 'Clever', 'Thunder'];
const NICK_ANIMAL = ['Walrus', 'Panda', 'Tiger', 'Otter', 'Falcon', 'Llama', 'Koala', 'Shark', 'Moose', 'Gecko', 'Badger', 'Penguin', 'Dragon', 'Yak', 'Narwhal', 'Hippo', 'Fox', 'Rhino', 'Owl', 'Squid'];

/** This device's leaderboard nickname and secret, made once */
function boardIdentity(): { name: string; secret: string } {
  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]!;
  try {
    let name = localStorage.getItem('f12:board-name');
    if (!name) localStorage.setItem('f12:board-name', (name = `${pick(NICK_ADJ)} ${pick(NICK_ANIMAL)} ${Math.floor(Math.random() * 100)}`));
    let secret = localStorage.getItem('f12:board-secret');
    if (!secret) {
      const b = new Uint8Array(20);
      crypto.getRandomValues(b);
      localStorage.setItem('f12:board-secret', (secret = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')));
    }
    return { name, secret };
  } catch {
    return { name: 'Mystery Smasher', secret: '' };
  }
}

interface ServerEntry {
  id: string;
  name: string;
  score: number;
  duration: number;
  submittedAt: number;
  rank: number;
  me: boolean;
}

async function boardCall<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(GAME.board!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: GAME.slug, player: getProfile().id, ...body }),
  });
  const json = (await res.json().catch(() => ({ error: `Server error ${res.status}` }))) as T & { error?: string };
  if (!res.ok || json.error) throw new Error(json.error ?? `Server error ${res.status}`);
  return json;
}

function toEntry(e: ServerEntry): BoardEntry {
  return {
    profileId: e.me ? getProfile().id : `f12-board-${e.id}`,
    username: e.name,
    avatarUrl: null,
    score: e.score,
    duration: e.duration,
    submittedAt: e.submittedAt,
    rank: e.rank,
    metadata: null,
  };
}

async function boardTop(mode: string | undefined, limit: number) {
  const r = await boardCall<{ entries: ServerEntry[]; total: number; me: ServerEntry | null }>({ action: 'top', mode: mode ?? 'default', limit });
  return { entries: r.entries.map(toEntry), total: r.total, me: r.me ? toEntry(r.me) : null };
}

const sharedLeaderboard = {
  async submitScore(p: { score: number; duration: number; mode?: string; metadata?: Record<string, unknown> }) {
    const local = await deviceLeaderboard.submitScore(p);
    const id = boardIdentity();
    try {
      return await boardCall<{ accepted: boolean; rank: number | null; reason?: string }>({
        action: 'submit',
        mode: p.mode ?? 'default',
        name: id.name,
        secret: id.secret,
        score: p.score,
        duration: Math.round(p.duration),
      });
    } catch {
      return local;
    }
  },
  async getPagedScores(o: { mode?: string; limit?: number } = {}) {
    try {
      const t = await boardTop(o.mode, o.limit ?? 50);
      return { variant: 'standard', entries: t.entries, totalEntries: t.total, nextCursor: null, playerRank: t.me?.rank ?? null, periodInstance: 'alltime' };
    } catch {
      return deviceLeaderboard.getPagedScores(o);
    }
  },
  async getMyRank(o: { mode?: string } = {}) {
    try {
      const t = await boardTop(o.mode, 1);
      return { rank: t.me?.rank ?? null, score: t.me?.score ?? null, totalPlayers: t.total };
    } catch {
      return deviceLeaderboard.getMyRank(o);
    }
  },
  async getPodiumScores(o: { mode?: string; topCount?: number } = {}) {
    try {
      const t = await boardTop(o.mode, o.topCount ?? 10);
      const inTop = !!t.me && t.entries.some((e) => e.profileId === t.me!.profileId);
      return {
        variant: 'highlight',
        entries: t.entries,
        totalEntries: t.total,
        nextCursor: null,
        playerRank: t.me?.rank ?? null,
        periodInstance: 'alltime',
        context: {
          topEntries: t.entries,
          beforePlayer: [],
          playerEntry: t.me,
          afterPlayer: [],
          totalBefore: t.me ? (t.me.rank ?? 1) - 1 : 0,
          totalAfter: t.me ? t.total - (t.me.rank ?? 1) : 0,
          omittedBefore: t.me && !inTop ? Math.max(0, (t.me.rank ?? 1) - 1 - t.entries.length) : 0,
          omittedAfter: 0,
        },
      };
    } catch {
      return deviceLeaderboard.getPodiumScores(o);
    }
  },
};

const leaderboard = GAME.board ? sharedLeaderboard : deviceLeaderboard;

// ---------------------------------------------------------------- no store, no ads, no server simulation

const NOT_HERE = "isn't available on F12 Games";
const iap = {
  async getHardCurrencyBalance() {
    return 0;
  },
  async spendCurrency() {
    return { success: false, error: 'NOT_AVAILABLE' };
  },
  async openStore() {
    return { purchased: false, newBalance: 0 };
  },
};
const ads = {
  async isRewardedAdReadyAsync() {
    return false;
  },
  async showRewardedAdAsync() {
    return false;
  },
  async isInterstitialAdReadyAsync() {
    return false;
  },
  async showInterstitialAd() {
    return false;
  },
};
// nothing is sold here, so the catalog is empty and nobody owns anything
const shop = {
  async getCatalog() {
    return { configId: 'f12', items: [], collections: [] };
  },
  async getItemDetail(): Promise<never> {
    throw new Error(`shop ${NOT_HERE}`);
  },
  async purchase(): Promise<never> {
    throw new Error('direct-purchase-unavailable');
  },
  async purchaseCollectionItem(): Promise<never> {
    throw new Error('direct-purchase-unavailable');
  },
  async getOrderHistory() {
    return { success: true, orders: [] };
  },
};
const entitlements = {
  async listEntitlements() {
    return [];
  },
  async getQuantity() {
    return 0;
  },
  async consumeEntitlement(): Promise<never> {
    throw new Error('Entitlement not found');
  },
  async getLedger() {
    return [];
  },
};
const simulation = {
  isEnabled: () => false,
  async getStateAsync(): Promise<never> {
    throw new Error(`simulation ${NOT_HERE}`);
  },
  async executeRecipeAsync(): Promise<never> {
    throw new Error(`simulation ${NOT_HERE}`);
  },
  async subscribeAsync(): Promise<never> {
    throw new Error(`simulation ${NOT_HERE}`);
  },
};

// ---------------------------------------------------------------- time (the device clock stands in for the server)

function requestTimeAsync() {
  const now = new Date();
  return Promise.resolve({
    serverTime: now.getTime(),
    localTime: now.getTime(),
    timezoneOffset: now.getTimezoneOffset(),
    formattedTime: now.toLocaleString(),
    locale: navigator.language,
  });
}

function getFutureTimeAsync(opts: {
  days?: number;
  hours?: number;
  minutes?: number;
  timeOfDay?: { hour: number; minute: number; second: number };
} = {}) {
  const d = new Date();
  if (opts.days) d.setDate(d.getDate() + opts.days);
  if (opts.hours) d.setHours(d.getHours() + opts.hours);
  if (opts.minutes) d.setMinutes(d.getMinutes() + opts.minutes);
  if (opts.timeOfDay) d.setHours(opts.timeOfDay.hour, opts.timeOfDay.minute, opts.timeOfDay.second, 0);
  return Promise.resolve(d.getTime());
}

// ---------------------------------------------------------------- the API

function log(...args: unknown[]) {
  console.log('[game]', ...args);
}
function error(...args: unknown[]) {
  console.error('[game]', ...args);
}

// ---------- popups (toasts; Like and Comments are RUN-only) ----------
let toastEl: HTMLDivElement | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** A small plain toast at the bottom of the screen; no links, no buttons. */
async function showToast(message: string, options?: { duration?: number }): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.setAttribute('role', 'status');
    toastEl.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:86vw;padding:10px 16px;border-radius:12px;background:rgba(16,8,32,.92);color:#fff;font:600 16px/1.3 system-ui,sans-serif;z-index:2147483000;pointer-events:none;opacity:0;transition:opacity .2s;text-align:center';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = String(message).slice(0, 200);
  toastEl.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (toastEl) toastEl.style.opacity = '0'; }, Math.min(8000, options?.duration ?? 2500));
  return true;
}
// No accounts and no free-text comments on a kids' platform: both report unavailable,
// so games hide their Like and Comments buttons.
const popups = {
  showToast,
  canShowLikeDialog: async () => ({ available: false }),
  canShowCommentsPanel: async () => ({ available: false }),
  getLikeState: async () => ({ isLiked: false, likesCount: 0 }),
  showLikeDialog: async () => ({ shown: false as const, reason: 'unavailable' as const }),
  showCommentsPanel: async () => ({ shown: false as const, reason: 'unavailable' as const }),
};

/** Back out of the game: return to the F12 Games portal. */
async function requestPopOrQuit(): Promise<boolean> {
  try { window.location.href = '/'; return true; } catch { return false; }
}

const api: Record<string, unknown> = {
  appStorage: makeStorage(NS),
  deviceCache: makeStorage(`${NS}device:`),
  globalStorage: makeStorage('f12:global:'),
  cdn: { fetchAsset, resolveAssetUrl: (p: string) => `${import.meta.env.BASE_URL}cdn-assets/${p}` },
  realtime,
  lifecycles: {
    onPause: on(hooks.pause),
    onResume: on(hooks.resume),
    onSleep: on(hooks.sleep),
    onAwake: on(hooks.awake),
    onQuit: on(hooks.quit),
  },
  analytics: { recordCustomEvent: async () => undefined, trackFunnelStep: async () => undefined },
  // deprecated on RUN (the SDK starts on import); here everything is ready at once
  initializeAsync: async () => undefined,
  triggerHapticAsync,
  requestTimeAsync,
  getFutureTimeAsync,
  formatTime: (t: number, o?: Intl.DateTimeFormatOptions) => new Date(t).toLocaleString(undefined, o),
  formatNumber: (n: number, o?: Intl.NumberFormatOptions) => n.toLocaleString(undefined, o),
  system,
  getProfile,
  gamepad,
  leaderboard,
  iap,
  ads,
  shop,
  entitlements,
  simulation,
  // no tracking: nobody is followed in from a campaign link
  attribution: { getAttributionParams: async () => null },
  // nobody is the game's owner or editor here, so tester tools stay hidden
  app: { getMyRole: async () => 'none' },
  log,
  error,
  logging: { logDebug: log, logError: error },
  // RUN sets this once the host is ready; on F12 the page itself is the host
  context: { platform: 'f12-games' },
  popups,
  requestPopOrQuit,
};

/** Unknown SDK features warn once and do nothing, so a stray call can't crash the game. */
const warned = new Set<string>();
function stub(path: string): unknown {
  return new Proxy(() => undefined, {
    get: (_t, k) => (k === 'then' ? undefined : stub(`${path}.${String(k)}`)),
    apply: () => {
      if (!warned.has(path)) {
        warned.add(path);
        console.warn(`[F12 Games] RundotGameAPI.${path} isn't available outside RUN`);
      }
      return undefined;
    },
  });
}

const RundotGameAPI = new Proxy(api, {
  get: (t, k: string) => (k in t ? t[k] : stub(k)),
});

export default RundotGameAPI;
