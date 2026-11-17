// Versioned, cloud-synced save system for RUN games.
//
// Model: one JSON blob in RundotGameAPI.appStorage (per-title, cloud-synced).
// The live in-memory object IS the save — gameplay code mutates it directly,
// then calls save() (discrete events) or markDirty() (continuous counters,
// flushed by tick() at most once per debounceSeconds of gameplay).
//
// Durability comes from three layers, in order of importance:
//   1. save() at every meaningful state change (cheap: fire-and-forget)
//   2. attachLifecycleFlush(): flush on onPause (the save point), plus
//      onSleep/onQuit as extra best-effort triggers
//   3. tick(): debounced flush of high-frequency dirty state during play
//
// Lifecycle callbacks are NOT awaited by the host. A save started in onQuit
// may never finish. Do not rely on it.
//
// Loading: load() makes one cloud read and never retries it, so boot does
// not wait on a failing store. If the read fails, the game plays on
// defaultSave() and every write is blocked for the session: the stored save is
// never overwritten, and nothing is merged later. That session's progress is
// not saved.
//
// Size: every write sends the whole blob. Save state, not history: counters,
// unlocks, and capped lists. Never append to a list that has no limit. A
// flush logs one warning per session when the save is larger than 64 KB.
//
// Schema evolution:
//   - Purely additive fields need NO migration: add them to defaultSave() and
//     the generic back-fill fills them into old saves on load.
//   - Shape changes get a numbered migration function (see README playbook).
//   - A stored blob that cannot be parsed, or that fails migration or
//     validation, is NOT overwritten. The game boots on defaultSave() in
//     memory, loadStatus becomes { kind: 'corrupt' }, and every write is
//     blocked. The raw stored text stays readable via corruptRaw. The game
//     recovers only by calling acceptCorruptReset() (an explicit choice).
//
// Typing: createSaveSystem is generic over the game's save shape. Define the
// shape once and everything downstream is typed:
//
//   interface MySave { version: number; coins: number; ... }
//   const saveSystem = createSaveSystem<MySave>({ ... });
//   const save = await saveSystem.load();   // save: MySave

import RundotGameAPI from '@series-inc/rundot-game-sdk/api';

/**
 * A save blob as loaded from storage BEFORE migrations have run — an unknown
 * historical shape. Migrations receive this and are responsible for reshaping
 * it toward the current schema.
 */
export type LegacySave = Record<string, any> & { version?: number };

/**
 * Migration to one target version. Mutate `s` in place, or return a
 * replacement object (e.g. `return def` for a hard reset). May be async.
 * Runs exactly once per save: the version is stamped after it.
 */
export type Migration<S extends object> =
    (s: LegacySave, def: S) => LegacySave | void | Promise<LegacySave | void>;

export interface SaveSystemConfig<S extends { version: number }> {
    /** Storage key, e.g. 'my-game-save'. Rules: ≤256 bytes, no '.', no leading '__'. */
    key: string;
    /** Current schema version. Bump whenever the shape changes (not for additive fields). */
    version: number;
    /**
     * Returns a fresh save object with EVERY field defaulted. Single source of
     * truth for the schema; the back-fill loop fills old saves from it.
     */
    defaultSave: () => S;
    /**
     * Map of targetVersion -> migration fn, run in ascending order for saves
     * with version < targetVersion.
     */
    migrations?: Record<number, Migration<S>>;
    /**
     * Runs after migrations + top-level back-fill on every load. Use it for
     * nested-shape guards: coerce wrong types, clamp numbers, pad/truncate
     * fixed-length arrays, fillMissing() nested maps. Protects against partial
     * writes and hand-edited saves. (The object is only S-shaped after this
     * completes, hence the LegacySave parameter type.)
     */
    validate?: (s: LegacySave, def: S) => void;
    /** Max flush rate for tick()-driven dirty state. Default 5. */
    debounceSeconds?: number;
}

/**
 * Status of load().
 * - idle:       load() has not resolved yet. data is null.
 * - loaded:     a valid cloud save was read. Writes are allowed.
 * - fresh:      no save exists (new player). Writes are allowed.
 * - readFailed: the read threw. The game plays on defaults and writes are
 *               blocked for the session.
 * - corrupt:    the stored blob exists but cannot be parsed or migrated.
 *               Writes are blocked. Only acceptCorruptReset() unblocks them.
 *
 * In loaded, fresh, readFailed and corrupt, importJson() can write a backup
 * over the stored save. Then nothing else is written until the page reloads.
 * - newerVersion: the stored save has a higher version than this build (an
 *               old tab or an old app). The game plays on defaults and writes
 *               are blocked for the session, so the old build never
 *               overwrites the newer save. Never offer a reset here.
 */
export type LoadStatus =
    | { kind: 'idle' }
    | { kind: 'loaded' }
    | { kind: 'fresh' }
    | { kind: 'readFailed'; error: unknown }
    | { kind: 'corrupt'; error: unknown }
    | { kind: 'newerVersion'; storedVersion: number };
/** A flush warns once per session above this size, in UTF-8 bytes. */
const SIZE_WARN_BYTES = 64 * 1024;

export interface SaveSystem<S extends { version: number }> {
    /** The live save object. Assigned by load(); mutate it directly. Null before load() resolves. */
    data: S | null;
    /** Status of load(). See LoadStatus. */
    readonly loadStatus: LoadStatus;
    /**
     * True when save() and flush() can reach storage: load() found a valid
     * save or no save. False before load(), and after a failed read, a corrupt
     * save, or a newer save. Check it before you sell an item that only the
     * save keeps: when it is false, the item is lost at the end of the session.
     */
    readonly canSave: boolean;
    /**
     * The raw stored text that load() found unusable, or null. Set only when
     * loadStatus is 'corrupt'. Copy it out BEFORE acceptCorruptReset():
     * accepting overwrites the stored blob.
     */
    readonly corruptRaw: string | null;
    /**
     * Read + migrate + back-fill. Call once at boot.
     * Never throws. One read, no retry: a failed read resolves with defaults
     * and blocks writes for the session. Later calls return the same data and
     * do not read again.
     */
    load(): Promise<S>;
    /** Immediate fire-and-forget persist. Retries via tick() if write fails. */
    save(): void;
    /**
     * Awaited persist. Never throws. Resolves when the write succeeds. A
     * failed write logs a warning and keeps the data dirty, so the next
     * save(), flush(), or tick() retries it.
     */
    flush(): Promise<void>;
    /** Mark high-frequency state as needing a debounced flush. */
    markDirty(): void;
    /**
     * Call from the game loop with elapsed seconds; flushes dirty state on the
     * debounce interval. A game with no loop must call flush() itself to retry
     * a failed write.
     */
    tick(dt: number): void;
    /** Register onPause (save point), onSleep, and onQuit flush handlers. Call once at boot. */
    attachLifecycleFlush(): void;
    /**
     * Explicitly accept a reset after loadStatus became 'corrupt'. Writes the
     * in-memory data (defaults unless the game changed them) and unblocks
     * writes. Resolves true when the write succeeds. No-op (false) in any
     * other status.
     */
    acceptCorruptReset(): Promise<boolean>;
    /** Pretty JSON of the LIVE state (reflects un-flushed changes). */
    exportJson(): string;
    /**
     * Write a backup to storage verbatim (unmigrated), after the same
     * migrate + validate check as load(). The live data does not change, and
     * nothing else is written this session: reload to play on the backup.
     * Rejects (false, nothing written) when the backup cannot be migrated or
     * validated, before load() resolves, or when the stored save is from a
     * newer build (newerVersion). Resolves true if written. Once the write is
     * sent, writes stay blocked until reload, even if the write fails.
     */
    importJson(jsonStr: string): Promise<boolean>;
    /** Expose window.<name>.export()/.import(json) console helpers for QA. .import() reloads the page after a successful import. */
    exposeConsoleHelpers(name: string): void;
}

/** UTF-8 size of a string. Needs no TextEncoder, so it cannot throw. */
function utf8Bytes(text: string): number {
    let bytes = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c < 0x80) bytes += 1;
        else if (c < 0x800) bytes += 2;
        else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) { bytes += 4; i++; }
        else bytes += 3;
    }
    return bytes;
}

/** True when writes must not reach storage. */
function writesBlocked(status: LoadStatus): boolean {
    switch (status.kind) {
        case 'loaded':
        case 'fresh':
            return false;
        case 'idle':
        case 'readFailed':
        case 'corrupt':
        case 'newerVersion':
            return true;
    }
}


export function createSaveSystem<S extends { version: number }>(
    config: SaveSystemConfig<S>,
): SaveSystem<S> {
    const {
        key,
        version,
        defaultSave,
        migrations = {},
        validate = null,
        debounceSeconds = 5,
    } = config;

    let _dirty = false;
    let _timer = 0;
    let _generation = 0;
    /** Generation of the newest snapshot the host confirmed. */
    let _savedGen = 0;
    let _sizeWarned = false;
    let _loadStatus: LoadStatus = { kind: 'idle' };
    let _corruptRaw: string | null = null;
    let _loadPromise: Promise<S> | null = null;
    /**
     * Set when importJson() starts its write. From then on nothing else is
     * written: the live data is older than the backup until the page reloads.
     */
    let _importWritten = false;

    // load() runs once, while data is still null.
    const assignData = (source: S): S => {
        sys.data = source;
        return source;
    };

    /**
     * Migrations (ascending), top-level back-fill, validate, then stamp the
     * version. Throws when a migration or validate step throws. load() and
     * importJson() both use this one path.
     */
    const migrateAndValidate = async (input: LegacySave, def: S): Promise<S> => {
        if (typeof input.version === 'number' && input.version > version) {
            throw new Error(`Save version ${input.version} is newer than this build (version ${version}).`);
        }
        let s = input;
        // Versioned migrations, ascending. A missing version counts as 0.
        const targets = Object.keys(migrations).map(Number).sort((a, b) => a - b);
        for (const v of targets) {
            if ((s.version || 0) < v) {
                const replacement = await migrations[v](s, def);
                if (replacement) s = replacement;
                s.version = v;
            }
        }

        // Generic back-fill: any top-level key added to defaultSave()
        // after this save was created gets its default. This is why
        // additive schema changes need no migration block.
        for (const k of Object.keys(def) as Array<keyof S & string>) {
            if (!(k in s)) s[k] = def[k];
        }

        if (validate) validate(s, def);

        // Stamp so future loads know every migration above has run.
        // After migrations + back-fill + validate, s IS the current shape.
        s.version = version;
        return s as S;
    };

    const sys: SaveSystem<S> = {
        data: null,

        get loadStatus(): LoadStatus {
            return _loadStatus;
        },

        get canSave(): boolean {
            return !_importWritten && !writesBlocked(_loadStatus);
        },

        get corruptRaw(): string | null {
            return _loadStatus.kind === 'corrupt' ? _corruptRaw : null;
        },

        /**
         * Read + migrate + back-fill. Never throws. A failed read sets
         * 'readFailed' and a blob that cannot be parsed or migrated sets
         * 'corrupt'. Both resolve with defaults and block writes, so a bad
         * read never overwrites the stored save. After the first load, later
         * calls return the same live object and do not read again.
         */
        load(): Promise<S> {
            if (_loadStatus.kind !== 'idle' && sys.data) return Promise.resolve(sys.data);
            if (_loadPromise) return _loadPromise;
            // importJson() and acceptCorruptReset() need a finished load, so
            // no import or reset write can be pending here.
            _loadPromise = (async () => {
                let raw: string | null | undefined;
                let readError: unknown = null;
                try {
                    raw = await RundotGameAPI.appStorage.getItem(key);
                } catch (err) {
                    readError = err ?? new Error('Storage read failed');
                }

                const def = defaultSave();
                // Nothing could change the data before this point (it was null).
                _dirty = false;
                _savedGen = _generation;
                _timer = 0;

                if (readError !== null) {
                    console.warn(`[SaveSystem] Storage read failed for key '${key}'. Playing on defaults; nothing is saved this session, so the stored save is not overwritten.`, readError);
                    _loadStatus = { kind: 'readFailed', error: readError };
                    return assignData(def);
                }

                if (raw === null || raw === undefined) {
                    _loadStatus = { kind: 'fresh' };
                    return assignData(def);
                }

                // Stored text exists. Parse, migrate, and validate it. On any
                // failure the blob stays in storage untouched, and writes stay
                // blocked until the game calls acceptCorruptReset().
                let migrated: S;
                try {
                    const parsed: unknown = JSON.parse(raw);
                    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                        throw new Error('Stored save is not a JSON object.');
                    }
                    const storedVersion = (parsed as LegacySave).version;
                    if (typeof storedVersion === 'number' && storedVersion > version) {
                        console.warn(`[SaveSystem] Stored save for key '${key}' has version ${storedVersion}, newer than this build (version ${version}). Playing on defaults; nothing is saved this session, so the newer save is not overwritten.`);
                        _loadStatus = { kind: 'newerVersion', storedVersion };
                        return assignData(def);
                    }
                    migrated = await migrateAndValidate(parsed as LegacySave, def);
                } catch (err) {
                    console.error(`[SaveSystem] Stored save for key '${key}' is corrupt or failed migration. Writes are blocked until acceptCorruptReset().`, err);
                    _loadStatus = { kind: 'corrupt', error: err };
                    _corruptRaw = raw;
                    return assignData(def);
                }
                _loadStatus = { kind: 'loaded' };
                return assignData(migrated);
            })().finally(() => {
                _loadPromise = null;
            });
            return _loadPromise;
        },

        /**
         * Call after every meaningful discrete state change (purchase, unlock,
         * level end, settings change). Cheap: the whole object serializes each
         * time, so there is no partial-write state to corrupt.
         */
        save(): void {
            _generation += 1;
            _dirty = true;
            void sys.flush();
        },

        /**
         * Sends the current snapshot at once, without waiting for an earlier
         * write: the host keeps the newest value per key and sends writes in
         * call order, so a pause or quit save never waits behind a slow one.
         * The data stays dirty until the host confirms the newest snapshot.
         */
        async flush(): Promise<void> {
            if (!sys.data || _importWritten || writesBlocked(_loadStatus)) return;
            const gen = _generation;
            let payload: string;
            try {
                payload = JSON.stringify(sys.data);
            } catch (err) {
                console.warn(`[SaveSystem] Failed to serialize save for key '${key}'.`, err);
                return;
            }
            // A UTF-16 unit is at most 3 UTF-8 bytes, so most saves skip the count.
            const bytes = !_sizeWarned && payload.length * 3 > SIZE_WARN_BYTES
                ? utf8Bytes(payload)
                : 0;
            if (bytes > SIZE_WARN_BYTES) {
                _sizeWarned = true;
                console.warn(`[SaveSystem] Save '${key}' is ${bytes} bytes. Every write sends the whole save, so a large save is slow. Keep state, not history: cap lists and drop logs.`);
            }
            try {
                await RundotGameAPI.appStorage.setItem(key, payload);
                if (gen > _savedGen) _savedGen = gen;
                if (_savedGen >= _generation) _dirty = false;
            } catch (err) {
                console.warn(`[SaveSystem] Failed to flush save for key '${key}'. Still dirty; the next save(), flush(), or tick() retries.`, err);
            }
        },

        /**
         * Mark high-frequency state (per-frame stats, timers) as needing a
         * flush. tick() will persist it at most once per debounceSeconds.
         */
        markDirty(): void {
            _generation += 1;
            _dirty = true;
        },

        tick(dt: number): void {
            if (!_dirty) return;
            _timer += dt;
            if (_timer > debounceSeconds) {
                _timer = 0;
                void sys.flush();
            }
        },

        /**
         * onPause is the save point: RUN sends it whenever the player leaves
         * the game, and the host does not wait for the callback. onSleep and
         * onQuit are extra, best-effort triggers. Do NOT add other RPCs
         * (notifications etc.) to these handlers; schedule that work while
         * the app is alive.
         */
        attachLifecycleFlush(): void {
            try {
                RundotGameAPI.lifecycles.onPause(() => {
                    void sys.flush();
                });
                RundotGameAPI.lifecycles.onSleep(() => {
                    void sys.flush();
                });
                RundotGameAPI.lifecycles.onQuit(() => {
                    void sys.flush();
                });
            } catch { /* mock mode without lifecycles */ }
        },

        /**
         * Explicit reset after 'corrupt'. Writes the in-memory data (defaults
         * unless the game changed them) and unblocks writes on success. The
         * raw stored text is discarded only after this write succeeds.
         */
        async acceptCorruptReset(): Promise<boolean> {
            if (_loadStatus.kind !== 'corrupt' || !sys.data || _importWritten) return false;
            const gen = _generation;
            let payload: string;
            try {
                payload = JSON.stringify(sys.data);
            } catch (err) {
                console.warn(`[SaveSystem] Failed to serialize reset for key '${key}'.`, err);
                return false;
            }
            // Writes are blocked while the status is corrupt, so no other
            // write of this key is pending.
            try {
                await RundotGameAPI.appStorage.setItem(key, payload);
            } catch (err) {
                console.warn(`[SaveSystem] Reset write failed for key '${key}'. Writes stay blocked; corruptRaw still holds the stored text.`, err);
                return false;
            }
            if (_importWritten) return false;
            _loadStatus = { kind: 'loaded' };
            _corruptRaw = null;
            if (gen > _savedGen) _savedGen = gen;
            if (_savedGen >= _generation) _dirty = false;
            else void sys.flush();
            return true;
        },

        exportJson(): string {
            return JSON.stringify(sys.data, null, 2);
        },

        /**
         * Write a backup verbatim to storage, after the same migrate + validate
         * check as load(). After the write, nothing else is written this
         * session: reload the page to play on the backup.
         */
        async importJson(jsonStr: string): Promise<boolean> {
            // An import before load() would write over a save that this build
            // has not read, which can be a save from a newer build.
            if (_loadStatus.kind === 'idle') {
                console.warn(`[SaveSystem] Import rejected for key '${key}': call load() first.`);
                return false;
            }
            // This build cannot read a save from a newer build, so an import
            // from here would replace it with older data. Leave it as it is.
            if (_loadStatus.kind === 'newerVersion') {
                console.warn(`[SaveSystem] Import rejected for key '${key}': the stored save is from a newer build.`);
                return false;
            }
            let parsed: unknown;
            try { parsed = JSON.parse(jsonStr); } catch { return false; }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
            // Serialize before migrating: migrate mutates `parsed` in place.
            const verbatim = JSON.stringify(parsed);
            try {
                await migrateAndValidate(parsed as LegacySave, defaultSave());
            } catch (err) {
                console.warn(`[SaveSystem] Import rejected for key '${key}': migration or validation failed.`, err);
                return false;
            }
            // One import per session. Check after the await: another import
            // can start while this one validates.
            if (_importWritten) return false;
            // Stop every other write before this one is sent. The host sends
            // writes of a key in call order, so a snapshot sent earlier cannot
            // land after the backup, and none is sent later. The flag stays set
            // even if the write fails: a rejected write can still land later,
            // so no other write may follow it in this session.
            _importWritten = true;
            try {
                await RundotGameAPI.appStorage.setItem(key, verbatim);
            } catch (err) {
                console.warn(`[SaveSystem] Import write failed for key '${key}'. Nothing else is written this session; reload and import again.`, err);
                return false;
            }
            return true;
        },

        /**
         * Safe to ship: it only touches this save key.
         */
        exposeConsoleHelpers(name: string): void {
            if (typeof window === 'undefined') return;
            (window as any)[name] = {
                export(): string {
                    const json = sys.exportJson();
                    // .catch: writeText rejects ASYNC (denied permission) — a
                    // sync try/catch alone leaves an unhandled rejection.
                    try { navigator.clipboard?.writeText(json).catch(() => {}); } catch { /* best-effort */ }
                    console.log(json);
                    return json;
                },
                async import(jsonStr: string): Promise<boolean> {
                    const ok = await sys.importJson(jsonStr);
                    console.log(ok ? 'Imported. Reloading to play on the backup.' : 'Import rejected: see the warning above.');
                    if (ok) location.reload();
                    return ok;
                },
            };
        },
    };

    return sys;
}

/**
 * Back-fill helper for nested maps inside validate():
 *   fillMissing(s.stats, def.stats)   // new stat keys default in old saves
 * Shallow by design — call it per subtree you care about.
 */
export function fillMissing<T extends Record<string, any>>(target: T, defaults: T): T {
    for (const k of Object.keys(defaults)) {
        if (!(k in target)) (target as Record<string, any>)[k] = defaults[k];
    }
    return target;
}
