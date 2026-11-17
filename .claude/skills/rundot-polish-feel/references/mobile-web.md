# Mobile browsers break layouts desktop hides

Mobile web is where RUN games lose the most first sessions, and these defects never show on a desktop preview. Check them whenever a game ships to the web:

- Size full-screen layouts with `100dvh` (or `visualViewport.height`), not `100vh`, which includes the space behind the browser toolbar and cuts off bottom bars. Pad bottom bars with `env(safe-area-inset-bottom)`.
- `touch-action: none` on `body` or a wrapper stops every list from scrolling by finger, even though the mouse wheel still works. Keep it on the game canvas only; give scrolling panels `touch-action: pan-y` and `overscroll-behavior: contain`, and test with a finger swipe, not a wheel.
- Let a row of buttons wrap or shrink at 360 px wide instead of running off the screen.
- Handle the back button or gesture: close the open panel or return to the previous screen instead of leaving the game.
- Controls designed for a mouse often fail on a thumb. When aim and power (or move and act) share one drag, split them on touch (`matchMedia('(pointer: coarse)')`) so a small wobble in one can't change the other, and make sure no control needs room the screen edge or another button takes away.

## Lighter settings on phones

Phones — in a browser or the RUN app — have far less GPU, memory and battery than a desktop. Give them a lighter default instead of shipping one setting for everyone:

- **Pick the tier at startup from `RundotGameAPI.system.isMobile()`.** That's enough to choose; the SDK doesn't expose device memory or GPU, and `navigator.deviceMemory` doesn't exist on iOS.
- **What the phone tier changes:** cap the canvas pixel ratio at 2 (1.5 if the scene is heavy), cut particle counts and their lifetimes, turn off full-screen post-processing such as bloom and blur, and lower any per-frame effects the game can live without. Gameplay and art direction stay the same.
- **Step down if it's still struggling.** Measure the frame rate for the first couple of seconds of play; if it stays under 30 fps, drop one more step for the rest of the session. Don't step back up mid-session — flickering quality reads as a bug.
- **Check it on a real phone.** Studio's preview has no GPU, so its frame rate says nothing about how a game runs on a device.
