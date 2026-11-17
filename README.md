# quick-games
A Claude code cloud repo for quickly building out game ideas

## Layout

- `<game>/` — one folder per game (RUN games that also release to [F12 Games](https://games.f12crowd.com)).
- `f12-games/` — the F12 build and upload tools. `npm run release -- --pwa` in a game folder puts it on F12.
- `.claude/` — project hooks (F12 upload after `rundot deploy`) and the `add-to-f12` skill.

See `CLAUDE.md` for how releasing works and which environment variables a cloud environment needs.
