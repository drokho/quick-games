---
name: add-to-f12
description: Add a game in this repo to F12 Games (games.f12crowd.com), the user's own PWA game portal. Fills in any RUN SDK features the F12 shim doesn't cover yet, wires the game's build, asks whether it's an adult game, tests the web build and does the first F12 release. After that, `npm run release -- --pwa` (or any `rundot deploy` Claude runs) updates F12. Use when the user asks to add, put, port, publish or deploy a game to F12 / F12 Games / games.f12crowd.com, or types /add-to-f12.
---

# Add a game to F12 Games

The F12 tools are in `f12-games/` at the repo root (read the repo's `CLAUDE.md` first). A game joins
by building a second time with `vite build --mode pwa`, which swaps the RUN SDK for
`f12-games/platform/run-shim.ts`. The game is a top-level folder, `<repo>/<game>/`, so its build
reaches the tools at `../f12-games/`.

## Ground rules

- F12 is a kids' platform: no accounts, no tracking, no ads, no free-text chat, nothing that
  sends personal data anywhere (COPPA). Keep it that way in everything you add to the shim.
- Never print, echo or commit the FTP login (`FTP_*` variables or `f12-games/.env.deploy`). This repo is public.
- Uploads go only to `games/<slug>/` under `FTP_ROOT`. Never upload anywhere else.
- Don't deploy to RUN as part of this skill. The first release is F12 only (`--pwa`).
- No AI image or sound generation without showing the count and a credit estimate and getting a yes.
- The shim is shared by every game. Never change how an existing feature behaves; only add.

## 1. Find what the shim is missing

```bash
node f12-games/tools/check-sdk.mjs <game folder>
```

It lists every `RundotGameAPI.*` the game uses, what's covered and what's missing, with file:line.
Also check "Other SDK imports" and the game's `vite.config` for RUN plugins besides
`rundotGameLibrariesPlugin` (multiplayer rooms, playground...).

## 2. Ask the user (one AskUserQuestion call)

Always ask:
- **Audience:** "Is <title> an adult game (for older people) or a kids' game?" Options:
  "Kids' game" / "Older people only". Older-only games get `"audience": "older"`: hidden from the
  portal list until the older-games password is entered, but anyone with the direct link can open it.

In the same call, ask about any missing feature that can't work like RUN here (see `api-guide.md`
→ "Needs a decision"): purchases, ads, server-run simulation, online leaderboards, AI,
user-generated content, sharing, notifications. Put the recommended F12 behavior first. Skip if
the game uses none of them.

## 3. Build each missing feature in the shim

For each missing item:
1. Read how the game calls it (the checker's file:line): arguments, what it does with the result,
   whether it guards with `?.` or try/catch.
2. Read the RUN doc for its exact shape (`node_modules/@series-inc/rundot-game-sdk/docs` in the
   game, or its `.rundot-docs/` if present) and the SDK types when the doc is thin.
3. Implement it in `f12-games/platform/run-shim.ts` with the same shape (method names, sync/async,
   result fields), following `api-guide.md`, inside the `api` object, matching the file's style.
4. Add it to `f12-games/platform/sdk-support.json` → `supported` (and `decisions` when it behaves
   differently from RUN, in one plain sentence).

Never throw where RUN wouldn't; return the "nothing here" value the game already handles. Store on
the device under the game's prefix (`NS`) like `appStorage` does. Re-run the checker until nothing
is missing.

## 4. Wire the game's build

- `vite.config.(js|ts)`:
  ```js
  import { f12Pwa } from '../f12-games/platform/vite-plugin';
  export default defineConfig(({ mode }) => ({
    plugins: mode === 'pwa' ? [/* non-RUN plugins */ f12Pwa()] : [/* existing plugins */],
    // ...rest unchanged
  }));
  ```
  Keep every RUN plugin unchanged in the non-pwa branch. Convert a plain-object config to this form.
- `package.json` scripts: `"build:pwa": "vite build --mode pwa"` (prefix `tsc && ` if the normal
  build type-checks), `"dev:pwa": "vite --mode pwa"`, `"release": "node ../f12-games/tools/release.mjs"`.
- `tsconfig.node.json` (if it lists `vite.config.ts`): add `"../f12-games/platform/vite-plugin.ts"` to `include`.
- `f12.config.json` in the game folder:
  ```json
  {
    "slug": "<kebab-case, unique on the portal>",
    "title": "<full title>",
    "shortName": "<12 chars max, home-screen label>",
    "description": "<one sentence for the portal card>",
    "about": "<a short paragraph for the portal's info popup>",
    "themeColor": "<main accent color>",
    "background": "<background color>",
    "orientation": "portrait | landscape | any",
    "icons": { "192": "f12/icon-192.png", "512": "f12/icon-512.png" },
    "thumbnail": "<path to the game's thumbnail, e.g. public/thumbnail.jpg>",
    "rooms": {},
    "lazy": [],
    "order": 50
  }
  ```
  Add `"audience": "older"` for older-only games, `"leaderboard": "shared"` for a shared board.
  `rooms` lists each realtime room type with the message kinds to replay to late joiners
  (`sticky`). `lazy` lists big folders to download on first use instead of on install. Ask the
  user if you're unsure the slug is free on the portal (https://games.f12crowd.com/).
- Icons: square 192 and 512 px PNGs in `<game>/f12/`, made from the game's thumbnail or icon art.

## 5. Build and test

```bash
cd <game> && npm install && npm run build:pwa
```

Then serve `dist-pwa/` (e.g. `npx vite preview --outDir dist-pwa`, or any static
server) and check in the browser: the game loads and plays, no
`[F12 Games] ... isn't available outside RUN` warnings, no console errors, progress survives a
reload, and each feature added in step 3 works. (Playdate rooms and shared leaderboards need the
real F12 server, so they can only be checked after release.)

## 6. First release

```bash
cd <game> && npm run release -- --pwa
```

The first upload is large and may reconnect a few times; that's normal. If the FTP login is
missing or the connection is blocked, see "Logins" in the repo's `CLAUDE.md`. Check
`https://games.f12crowd.com/games/<slug>/` loads.

Add to the game's `CLAUDE.md` (create it if needed):

```md
## F12 Games

This game is also on F12 Games (https://games.f12crowd.com/games/<slug>/), built with `npm run build:pwa`
(the RUN SDK is swapped for `../f12-games/platform/run-shim.ts`).
- Release to F12 with `npm run release -- --pwa`; a `rundot deploy` that Claude runs also updates F12 (hook).
- After adding a new RundotGameAPI call, run `node ../f12-games/tools/check-sdk.mjs .` and fill any gap in the shim.
```

## 7. Report

Tell the user in plain words: what was added to the shim (each feature and how it behaves on F12),
the audience setting, what was tested, and the F12 link. If the shim changed, say that the copy on
their PC (`C:\projects\f12-games`) doesn't have the change yet.
