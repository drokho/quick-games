# Save System — versioned, cloud-synced persistence

A single-blob JSON save persisted to `RundotGameAPI.appStorage` (per-title, cloud-synced), with schema versioning, ordered migrations, automatic back-fill of newly added fields, debounced writes during gameplay, lifecycle flush on background/quit, and JSON export/import for QA backups.

**This is the foundational system.** Stats, daily rewards, tutorials, and IAP ownership all persist as fields inside this save blob. If the host game has no save system, integrate this first.

## Files

| File | Copy to host? | Purpose |
|---|---|---|
| `save.ts` | yes (e.g. `src/helpers/save.ts`) | all machinery — you should not need to edit it |
| `README.md` | no | this guide |

No dependencies beyond the RUN SDK. TypeScript; if the host game is plain JavaScript, strip the type annotations while copying (see the root README's integration protocol).

## Quick integration

### 1. Write the game's save config (new file, e.g. `src/saveConfig.ts`)

The save shape is a single interface; `createSaveSystem` is generic over it, so `saveSystem.load()` / `.data` are fully typed everywhere downstream.

```ts
import { createSaveSystem, fillMissing } from './helpers/save';

// ADAPT: every field your game needs to persist, with its default.
// The interface + defaultSave() are the schema. Adding a field later = add it
// in both places; old saves get it automatically on next load (no migration).
export interface MySave {
    version: number;
    coins: number;
    gems: number;
    upgrades: string[];          // owned upgrade ids
    stats: {                     // see systems/stats (lives inside the save)
        gamesPlayed: number;
    };
    settings: {
        sfxVolume: number;       // numeric 0..1 (not booleans — sliders later)
        musicVolume: number;
        haptics: boolean;
    };
    // one-shot flags (tutorials seen, popups shown) also live here
}

export function defaultSave(): MySave {
    return {
        version: 1,
        coins: 0,
        gems: 0,
        upgrades: [],
        stats: {
            gamesPlayed: 0,
        },
        settings: {
            sfxVolume: 1,
            musicVolume: 0.5,
            haptics: true,
        },
    };
}

export const saveSystem = createSaveSystem<MySave>({
    key: 'my-game-save',         // ADAPT: '<game-name-kebab>-save'
    version: 1,                  // bump when the SHAPE changes (see playbook)
    defaultSave,
    migrations: {
        // ADAPT: empty until you ship a shape change. Examples in the playbook.
    },
    validate(s, def) {
        // ADAPT: nested-shape guards for anything beyond top-level fields.
        // `s` is typed LegacySave (unknown historical shape) on purpose —
        // these guards are what MAKE it a valid MySave.
        if (typeof s.stats !== 'object' || !s.stats) s.stats = def.stats;
        fillMissing(s.stats, def.stats);
        if (typeof s.settings !== 'object' || !s.settings) s.settings = def.settings;
        fillMissing(s.settings, def.settings);
        if (!Array.isArray(s.upgrades)) s.upgrades = [];
        if (!(s.coins >= 0)) s.coins = 0;   // also catches NaN/undefined
        if (!(s.gems >= 0)) s.gems = 0;
    },
});
```

### 2. Boot wiring

```ts
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { saveSystem } from './saveConfig';

game.save = await saveSystem.load();       // never throws; one cloud read, no retry
saveSystem.attachLifecycleFlush();         // onPause (save point) + onSleep/onQuit
saveSystem.exposeConsoleHelpers('myGameSave');  // optional QA backup/restore
```

`load()` makes one read, and the save system never retries it. (The RUN host retries a failed read for up to about 15 seconds before it reports the failure.) If the read fails, `load()` resolves with `defaultSave()`, the status is `readFailed`, and nothing is written for the rest of the session. The stored save is never overwritten, and a later read is never merged in. Progress made in that session is not saved.

If `saveSystem.loadStatus.kind` is `'corrupt'` after load, the stored save could not be read. See "Load statuses" below before you show any reset UI.

`game.save` and `saveSystem.data` are the same object; expose it wherever the host keeps shared state. (`.data` is typed `MySave | null` — null only before `load()`; hold the object `load()` returns and you never need a null check.)

### 3. Game loop (only needed for high-frequency state)

```ts
function update(dt: number): void {  // dt in seconds
    game.save.stats.playTimeSec += dt;   // example continuous counter
    saveSystem.markDirty();
    saveSystem.tick(dt);                 // flushes at most every 5s
}
```

`tick()` is also the retry loop for a failed write. If the host game has no per-frame loop (turn-based, event-driven), skip `tick()`, call `save()` on events, and call `saveSystem.flush()` yourself on a timer or at each save point. A game with no `tick()` loop must call a retry itself. Otherwise a failed write waits until the next `save()` or the next `onPause`.

### 4. Everywhere state changes

```ts
game.save.coins += reward;
saveSystem.save();              // fire-and-forget; call liberally (~cheap)
```

Rule of thumb: **immediate `save()` on every discrete event** (purchase, unlock, level end, settings change), `markDirty()` for per-frame counters.

## Save points and lifecycle

- **`onPause` is the save point.** RUN sends it when the player leaves the game (host overlay, app background, tab hidden). `attachLifecycleFlush()` flushes there.
- **`onSleep` and `onQuit` are extra, best-effort triggers.** Older RUN versions never send `onSleep`. `onQuit` can be cut off by a hard close.
- **The host does not wait for a lifecycle callback.** Callbacks are typed `() => void`, and the SDK drops any returned promise. Do not write `onQuit(async () => { await save() })` and expect the save to finish. Start the save early (in `onPause`), and keep the data dirty so a later trigger retries it.
- **Do not put fresh SDK RPCs** (notification scheduling, analytics) in `onSleep` or `onQuit`. A hard close tears down the runtime first.

## Write durability

- `save()` and `markDirty()` mark the data dirty. A write clears the dirty flag only after the server accepts it.
- `flush()` resolves when the write succeeds. On failure it logs a warning, keeps the data dirty, and returns. It never throws. The next `save()`, `flush()`, `tick()`, or `onPause` retries.
- A load error is never an empty save. After a failed read, the session plays on defaults and writes nothing (see the statuses below).
- Every write sends the whole save. Keep it small: save state, not history (counters, unlocks, capped lists). Never append to a list that has no limit. A flush logs one warning per session above 64 KB.
- Save to `appStorage` only. Do not mirror the save to `deviceCache`: its key has no player id and survives sign-out, so another account on the same device can load the save and write it to that account.

## Load statuses

`saveSystem.loadStatus.kind` is one of:

| Status | Meaning | Writes |
|---|---|---|
| `idle` | `load()` has not resolved. `data` is null. | Blocked (no data yet) |
| `loaded` | A valid stored save was read and migrated. | Allowed |
| `fresh` | Nothing is stored. A new player. | Allowed |
| `readFailed` | The storage read threw (timeout, rate limit, suspension). The game plays on defaults. | Blocked for the session. |
| `corrupt` | The stored text is not valid JSON, is not an object, or fails a migration or `validate()`. | Blocked until `acceptCorruptReset()` |
| `newerVersion` | The stored save has a higher `version` than this build (an old tab or an old app). The game plays on defaults. | Blocked for the session, so the old build never overwrites the newer save. `importJson()` is rejected too. Never offer a reset here. |

`saveSystem.canSave` is `true` only for `loaded` and `fresh`. Check it before you sell anything that only the save keeps (an item bought with Bits, a paid bonus). When it is `false`, the purchase is lost at the end of the session, so do not sell.

Rules for `corrupt`:

- The game boots on `defaultSave()` in memory, so the game still runs.
- The stored blob is **never overwritten** by defaults. `flush()` writes nothing.
- `saveSystem.corruptRaw` returns the raw stored text. Copy it out for support before you accept a reset.
- `await saveSystem.acceptCorruptReset()` writes the current in-memory data and unblocks writes. Call it only after an explicit player or support choice. It resolves `false` if the write fails, and the status stays `corrupt`.
- `importJson()` checks the backup the same way (migrate, then validate). A backup that cannot be migrated is rejected, and nothing is written. An import before `load()` resolves is rejected too: it would write over a save that this build has not read.
- After `importJson()` sends its write, nothing else is written this session, even if that write fails, and the live data does not change. Reload the page to play on the backup (or to import again). The console helper `.import()` reloads for you after a success.

## Migration playbook

- **Additive field** (new currency, new flag): add to the `MySave` interface and `defaultSave()`. Done — the back-fill loop fills it into old saves. No version bump required.
- **Nested additive field** (new key inside `stats`): add to the interface and `defaultSave()` *and* make sure `validate()` calls `fillMissing()` on that subtree.
- **Shape change** (rename, type change, restructure): bump `version` and add a migration. Migrations receive `LegacySave` (the old, untyped shape) — that's the correct type, since the incoming blob predates your current interface:

```ts
version: 2,
migrations: {
    // v1 stored ownedPets as a count; v2 stores an array of ids
    2(s, def) {
        if (typeof s.ownedPets === 'number') {
            s.ownedPets = DEFAULT_PET_IDS.slice(0, s.ownedPets);
        }
        if (!Array.isArray(s.ownedPets)) s.ownedPets = [];
    },
},
```

- **Derived back-fill** (new feature shouldn't retro-trigger for veterans): compute from existing progress inside the migration, e.g. mark unlock popups as already-seen for players past the unlock point.
- **Hard reset** (schema drifted beyond repair — rare escape hatch, loses player progress, avoid after launch): `2(s, def) { return def; }` — returning an object replaces the save.
- **A migration that throws** does not reset the save. The load status becomes `corrupt`, and writes stay blocked. Fix the migration and ship it. Do not catch the error and return defaults.

Each migration runs exactly once per save (version-gated, stamped after). Keep old migrations forever; a player can return after any number of versions.

## Derive from the host game (do not ask the user)

| Decision | How to derive it |
|---|---|
| `key` | kebab-case the game's name from `package.json`/`index.html` title + `-save` |
| What goes in `MySave`/`defaultSave()` | scan the host code for mutable progression state: currencies, inventories, unlocks, settings, one-shot UI flags, stat counters. Anything reset on refresh today that shouldn't be. |
| Where to call `load()` | the host's boot path, before the first screen needs saved state |
| Where to call `tick(dt)` | the host's main update loop, if one exists |
| Existing persistence to replace | grep for `localStorage`/`appStorage` usage — browser storage doesn't work in the production RUN iframe; migrate any such state into this system |

## SDK notes & limits

- `appStorage` values are strings; the blob comfortably fits **256 KiB** (hard cap ~977 KiB). One blob is the right call until you approach that; past it, split by lifecycle (`settings` / `progress` / `inventory`) per SDK guidance.
- Key rules: ≤256 bytes, no `.`, no leading `__`.
- Cloud sync is transparent and **last-write-wins** across devices — there is no merge. Don't design multi-device simultaneous play around this.
- Storage calls in `save.ts` never throw. A failed write is logged and stays dirty, so it is retried, and the game keeps running.
- Very large numbers (idle-game currencies beyond 2^53) lose precision as raw JSON numbers — store those as strings and parse at the edges.
- `importJson` writes the backup verbatim (unmigrated), so the next boot exercises the real migration path.

## Verification checklist

1. Fresh profile boots with `defaultSave()` values (mock mode: clear storage or use a new key).
2. Change state → `save()` → reload → change persisted.
3. Hand-corrupt the stored value (console: `RundotGameAPI.appStorage.setItem(key, '{oops')`) → game still boots on defaults, no crash, `loadStatus.kind` is `corrupt`, and the stored text is still there (`corruptRaw`). Change state and reload: nothing is written until `acceptCorruptReset()` runs.
3b. Pause the game (overlay or background) with unsaved changes → reload → the changes persisted (the `onPause` save point).
4. Add a field to `defaultSave()` → existing save gains it on next load.
5. Bump `version` with a logging migration → runs exactly once, not on subsequent loads.
6. `window.<name>.export()` prints valid JSON; `.import()` of an edited copy reloads the page, and the game then runs on the edited copy.
