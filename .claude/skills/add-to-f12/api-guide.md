# How F12 Games stands in for each RUN SDK feature

Plans for filling gaps in `C:\projects\f12-games\platform\run-shim.ts`. Always match the exact
shape from the RUN docs (`.rundot-docs/rundot-developer-platform/api/<NAME>.md`) and the SDK
types. This file only says *how* to provide it on a plain web page. Check `sdk-support.json`
first: something may already be built.

## Straightforward (build without asking)

| RUN feature (doc) | F12 version |
|---|---|
| `system.getSafeArea` (SAFE_AREA) | Measure `env(safe-area-inset-*)`: a hidden fixed div with `padding: env(...)`, read with `getComputedStyle`. Return numbers in px. Cache, refresh on resize. |
| `system.getDevice` (ENVIRONMENT) | From `navigator.userAgent`, `screen`, `devicePixelRatio`, `matchMedia('(pointer: coarse)')`. Platform `web`. |
| `system.getEnvironment` (ENVIRONMENT) | Fixed values meaning "production web build": not dev, not inside the RUN app. Use whatever fields the doc lists. |
| `system.requestFullscreen` / `exitFullscreen` / `getFullscreenState` | The Fullscreen API on `document.documentElement` (with the `webkit` prefixes for Safari). iPhone Safari has no fullscreen for pages: report not available rather than failing. An installed PWA is already fullscreen (`display: fullscreen` in the manifest). |
| `getProfile` (PROFILE) | A local profile: a random id made once and stored under `f12:profile-id`, name from `f12:name` (default "Friend"), no avatar. Never ask for or send real names. |
| `gamepad.*` | Wrap `navigator.getGamepads()`; `isSupported` = `'getGamepads' in navigator`. Map to RUN's gamepad shape from the SDK types. |
| `triggerHapticAsync` / haptics (HAPTICS) | `navigator.vibrate?.(ms)` with short durations per style; resolve silently where unsupported (iOS). |
| `attribution.*` | No tracking: return an empty result (`{}` / null fields). |
| `analytics.*` (any new method) | No-op, resolve `undefined`. |
| `appStorage.setMultipleItems` / `getMultipleItems` / similar | Loop over the existing storage functions; add to `makeStorage` so every storage gets it. |
| `app.getMyRole` / dev roles | Always the plain player role (no dev or admin tools on F12). |
| `lifecycles.*` (any new hook) | Map to `visibilitychange`, `pagehide`, `focus`/`blur`. |
| `time.*` (TIME) | `Date.now()` based; server time = local time. |
| `logging.*` / `log` / `error` (any new method) | `console.*` with the `[game]` prefix. |
| `assets.*` / `cdn.*` (any new method) | Files under `cdn-assets/` via `import.meta.env.BASE_URL`, like `fetchAsset`. |
| `preloader` / `hideLoadScreen` (PRELOADER) | No-op: the page is already showing. |
| `popups` / toasts (IN_APP_MESSAGING) | A small DOM toast or `confirm()`-style dialog styled plainly; no outside links. |
| `experiments.*` (EXPERIMENTS) | Always the default/control variant. |
| `simulationConfig` / remote config (SIMULATION_CONFIG) | Return the defaults bundled in the game, if the doc has them; otherwise ask. |

## Needs a decision (ask the user, recommended answer first)

| RUN feature | Why | Recommended F12 behavior |
|---|---|---|
| `iap.*`, purchases, shop, entitlements (PURCHASES, SHOP, ENTITLEMENTS) | F12 has no payments or accounts, and real purchases aren't allowed for kids here. | Store closed: `openStore` does nothing, balances are 0, spending fails gracefully. Alternative: give a free local currency so paid items can be earned or unlocked in play (only if the game's code can handle it). Check how the game reacts to a 0 balance. |
| `ads.*` (ADS) | No ads on F12. | `is...ReadyAsync` resolves `false`, `show...` resolves as "not shown" or "no reward". Alternative: grant the reward without an ad (check the game handles it). |
| `simulation.*` (SERVER_AUTHORITATIVE) | RUN runs the game's server logic; F12 can't run it. | If the game has a client fallback when `simulation.isEnabled()` is false, report disabled and use it. Otherwise run the recipes locally on device storage (port the recipe logic into the shim or game) and say progress is per-device. Read the game's code to see which is realistic before asking. |
| `leaderboard.*` (LEADERBOARD) | Shared boards need names stored on the server. | Device-only board: scores saved locally, podium shows this device's best runs. Alternative: a server board in `server/api/` with the same random-id + chosen-name approach as rooms, no free text. |
| `ai.*` (AI) | The user doesn't want AI text features. | Not available: report disabled and confirm the game copes. |
| `ugc.*`, `sharing.*`, `notifications.*` (UGC, SHARING, NOTIFICATIONS) | Publishing, sharing and pushes involve other people or outside services. | Not available; for sharing, `navigator.share` only if the game shares something harmless like a link to the game. |
| `realtime` rooms with custom server code (MULTIPLAYER) | F12 rooms are relays and can't run the game's room code. | Check whether the game's room only relays messages (like dress-up's playdate). If it computes game state on the server, the multiplayer mode needs a client-authoritative rewrite or stays off on F12. |
| Anything else not listed here | | Describe what it does on RUN and the best plain-web version, and ask. |

After deciding, record the decision in `sdk-support.json` → `decisions` so the next game gets the
same behavior without asking again (only ask again if the user wants this game to differ).
