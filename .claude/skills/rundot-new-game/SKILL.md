---
name: rundot-new-game
description: Start a brand-new RUN game from a RUN template with `rundot init --template` — a runnable project with the RUN SDK wired up, a loading screen, lifecycle handling and deploy config, registered as a new game. Use when a creator is starting a RUN game from nothing or asks for a starter project, boilerplate, app template, or project skeleton.
---

# Start a new RUN game

Every new game starts from a RUN template. The CLI downloads it, registers the
game, and writes `game.config.prod.json`. Don't hand-write a project skeleton.

## Templates

| Id | What |
|---|---|
| `2d-pixi` | 2D starter: Pixi.js v8, React, Tailwind and the RUN SDK, with a loading screen, main menu and demo scene. The default for a new 2D game. |
| `3d-react` | 3D starter: Three.js scene with shadows and an orbit camera, game state machine, score HUD and StowKit asset loading. |
| `csn-runner` | Endless runner: jump physics, obstacles, pickups, coin shop, leaderboard, rewarded ads, saves. |
| `csn-launcher` | Launcher: slingshot aiming, flight physics, upgrade shop, leaderboard, rewarded ads, saves. |
| `tower-defense` | Tower defense: towers, enemies, waves plus endless mode, upgrades, two leaderboards, rewarded ads. |

The list changes. Running `rundot init` with no `--template` in an empty
directory prints the current list, then exits 1.

## How to start

1. `rundot login` (once).
2. `rundot init --template <id> <directory> --name "<Game Name>"`. The
   directory must be empty or new. Without `<directory>` it uses the current
   directory, which must be empty.
3. `cd <directory>`, then `npm install` and `npm run dev`. The shell must boot
   before you add game code. Outside the RUN host the SDK runs on local mocks.
   To run against the RUN.world **playground** backend instead, read the
   Playground guide (`rundot-developer-platform/playground.md` in the SDK docs).
4. Read the template's `CLAUDE.md` and `README.md` before changing code. They
   map the files and the `ADAPT:` points.
5. Deploy with `rundot deploy` (see the `rundot-cli` skill).

`docs/run-sdk-notes.md` holds distilled RUN SDK facts (init, lifecycles,
storage limits, error posture). For the full SDK docs, run
`npx rundot-sdk-setup -y` in the project. It copies them into `rundot/docs/`.

Before creating or changing the game UI, apply `rundot-polish-feel`. In Studio builder chat its core instructions are already in the system prompt. In other hosts, read the installed or bundled skill when available; do not assume builder context exists. Use its layout, control and visual-check guidance without changing the requested style, orientation or renderer.

## Global RUN rules (always apply)

- Every `RundotGameAPI` call can reject, and an unhandled rejection crashes
  the game — keep the template's try/catch posture in code you add.
- The game must boot in a plain browser without the host. Check public
  `context` before `getProfile()`, inside try/catch, when you need host
  readiness.
- Keep `firebase` and `@revenuecat/purchases-js` in `devDependencies` when a
  template has them. They support Playground auth, Firestore and IAP; the
  production host path does not bundle them.

## Related skills

Game systems (save, shop, daily rewards, quests, stats, tutorial, ads,
notifications, analytics, localization) plug into a template — each has its
own `rundot-feature-*` skill. Deploying and every other `rundot` command:
`rundot-cli`.
