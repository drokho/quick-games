# Portal Hopper: handoff brief

## What this is
`portal-hopper.html` is a working single-file prototype (plain Canvas 2D + Web Audio, no libraries). Use it as the reference for feel, layout and content. The goal is to rebuild it as a real game for RUN.game.

## What the prototype already has
- Side-view platformer: move left/right, jump (coyote time + jump buffer + variable jump height).
- On-screen touch controls (left, right, jump) and keyboard (arrows/A/D, Space).
- Hub world "Portal Plaza" with a rainbow slide and 4 portals (Halloween, Moon Base, Frosty Peaks, Mystery/random).
- Worlds:
  - Spooky Hollow (Halloween): jack-o'-lanterns, haunted house, bats, bone slide, ghosts that knock you back.
  - Moon Base: low gravity, neon slide.
  - Frosty Peaks: slippery friction, snowfall, long ice slide.
- Slides: you accelerate down a sloped surface and launch off the end.
- Teleport: walk into a portal for an iris-wipe transition; you arrive next to the matching return portal.
- Character customization: body color, hat (witch, pumpkin, crown, cat ears, propeller, space helmet), trail (sparkles, bubbles, ghost fire). Saved to localStorage.
- Collectibles per world (stars, candy, gems, snowflakes; 41 total) with a HUD counter.
- Procedural music per world plus sound effects.

## Target
- Platform: RUN.game, starting from the official 2D Phaser template.
- Must play well on phones and desktop browsers.

## Suggested first steps
1. Set up the RUN.game Phaser template in this repo and get it building and deploying.
2. Port the core: player physics, platforms, slides, portals and world switching. Match the prototype's numbers for gravity, jump and speed per world.
3. Port customization, collectibles, HUD and touch controls.
4. Keep art code-drawn or as placeholders for now, structured so sprite sheets (PNG) can be swapped in later.
5. Port the music and sound effects.
6. Deploy an unlisted build to test on a phone.
