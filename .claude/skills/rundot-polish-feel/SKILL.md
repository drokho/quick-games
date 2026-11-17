---
name: rundot-polish-feel
description: Create or fix RUN game UI, HUDs, menus, touch controls, mobile layout, readability, art presentation and game feel. Use for new-game UI, overlapping or clipped panels, missing or unresponsive buttons, blurry text, visual reference requests, or polish. Skip backend-only, save-only, deployment and build-repair tasks unless they also change UI or controls.
---

# Game UI, mobile layout and polish

Make the requested interface usable and visually coherent while preserving working gameplay. Fix the reported problem before adding decoration. A small layout or control fix should stay small.

## Start from the actual game

Read the affected screen and its action wiring. Inspect available screenshots, uploaded references and existing artwork. Preserve the creator's chosen style, orientation, renderer and controls. Ask only when an unresolved choice changes what needs building; do not repeat questions already answered or turn a repair into a design interview. Unless the creator asks, do not publish, deploy, generate paid assets, change orientation or replace the overall style for a UI repair.

For new UI, identify the player's next action, the information needed for it and the space gameplay needs. Reuse the game's existing components, palette, type and spacing. If these are missing, choose a compact direction consistent with the request and keep it consistent across the affected screens. No separate design document or preset selection is required.

## Apply the guidance relevant to this request

### Keep gameplay and actions visible

- Fit UI to the actual game container and its current dimensions. Respect the requested portrait, landscape or responsive behavior. Do not impose a fixed phone frame on a desktop game or change orientation to hide a layout defect.
- Keep health, score and controls clear of each other and the action. Move secondary information into an existing menu or compact panel when it obscures play. Short announcements should not block controls or cover the target the player needs to see.
- Keep gameplay in its viewport. Long inventory, dialogue or settings content can scroll within its own panel; keep the relevant close, back or primary action reachable. Avoid shrinking every button and label to force content onto one screen.
- Web or phones: check [mobile-web.md](references/mobile-web.md).
- Use the project's existing safe-area handling; read current SDK guidance if it needs changing. Avoid adding host insets twice. Do not assume the window size equals the game size.

### Make visible controls do the expected thing

- Trace the button from its displayed state to the real action and its visible result. Reuse existing callbacks, state and progression. A control that looks finished but does nothing is unfinished.
- Hidden or closed panels must stop intercepting input and focus. Blocking dialogs should prevent clicks reaching gameplay underneath. Avoid duplicate click/touch handlers firing an action twice.
- Keep hit regions aligned with the visible artwork through resize and scaling. Transparent padding in a PNG is not its visible button boundary. Preserve image proportions and avoid adding a second label over text already baked into the art.
- Make touch targets comfortably tappable; 44 CSS pixels is a useful starting point for web UI. Extra hit padding can help small icons without enlarging their artwork. Keep adjacent actions separated and preserve the play area.
- For held or dragged controls, check release and cancellation, including leaving the control or losing focus. Preserve simultaneous movement and action where the game needs it. Confine gesture suppression to game controls so menus can still scroll.
- Give immediate press/selection feedback and a visible result. Use the actual input method in instructions. Show a disabled action's reason when it would otherwise be unclear. Add no extra confirmation flow unless the action needs one.

### Make the information readable and the art intentional

- Check text at its displayed size against the actual gameplay background. Aim for at least 4.5:1 contrast for normal text and 3:1 for large text. Improve hierarchy, contrast and spacing before making text smaller. Distinguish selected, available and unavailable states with more than color alone.
- If text or artwork is blurry, inspect the renderer's existing scaling and resolution before changing fonts or adding effects. Keep the current engine's coordinate and DPI conventions. Do not apply one renderer's sizing recipe to another.
- Use the supplied artwork and references in the requested screen. Match its proportions, texture and shape language; verify the rendered result actually uses it. Follow the environment's asset-selection workflow when new art is needed. Do not silently replace working art or buy/generate assets for a targeted UI repair.
- Keep dynamic information such as score, price and progress live. Decorative images should not freeze values that change during play.

## Verify the affected result

Check the affected result with the tools this session actually has, or with creator-supplied images. Capture only when the tool can show the affected surface. If a successful capture shows a concrete defect, fix it and capture again to check the fix. A failed capture ends capture attempts for this turn; do not retry it. If the tool is known to exclude the affected surface, use an available image or browser alternative, or state the gap. Do not take an uninformative capture to satisfy a checklist.

A still image shows appearance at the captured size. It does not show that a button, save or purchase works. Exercise the primary action only when interaction tools are available. Check other sizes only when a tool can select them; otherwise name the size you inspected and do not imply phone or desktop coverage. Confirm nearby controls and the previous working flow as far as the evidence allows.

In Studio, `screenshot_preview` builds unbuilt changes and loads the preview in a separate headless browser at the creator's current preview size, showing the visible preview including HTML menus and overlays. Its steps can tap, drag, press or hold keys, wait and take several screenshots, for example to get past a start menu or hold the control you changed, and it reports what each tap landed on and the frame rate. Never tap buy, spend, publish, share or delete controls. Below 30 fps timing-based gameplay is unverified; the frames show appearance only. UI that appears only after an action or later in play is not in the image; do not conclude it is missing. A failed capture or a menu-only image leaves the relevant gameplay interaction unverified.

For CLI coding agents, use the browser/preview tools available in that session and the project's existing run commands. Do not assume Studio-only tools exist. Do not publish or deploy merely to obtain a screenshot.

Name a relevant unchecked item once in plain words, for example "I updated the pause menu, but couldn't check it on your phone." Do not repeat a blanket gameplay disclaimer for an unrelated or already-verified edit. Stop when the requested result is supported by evidence, or report the remaining gap. Avoid speculative polish loops, a full manual QA session for a small repair, and unrelated changes to gameplay, saves, economy or project setup.

## Further visual polish, only when requested

For art direction, lighting, animation, hit feedback or effects, read [visual-polish.md](references/visual-polish.md). In Studio, load it with `read_sdk_docs` using `skills/rundot-polish-feel/references/visual-polish.md`. Skip it for layout and button repairs. Reuse it while it remains in context.

CLI installations also include `mobile-hud.css`, `safe-area.ts` and `responsive-canvas.ts` as optional local examples. Inspect them for compatibility with the current renderer and SDK before adapting them; they are not required and are not bundled as Studio documentation.
