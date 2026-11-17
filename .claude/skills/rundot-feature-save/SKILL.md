---
name: rundot-feature-save
description: Add a save system to a RUN game — a versioned save blob on SDK appStorage with ordered migrations, additive back-fill, debounced and lifecycle flushing, and export/import. Ships copy-in TypeScript templates extracted from a shipped RUN game plus an AI-first integration guide. Use when a creator wants saving/loading, persistence, progress kept between sessions, cloud save, save slots, or settings that persist.
---

# Add a save system to a RUN game

Copy-in implementation extracted from a shipped RUN game. The authoritative
integration guide is `systems/save/README.md` — read it top to bottom before
writing code. It derives every game-specific decision (schema, migration
policy, flush cadence) from the host game's own code, so you should not need
to ask the developer questions.

## What's in this skill

| Path | What |
|---|---|
| `systems/save/README.md` | Full integration guide: wiring steps, config reference, derive-from-host table, verification checklist |
| `systems/save/save.ts` | The template you copy into the host game (generic over the save shape) |
| `references/run-sdk-notes.md` | Distilled RUN SDK facts (init, lifecycles, storage limits, error posture) |

## How to integrate (summary — the README is authoritative)

1. Read `systems/save/README.md` fully, then `references/run-sdk-notes.md`.
2. Inventory the host game: rendering/UI approach, where
   the entry's static SDK `/api` import and host-readiness check, whether a
   per-frame `update(dt)` loop exists, and any persistence to integrate with.
3. Copy the template into the host (suggested home: `src/helpers/save/`),
   keeping file names. If the host is plain JavaScript, strip the type
   annotations while copying — the runtime code is identical.
4. Adapt every `ADAPT:` comment; game-specific content goes in the
   `create...(config)` factory config, machinery below it should not change.
5. Wire per the README's numbered steps, then run its verification checklist —
   actually exercise save/reload, don't just confirm it compiles.

## Global RUN rules (always apply)

- Every `RundotGameAPI` call can reject, and an unhandled rejection crashes
  the game — keep the template's try/catch posture in code you add.
- The SDK initializes automatically when its `/api` module loads. Static and
  dynamic imports wait for module evaluation, but the SDK can catch init errors.
  Check public `RundotGameAPI.context` before `getProfile()`. Call `getProfile()`
  inside try/catch when work needs a valid cached profile. Keep a graceful fallback
  when the host is unavailable.
- Degrade gracefully outside the RUN host: local dev uses deterministic SDK
  mocks; follow the feature README for expected behavior, and treat unexpected
  `null`/failure as "unknown", never as an error state.
- Persist aggressively on `lifecycles.onPause`, which RUN sends every time the
  player leaves (older RUN versions never send `onSleep`); never rely on
  `onQuit` firing. Lifecycle callbacks are not awaited: the host ignores what
  a callback returns, so an `async` save in `onQuit` may never finish. Don't
  fire other fresh SDK RPCs (e.g. scheduling notifications) from
  `onSleep`/`onQuit` — a hard close tears down the runtime before the RPC
  lands; do that work while the app is alive.
- Never let a failed load become an empty save. `load()` makes one read and
  never retries it. A failed read (`readFailed`) or a corrupt stored blob
  (`corrupt`) resolves with defaults and blocks every write for the session,
  so the stored save is never overwritten. Do not add a retry loop or a
  wait, and do not merge a later read into the session. Do not bypass
  `loadStatus`, and call `acceptCorruptReset()` only after an explicit
  choice. A game with no `tick()` loop must call `flush()` itself to retry
  a failed write.
- A save with a higher `version` than the build (an old tab or an old app)
  gives `newerVersion`. Writes stay blocked for the session, so the old build
  never overwrites it. Never offer a reset for it.
- Check `saveSystem.canSave` before you sell anything that only the save
  keeps (an item or bonus bought with Bits). The server keeps the Bits, so a
  sale in a session that cannot save loses the purchase. Do not sell then.
- Save in the cloud only (`appStorage`). Do not copy the save to
  `deviceCache`: that key has no player id, and sign-out does not clear it,
  so a different account on the same device can load it.
- Keep the save small. Every write sends the whole blob. Save state, not
  history: counters, unlocks, capped lists. A flush warns once above 64 KB.

## Related skills

Most other `rundot-feature-*` systems persist their state inside this save
blob — integrate save first. Scaffolding a brand-new game instead? Use
`rundot-new-game`.
