# Visual polish for the requested game

Use this reference when the request includes art direction, lighting, animation, effects or game feel. Apply only the relevant part. UI layout and control repairs can use the main skill alone.

## Establish or preserve the visual direction

Start with the creator's references and the best matching existing assets. Identify a small palette, type treatment, shape language and material or texture style. Extend that direction across the changed elements. Color can communicate distinct gameplay meanings; a single accent color is not a universal requirement.

If the game has no direction, choose one that fits its subject and audience. Keep it concrete: worn paper labels and inked borders imply different choices from a precise sci-fi instrument panel. Existing fonts can be enough. Do not force new fonts, a theme picker or a full asset replacement.

Inspect asset previews before using them. Distinguish an actual game-ready sprite, animation or model from a reference image. Preserve original files, licences and the user's asset choices. Follow the current Studio or CLI asset workflow; a polish request is not blanket permission for paid generation.

## Diagnose the rendering problem before adding effects

- Inspect the active renderer, camera, materials, existing scaling and color handling. Keep its coordinate conventions. Resolution, sampling, color-space and lighting problems can look like bad artwork.
- Apply device-pixel scaling once. If the game sizes its backing buffer by device pixel ratio itself, as the optional `responsive-canvas.ts` example does, do not also set the renderer's pixel ratio. Otherwise keep the renderer's existing sizing method.
- For pixel art, check integer scaling and sampling at the intended viewing size. For other art, check that downscaling and texture filtering preserve its intended appearance.
- In a lit 3D scene, material properties, environment lighting and normals should agree. A dark model may have a material or lighting problem. Try the smallest correction before replacing the model.
- Tone mapping, shadows, fog, bloom and post-processing are choices for the game's visual direction and performance budget. They are not mandatory. Flat, unlit or deliberately graphic art can be correct.
- Match object contact, depth and background treatment to the scene. A simple contact shadow or composition change may be sufficient. Avoid adding a new rendering dependency for a small polish request.

## Give actions readable feedback

Make the input acknowledge immediately, then make the result understandable. A pickup can change its counter with a small pulse; damage can show a brief local flash; a selected item can retain a clear selected state. Keep the displayed value synchronized with real state, including during counting animations.

Use timing and hierarchy deliberately. Large events can have anticipation, impact and a short fade; routine taps need much less. Preserve input responsiveness and do not let celebration cover the next target or block play. Hitstop, camera movement, particles, sound and haptics are optional techniques suited to particular games. Do not add all of them to every interaction.

Respect existing sound, motion and haptic preferences. Keep essential information understandable without a sensory effect. When adding an SDK feedback call, read its current contract and handle failure without breaking the action. Avoid vibration on every frame or repeated button state update.

## Keep the result affordable to render

Choose fewer, clearer effects before adding layers. Large translucent surfaces, blur, high resolution and full-screen post-processing can be costly on phones. Measure the affected scene when performance tools are available; do not describe effects as free. Preserve frame pacing and reduce effects that compete with readable UI.

Use screenshots for composition and appearance, and interaction or a short recording for motion and feedback when those tools are available. Follow the main skill's verification limits. Report the change and any unverified behavior without promising measured quality or performance gains you did not observe.
