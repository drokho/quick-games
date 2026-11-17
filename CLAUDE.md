# quick-games

A repo for quickly building game ideas, mostly from Claude Code cloud sessions. Each game is its own
folder at the top level (`quick-games/<game>/`), a RUN game that also releases to F12 Games
(https://games.f12crowd.com), the user's own kids' game portal.

```
f12-games/        F12 Games build + upload tools (a copy of the user's f12-games project)
  platform/       run-shim.ts (stands in for the RUN SDK on F12), vite-plugin.ts (`vite build --mode pwa`)
  tools/          release.mjs, upload.mjs (FTP), after-run-deploy.mjs (hook), check-sdk.mjs
<game>/           one folder per game; its build imports ../f12-games/platform/vite-plugin
```

## Releasing to F12 Games

- **From a game folder: `npm run release -- --pwa`.** It builds `dist-pwa/` and uploads it to
  `games/<slug>/` on F12. This is the normal way to put a game on F12, and it works without RUN.
- **After `rundot deploy`:** the PostToolUse hook in `.claude/settings.json` runs
  `f12-games/tools/after-run-deploy.mjs`, which does the same F12 release automatically for any
  game folder with an `f12.config.json`.
- **On GitHub:** `.github/workflows/f12-release.yml` releases to F12 on every push to `main` (only the
  game folders the push changed; a change in `f12-games/` releases all games). The Actions tab's
  "Run workflow" button releases all games or one. The FTP login is in the repo's Actions secrets.
  Cloud sessions can't reach the FTP server, so merging to `main` is how a cloud session ships to F12.
- `npm run release` with no flags deploys to RUN (private) and F12 together; `-- --run` is RUN
  only; `-- --dry` builds and lists what would upload without sending anything.
- A new game joins F12 with the `add-to-f12` skill (`.claude/skills/add-to-f12/`): it wires
  `vite.config`, the `build:pwa` / `release` scripts, `f12.config.json` and icons.
- Before the first release, run `node f12-games/tools/check-sdk.mjs <game>` and fill any gap in
  `f12-games/platform/run-shim.ts` (only add; never change how an existing feature behaves).

## Logins (cloud environment)

- **F12 (FTP):** `upload.mjs` reads `f12-games/.env.deploy` when it exists (on the user's PC),
  otherwise the environment variables `FTP_HOST`, `FTP_USER`, `FTP_PASS`, `FTP_ROOT` (plus
  optional `FTP_SECURE`, `FTP_PORT`, `FTP_TLS_NAME`) set on the cloud environment. Never print,
  echo or commit any of them. If they're missing, say which ones and stop; don't ask for the values in chat.
- The cloud environment needs network access to the FTP host (FTP on port 21, or 990 for
  implicit TLS), not just web traffic. If the upload can't connect, tell the user the upload is
  blocked by the environment's network settings; the build in `dist-pwa/` is still fine.
- **RUN:** `rundot` must be installed and signed in for `rundot deploy` to work in a session.
- The `.upload-cache/` record of past uploads starts empty in every cloud session, so a release
  re-sends the whole game. That's expected.

## Ground rules

- This repo is **public**. Never commit `.env.deploy`, `.env.local`, API keys, FTP details or any
  password. Never print them in chat or logs.
- F12 is a kids' platform: no accounts, no tracking, no ads, no free-text chat, nothing that sends
  personal data anywhere (COPPA). The shim keeps RUN's ads, purchases and analytics closed on F12.
- Uploads go only to `games/<slug>/` under `FTP_ROOT`. Never upload anywhere else on the server.
- No AI image or sound generation without showing the count and a credit estimate and getting a yes.
- `f12-games/` here is a copy. Shim changes made here don't reach the user's PC copy
  (`C:\projects\f12-games`) and the other way round, so mention any shim change in the report.
