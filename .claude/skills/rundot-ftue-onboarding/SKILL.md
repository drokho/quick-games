---
name: rundot-ftue-onboarding
description: >-
  Design a strong first-time user experience (FTUE) / onboarding for a RUN.game
  title: minimize time-to-fun, teach by doing, and remove first-session friction.
  Covers pacing and progressive reveal, contextual teaching, foot-gun-free early
  decisions, and the tutorial funnel (50–60%+ completion target).
  Use when building or reviewing a tutorial, first session, new-player flow, or
  onboarding, or when the user mentions FTUE, onboarding, tutorial, first session,
  first-time players, tutorial completion, loading screens, forced login, or
  teaching mechanics.
---

# RUN.game FTUE & Onboarding Design

The first session decides whether a player stays. Most churn happens in the first few minutes, before the player ever sees what makes the game good. This skill is a **design framework** for getting a new player to fun fast — not a fixed script. Apply the principles and checklist to the specific game; let the game define its own beats.

This is the *design* side. To *measure* the first session, instrument every beat as a granular FTUE funnel — see the `rundot-analytics` skill.

**When to run this:** assume the creator has already nailed down their core loop. FTUE design comes *after* the game is fun to play, not before — you're teaching an experience that already works, not compensating for one that doesn't. If the core loop isn't fun yet, fix that first.

## Coaching approach — ask, teach, reveal blind spots

Design the first session *with* the creator, not for them. The goal is to make them see their opening minutes through a new player's eyes — someone who has never seen this game and will leave in seconds if confused. Ask questions that force that perspective, and teach the principles as you go.

Ask as you go (a couple at a time):

- Watch someone play cold for the first time — where do they hesitate or look lost? (If they haven't done this, it's the first homework.)
- How many seconds until a brand-new player does the *fun* thing, not just reads about it?
- What's the very first thing on screen when the game opens? Why that, and not the fun?
- What are you asking the player to learn before they've had any fun — can any of it wait?
- Is there anything they *must* tap, sign into, or read before playing? What breaks if you remove it?
- Show, don't tell: could a player who can't read still get through your first minute?

Teach the why, and name the blind spots first-timers miss: they front-load tutorials and menus because *they* know the game deeply and forget the player doesn't; they explain with paragraphs a player will never read; they gate first fun behind logins or settings. The fix is almost always *remove and defer*, not *add more instructions*.

## Study comparable titles' first sessions

Before designing, look at how genre leaders onboard — they've optimized the first session against millions of installs. Identify 2–3 comparable titles (same core loop, audience, platform), then study their opening minutes: use web search or play them and note how fast they reach the first fun moment, what single mechanic they teach first, how they teach it (arrows/highlights vs. text), what they defer (menus, meta, social, auth), and where they let the player act vs. watch. Adapt the patterns common across your comps to this game's loop — don't copy a flow built for a different one. Summarize the findings back to the creator so the design below is grounded in what works.

## The one metric that matters: time-to-fun

Minimize the time (and taps) between launch and the player's first genuinely fun, satisfying moment — the first "I get it, this is good" beat of the core loop. Every second and every screen before that is churn risk. Design the first session backward from that moment: what is the *least* the player must understand to experience it, and how fast can you get them there?

**The clock starts at launch, not at the first playable frame.** Creators time their FTUE from the moment the game is interactive and forget that a new player spent the seconds before that staring at a black screen wondering whether it's broken. Loading is part of time-to-fun, and it's the part where a player has no investment yet — it's the cheapest place in the whole game to lose someone. This is exactly what the boot triad (`load_started` → `load_finished` → `first_tap`) measures; if that funnel shows drop between `load_started` and `load_finished`, the problem is the loading experience, not the tutorial.

### The first 10 seconds decide most of it

Across RUN, on every platform and every RUN build, new players who stay past their first 10 seconds come back the next day 2–10× more often than those who leave, and games whose players bounce less retain better. On web, about half of all first sessions end inside those 10 seconds; on Android it's about 15%. Players who never reach the first real action almost never come back. So the opening is not the place for anything except the game:

- **No intro between load and play.** An intro animation, story cards, a logo sequence or a lore screen in front of the first action is where players leave. Reveal the game the moment it's ready; if you keep an intro, cap it at ~2 seconds on the first visit, make Skip visible from the first frame, and skip it entirely for returning players.
- **Start is the biggest thing on screen** and pressable within ~5 seconds of the title appearing. Modes, settings and extras wait for the second visit.
- **Put something alive in the first frame.** An empty room with a note to open a map loses players a character waiting at the door doesn't.

### Load time: measure, grade, fix the biggest thing, re-measure

Mobile web loses about 1 in 5 first sessions before the game finishes loading (desktop 5–13%, Android 2–5%), and players arriving from ads in an in-app browser are even less patient. Don't optimize by checklist — find out how slow the game is, then fix what's actually slowest.

**1. Get the number.** Time from tapping the game to being able to play it:

- Open the **public** link on a phone, in a private/incognito tab (so nothing is cached), with Wi-Fi off. Time tap → first possible input with a stopwatch, three times, and take the middle one.
- A desktop browser with a cleared cache is a fair stand-in for a phone browser (across RUN games they come out about the same). The RUN app usually loads about a quarter faster than either, so don't judge web by an app test.
- In the data, log `load_timing` once per launch with numeric `t_boot`, `t_ready` and `t_first_playable` in milliseconds plus `is_first_launch`, then read the percentiles per platform from `rundot analytics export custom_event_metrics_30d`.

**2. Grade it.** Typical RUN games load in about 3.5 seconds on web. Failed loads roughly double past 5 seconds and climb steeply past 8:

| Load time | Grade | What to do |
|---|---|---|
| Under 3 s | Good | Leave it; work on something else |
| 3–5 s | Typical | Fix it only if the boot funnel shows drop before the first action |
| 5–8 s | Costing players | Fix before spending on ads |
| Over 8 s | Losing a large share of loads | Fix first — nothing later in the funnel matters yet |

**3. Find what's on the critical path.** Build, then list the biggest files (`du -ah dist | sort -h | tail -20`) and check which of them load before the first scene — the entry bundle, anything in a boot-time preload list, anything imported at the top of the entry file. In a desktop browser's network panel with cache disabled, sort by size and read the total transferred before the first input. The usual culprits, in order:

- **Assets loaded up front that the first scene doesn't use** — later levels, music, other characters' sprites, a whole asset folder. Split them into two groups: what the first scene needs (awaited behind the preloader) and everything else (loaded in the background once play starts). The starter template already does this with a `critical` and a `deferred` bundle in `src/assets/manifest.ts`; with the SDK, call `preloadAssets` for the deferred group *after* the first scene starts, not at boot. Moving a file to `cdn-assets/` changes where it's hosted, not when it loads — it only leaves the critical path if the game fetches it later.
- **Oversized images** — art far larger than it's drawn. An image doesn't need more than about 2× the pixels it covers on screen (the DPR cap). A full-screen background over ~2048 px or ~300 KB is a red flag. Use WebP for painted or photographic art, 8-bit PNG for flat art, and a sprite sheet instead of dozens of separate files.
- **Uncompressed audio** — MP3 or OGG at 96–128 kbps, never WAV, and music that starts after the first scene rather than blocking it.
- **One giant JS bundle** — split off code the first scene doesn't run.

**4. Run `rundot preflight`.** It already runs on every deploy, but run it locally to read its warnings (Studio hides them): assets over 150 KB left in the build, JS chunks over 500 KB, WAV files, unquantized PNGs, duplicated engine libraries, an uncapped DPR. Fix what it flags on the critical path.

**5. Re-measure** the same way as step 1, after deploying. One fix at a time, so you know what worked.

### Cover the load with the native preloader

RUN ships a host loading screen so you don't have to build one, and it hides automatically once the SDK is ready. Use `RundotGameAPI.preloader` to keep it up while *your* heavy work happens:

```typescript
await RundotGameAPI.preloader.showLoadScreen()
await RundotGameAPI.preloader.setLoaderText('Loading assets…')
await RundotGameAPI.preloader.setLoaderProgress(0.5)
await loadCriticalAssets()
await RundotGameAPI.preloader.hideLoadScreen()
```

- **Always show progress, never a static spinner.** `setLoaderProgress(0…1)` plus `setLoaderText()` turns "is this broken?" into "it's working, nearly there." A bar that visibly moves buys far more patience than a faster load with no feedback.
- **Hide against your own readiness check, not just the end of the download.** Dismissing early flashes unpopulated UI, which reads as a bug — and a bug in the first five seconds is a permanent one.
- **Use it for scene transitions too**, not just boot: wrap heavy level loads in `show` → `hide` inside a `finally` so a failed load can never strand the player behind a loader forever.
- **Wrap show/hide in `try/catch`** — the host may already be transitioning, and an unhandled rejection crashes the game.
- **Don't park the player on it.** For idle or waiting states, fade to your own UI; a native loader left up looks hung.
- If you want complete control of the loading experience from the very first frame, turn the automatic one off with `rundot --configure uses-preloader false` — but then you own the "is this broken?" problem entirely.

Anything you can load *after* first fun should be. Cutting the critical-path bundle beats decorating the loading screen.

## Design principles (apply, don't recite)

**Teach the player by making them do it.**
- The player performs the action, not reads about it. Show → let them do it → confirm success.
- Just-in-time: introduce a mechanic the moment it's needed, never up front in a manual.

**Players can't or won't read.**
- Wherever possible, *show* what you want them to do with arrows, highlights, or a pointing hand — not sentences.
- When you must use words, use very short ones ("Tap the sand", "Swipe up"), never paragraphs. No walls of text.
- **Brevity is a retention mechanic.** Every extra tutorial step is one more opportunity to quit, so teach only what the player needs *right now* and cut every word that isn't load-bearing. The step you delete can't lose you a player.

**Build concepts slowly — one at a time.**
- Introduce a single new idea per beat. Don't dump every mechanic in the first minute; let each concept land before adding the next.
- Gate advanced UI/buttons until the concept behind them is taught — a hidden button can't confuse or distract.

**Front-load the core loop, delay everything else.**
- The first thing the player *does* should be the core verb of the game (build, shoot, match, drive) — not navigate a menu.
- Defer meta systems (upgrades, shop, settings, currencies) until after the player has felt the core loop. Introduce them only when they become relevant.

**Teach the rhythm, not the systems.**
- The goal of a tutorial is not to explain the game. It's to get the player to the point where they understand **what's fun and what to do next** — everything else can be learned later or never.
- Make the loop's rhythm explicit and felt: *do the thing → get the reward → use the reward to get stronger → do the thing again.* Players are here to have fun, not to study your systems; if they can't feel that cycle in the first minute, they have nothing to come back for.
- Close the loop *inside* the first session. A player who does the thing but never spends the reward hasn't seen the loop — they've seen a demo.
- **The investment moment is the milestone.** Across RUN games, the first time a player spends what they earned on something lasting (a permanent upgrade, a published result, a first build) predicts coming back tomorrow far more than finishing a run does. Walk them to it: when the first run ends, take them to the upgrade screen with one affordable upgrade highlighted, then call out its effect on the next run. Fire `tutorial_complete` (exact name — see `rundot-analytics`) at that moment.
- **Teach inside play, not in a separate warm-up.** A practice area before the real game gets skipped by most players and quit by some; a How to Play page is a reference, not a tutorial. Put each prompt on the first real moment it applies, one at a time, and move on automatically when it's done.

**Don't assume anything is obvious.**
- What's obvious to the team that built the game is frequently unintuitive to someone seeing it for the first time. You cannot un-know your own game; only a cold playtest can tell you what actually reads.
- Mark the thing you want tapped so it's impossible to miss — a highlight outline around the button, a `!` badge, an arrow, a pointing hand. Redundant-looking affordance markers are almost never redundant to a new player.
- Make it equally obvious *how the player gets stronger*. "What do I do next?" is the question that ends first sessions.

**Don't foot-gun the player.**
- During onboarding, the player cannot make a decision that puts them in a bad state. No accidentally spending a premium currency, selling an essential item, dumping an upgrade into a dead-end, or locking themselves out of progress.
- Early decisions should be safe by construction — disable, hide, or confirm the destructive option rather than trusting a new player to avoid it. A player who wrecks their account in minute two doesn't file a bug; they leave.

**Lock features you don't yet need — reveal complexity over time.**
- Keep any feature, button, or system locked/hidden until the player reaches the point where it matters. A smaller surface is easier to learn and impossible to get lost in. Unlock progressively as the player earns each system.
- Start most systems **locked**, and open each one only once the player has demonstrated they understand the layer beneath it. A new player does not need to see your entire game on their first screen.
- This is the single most common failure in vibe-coded games: the kitchen sink, all of it, in the first minute. It reads as system overload and it churns players who would otherwise have liked the game. **The difference between a good game and a great game is pacing.**

**Teach contextually — a system is taught when it becomes relevant.**
- Introduce each mechanic at the moment it first matters, not in an up-front manual. If crafting doesn't matter until minute 20, don't explain crafting in minute two; it will be forgotten by the time it's needed, and it costs you a drop-off step in exchange for nothing.
- The same applies to conveniences: a speed-up, an auto-battle, or a skip button introduced *after* the player already knows the beat it accelerates is a gift. Introduced before, it's noise.

**Keep teaching after the tutorial ends — use quests.**
- The tutorial does not have to be one long scripted sequence, and it shouldn't be. Once the core loop lands, hand the teaching job to early quests: they introduce features, rewards, upgrades, and longer-term goals at a pace the player controls.
- Quests also answer "what should I do next?" on every subsequent session, which is why they're the seam between FTUE and retention — see `rundot-retention` and `rundot-feature-daily-quests`.

**Put social features later in the flow.**
- The early experience should not require other players. Anything social (multiplayer, leaderboards, friends, sharing) belongs after the player already values the game solo — never as a gate to first fun.

**Defer auth-gated SDK features unless they're core.**
- If you use RUN SDK features that require auth/sign-in, try to place them later in the flow. Only put an auth-gated feature up front if it's critical to the core mechanic itself — otherwise let the player reach the fun first.
- **Know exactly which calls are gated**, because the login prompt is one you never wrote. The Access Gate sits in front of `textGen`, `imageGen`, `audioGen`, `threeDGen`, and UGC *account mutations* (`ugc.create/update/delete/like/unlike/report`). With auto-prompt login on — **which is the default** — an anonymous player calling any of them gets a login dialog raised by the SDK. Put one of those in an opening beat (an AI-generated portrait, a "share your creation" step) and you have shipped forced account creation before first fun without writing a line of login code.
- **UGC browsing is not gated.** `browse`, `get`, and `recordUse` all accept anonymous users — `recordUse` deliberately so plays are counted without prompting. A read-only UGC gallery is safe in the first session; publishing and liking are not.
- **Check, don't catch, when it's about layout.** `accessGate.isAnonymous()` is a synchronous client-side read of the cached profile (no network), so use it to hide or disable login-requiring UI up front rather than letting a call fail in the player's face. Don't hand-roll a gate check before a gated call — the SDK does that for you.
- **When you do want it up front, own the moment.** Set `accessGate.autoPromptLogin = false` and call `accessGate.promptLogin()` yourself at a point you chose, after the player has a reason to say yes — then handle `result.success === false` as a normal path, not an error.
- **Always `await` or `.catch()` a gated call.** It never throws synchronously; it returns a rejected promise with `AccessDeniedError`, so a non-awaited call is an unhandled rejection, and that crashes the game. Catch it at the call site to show "Log in to generate images" rather than a generic failure.

**Constrain the first session so the player can't fail or get lost.**
- Remove or reduce choices early; guide the eye with focus (dim the rest, highlight the target, disable unrelated input).
- Make the first encounter effectively un-losable — the first win should feel earned but be near-guaranteed.
- **Start new players on the gentlest setting.** Offer the step up after the first win, not a difficulty choice they can't judge yet. A first boss on a fixed timer arrives before slow players are ready; trigger it on progress instead, and point at any special rule (a shield, a weak spot) the first time it blocks them.
- **Hold tutorial targets still and make them easy to hit.** Things that drift while the player is asked to tap or drag them, or hit areas no bigger than the drawing, are where web players fail their first action. Freeze the target during the step, make the hit area larger than the art, snap drags to the nearest target, and test with a mouse as well as a finger.

**Reward early and often.**
- Deliver a visible reward/juice for the first correct action and the first loop completion (feedback, currency, celebration). Confirm progress immediately.

**Respect the player — no friction before value.**
- Do not force logins, account creation, permission prompts, ads, or IAP offers before the player has experienced the fun.
- Make anything long or repeatable skippable where safe; never trap the player in an unskippable cutscene or a tutorial they can't dismiss.

## First-session checklist

```
- [ ] Core loop is already fun — FTUE is being designed after, not before
- [ ] Player performs the core verb within the first few seconds (not a menu)
- [ ] Time-to-first-fun is measured in seconds, not minutes — timed from launch, not first playable frame
- [ ] Load is covered by the preloader with moving progress + text, hidden on a real readiness check
- [ ] Load time measured on a phone (private tab, cellular) and graded: under 5 s, ideally under 3
- [ ] Only first-scene assets load before play; everything else loads in the background after
- [ ] `rundot preflight` run locally and its critical-path warnings fixed
- [ ] No intro, story cards or logo sequence between load and play (≤2 s if kept, skipped for returning players)
- [ ] Start is pressable within ~5 s of the title appearing
- [ ] Tutorial targets hold still during their step and have hit areas bigger than the art
- [ ] The player invests what they earned before the first session ends, and `tutorial_complete` fires there
- [ ] Instruction is shown (arrows/highlights/hand) or very short — never text walls
- [ ] One new concept per beat, built slowly; advanced UI gated until taught
- [ ] Systems start locked and reveal over time — no kitchen sink in the first minute
- [ ] Each system is taught when it first becomes relevant, not up front
- [ ] The core loop's rhythm (act → reward → get stronger → act again) is closed inside the first session
- [ ] The next action is visually unmissable (highlight/outline/`!`/arrow), not just discoverable
- [ ] No foot-guns: the player cannot waste currency, sell an essential, or pick a dead-end upgrade early
- [ ] Early quests take over the teaching once the scripted beats end
- [ ] Features not yet needed are locked/hidden; unlock progressively
- [ ] Social features (multiplayer, leaderboards, sharing) placed after solo fun
- [ ] Auth-gated SDK features deferred unless critical to the core mechanic
- [ ] No gated call (textGen/imageGen/audioGen/threeDGen/ugc mutations) in an opening beat — auto-prompt login is on by default
- [ ] First encounter is near-un-losable; first win feels earned
- [ ] Immediate, juicy feedback on first action + first loop completion
- [ ] No login / permission / ad / IAP friction before the first fun moment
- [ ] Long/forced sequences are skippable or dismissible
- [ ] Meta systems (shop/upgrades/settings) deferred until relevant
- [ ] Every beat is instrumented as a granular FTUE funnel step (rundot-analytics)
```

## Instrument every beat

Design and measurement are two halves of the same job. For each onboarding beat, fire a granular, linear, once-ever FTUE funnel step so you can see exactly where new players drop. Use the `OnboardingController` in [`onboarding.ts`](onboarding.ts) to gate UI and persist progress, and fire the funnel step on first completion:

```typescript
import { OnboardingController } from './onboarding/onboarding'
import { trackFunnelStepOnce } from './analytics/analytics'

const onboarding = new OnboardingController()
await onboarding.load()

// Gate a first-time-only hint
if (onboarding.shouldShow('tutorial_01')) {
  showHint('Tap the sand to build')
}

// On dismiss: persist + fire the matching FTUE funnel step (once ever)
await onboarding.complete('tutorial_01_dismissed', () =>
  trackFunnelStepOnce(3, 'ftue_tutorial_01_dismissed', 'ftue', 'ftue_tut01_dismissed', 1),
)
```

See [`onboarding.ts`](onboarding.ts) for the full controller (gating, once-ever persistence via `appStorage`, `nextStep`, `isFinished`, `reset`).

### Map the whole tutorial, not just its start

Every meaningful beat gets a step, in order, so the drop-off has somewhere to show up:

```
Tutorial Start → Step 1 → Step 2 → … → Core Loop → First Reward → First Upgrade → Tutorial Complete
```

- **Target: 50–60%+ tutorial completion.** Below that, the tutorial itself is the leak. But the rate is the alarm, not the diagnosis — what matters is knowing *exactly which step* players quit on and why.
- **When you change the tutorial, change the funnel with it.** A re-ordered, merged, or deleted beat leaves the old steps registered, and you spend the next month reading a funnel for an onboarding flow that no longer exists. Re-map the steps in the same commit that changes the beats.
- A funnel whose counts don't decrease monotonically is an instrumentation bug, not a player behaviour insight — fix it before drawing any product conclusion.

### Analytics tells you *where*; playtesting tells you *why*

These are two instruments, not two options. The funnel identifies the step that's bleeding; watching one real person play it cold — in silence, without helping — is what tells you the button didn't read as a button. **Do both.** A creator who has never watched a stranger play their first session is guessing, no matter how good the dashboard is.

## Reviewing an existing onboarding

When auditing a game's first session, **pull the funnel first** (`rundot analytics export funnel_steps_30d --game-id <id>` — see `rundot-analytics`):

```
- [ ] Export funnel_steps_30d; find the biggest step-to-step drop in ftue/onboarding
- [ ] Confirm counts decrease monotonically — if not, fix instrumentation before product conclusions
- [ ] Time the run from cold launch — including the load — not from the first playable frame
- [ ] Check the boot triad for drop between load_started and load_finished (a loading problem, not a tutorial one)
- [ ] Time the run: how many seconds/taps to the first fun moment?
- [ ] Count screens/text before the core loop — flag every one that delays fun
- [ ] Find forced friction before value (login, permission, ad, IAP, long cutscene)
- [ ] Verify each beat is gated once-ever (no repeated tutorial on replay)
```

## Anti-patterns

- ❌ A tutorial that is a wall of text or a series of "OK" popups — players skip and miss it.
- ❌ Opening on a menu/lobby instead of the core action.
- ❌ Teaching every mechanic before the player has done anything.
- ❌ Forcing account creation, permissions, ads, or store offers before the first fun moment.
- ❌ Calling a gated API (textGen/imageGen/audioGen/threeDGen/ugc mutations) in an opening beat — auto-prompt login is on by default, so that *is* forced account creation, whether you meant it or not.
- ❌ A non-awaited gated call — it rejects rather than throwing, and the unhandled rejection crashes the game.
- ❌ A static spinner, or a black screen, while assets load — show moving progress or the player assumes it's broken.
- ❌ Hiding the loader before the UI is populated — the flash of empty screen reads as a bug in the first five seconds.
- ❌ Measuring time-to-fun from the first playable frame and ignoring the load in front of it.
- ❌ Requiring other players (multiplayer, friends, a leaderboard) before the player has had fun solo.
- ❌ Showing every feature/button unlocked at once instead of revealing them progressively — the kitchen sink in minute one is system overload.
- ❌ Explaining a system long before it's relevant (crafting in minute two when it matters at minute twenty).
- ❌ Letting a new player waste a premium currency, sell an essential item, or take a dead-end upgrade during onboarding.
- ❌ Assuming a control or next step is obvious because it's obvious to you — if it isn't outlined, badged, or arrowed, assume it's invisible.
- ❌ Ending the teaching when the scripted sequence ends, instead of handing off to early quests.
- ❌ Changing the tutorial and leaving the analytics funnel pointing at the old beats — you're measuring a flow that no longer exists.
- ❌ Reading the funnel without ever watching a real person play cold, or watching playtests without a funnel — each one answers a question the other can't.
- ❌ An unskippable cutscene or a hint the player can't dismiss.
- ❌ An intro animation or story cards before the first action — and replaying them for returning players.
- ❌ A separate warm-up or practice area before the real game, or a tutorial step that waits for an extra "Start" tap.
- ❌ A heavy first load on mobile web — loading every asset before the first scene instead of only what it needs.
- ❌ Optimizing load time from a checklist without measuring it first — fix the biggest file on the critical path, then re-measure.
- ❌ Judging web load time from a test in the RUN app, which usually loads faster.
- ❌ Asking the player to tap or drag something that's moving, or that's smaller than a fingertip.
- ❌ A first level hard enough to lose — early frustration is churn.
- ❌ Onboarding that re-triggers on every session because completion isn't persisted.

## Resources

- [onboarding.ts](onboarding.ts) — drop-in `OnboardingController` for gating first-time UI and persisting once-ever progress.
- `rundot-analytics` skill — instrument each beat as a granular FTUE funnel, including the boot triad.
- `rundot-sdk` — `preloader` and `accessGate` surfaces, host-readiness checks, and the error handling that SDK calls require.
- `rundot-feature-tutorial` — copy-in spotlight/message-sequence tutorial implementation with show-once persistence.
- `rundot-marketing-social` — after shipping FTUE fixes, always run `rundot socials prepare` to drive free playtesters and re-measure the funnel.
- **[Tutorials That Don't Suck](https://run.world/blog/tutorials-that-dont-suck/)** — the RUN blog post behind the do/don't list, the tutorial funnel shape, and the 50–60% completion target, worked through [Dead Stop](https://w.run/ohaimark/dead-stop-td) as the reference tutorial.
