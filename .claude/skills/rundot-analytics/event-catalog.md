# Standard Event Catalog

The recommended baseline taxonomy for a RUN title. Apply these names as-is so data is comparable across games; add game-specific events using the same `snake_case` + ID-payload conventions. New event names must be shared with the RUN Operators team before they appear in dashboards.

## Session & lifecycle

| Event | When | Key payload |
|---|---|---|
| `session_start` | App opened / first playable frame | `first_time_player`, attribution fields |
| `session_pause` | `lifecycles.onPause` (older RUN versions never send `onSleep`) | `elapsed_sec` |
| `session_end` | `lifecycles.onSleep`, `onPause` and `onQuit` | **exactly** `screen`, `trigger` (`sleep`/`pause`/`quit`), `duration_seconds` |
| `screen_view` | Any screen/menu shown | `screen` |

### RUN standard events — exact names, no variants

RUN reads these by name. A near miss (`tutorial_completed`, `tutorialComplete`, `session_end` with other keys) is invisible to the platform, so match them character for character. Add any game-specific events alongside them.

| Event | Fire | Payload | What reads it |
|---|---|---|---|
| `tutorial_complete` | Once per player, when they finish (or skip) learning the first loop — ideally the first time they invest what they earned | none | The game's tutorial read, and the Meta conversion that mobile-web tutorial campaigns optimize toward |
| `session_end` | Every `onSleep`, `onPause` and `onQuit` | `screen`, `trigger`, `duration_seconds` (the one exception to the `_sec` convention) | RUN's session-end report: which screen players leave from, and how long they stayed |

```typescript
RundotGameAPI.lifecycles.onSleep(() => {
  RundotGameAPI.analytics.recordCustomEvent('session_end', {
    screen: currentScreen,            // 'title', 'tutorial', 'run', 'shop', 'results', ...
    trigger: 'sleep',                 // 'pause' / 'quit' from those hooks
    duration_seconds: Math.round((Date.now() - sessionStartedAt) / 1000),
  })
})
```

Neither event changes how RUN measures a campaign's retention; they make the game's own reports and ad optimization work.

## Auth funnel (`funnel: 'auth'`, funnelOrder 0)

Only if the game has a gated entry (login, age gate, consent). Dedup once-ever.

| Step | Name | Meaning |
|---|---|---|
| 1 | `auth_prompt_shown` | Entry gate displayed |
| 2 | `auth_started` | User began sign-in/consent |
| 3 | `auth_complete` | Passed the gate |
| 4 | `auth_failed` | Failed/abandoned (payload `reason`) |

## FTUE funnel (`funnel: 'ftue'`, funnelOrder 1)

The FTUE funnel is the single most important funnel in a new game — it shows exactly where first-time players quit. Instrument it with these three rules:

1. **As granular as possible.** Every discrete beat of the first session is its own step: each tutorial text shown AND dismissed, the first enemy spawning AND dying, the first currency earned, the first button tapped. Do not collapse "the tutorial" into one step — break it into `ftue_tutorial_01_shown`, `ftue_tutorial_01_dismissed`, `ftue_tutorial_02_shown`, … The finer the steps, the more precisely you locate the drop-off.
2. **Strictly linear.** Steps happen in a fixed order, numbered sequentially with no branches. Step N+1 can only fire after step N.
3. **Fire once, ever.** Each step fires the first time it happens and never again (`trackFunnelStepOnce`), so reinstalls and replays don't pollute it.

When instrumented correctly the step counts are **monotonically decreasing** — a clean funnel shape. If a later step has more hits than an earlier one, the ordering or dedup is wrong.

Example (adapt names to the game's actual first session — expect 15–40+ steps, not a handful):

| Step | Name | Meaning |
|---|---|---|
| 1 | `ftue_load_complete` | Assets loaded, first playable moment (await attribution here) |
| 2 | `ftue_tutorial_01_shown` | First tutorial text shown |
| 3 | `ftue_tutorial_01_dismissed` | First tutorial text dismissed |
| 4 | `ftue_first_action` | First core interaction (tap/place/move) |
| 5 | `ftue_tutorial_02_shown` | Second tutorial text shown |
| 6 | `ftue_tutorial_02_dismissed` | Second tutorial text dismissed |
| 7 | `ftue_first_enemy_spawned` | First enemy/obstacle appears |
| 8 | `ftue_first_enemy_defeated` | First enemy defeated |
| 9 | `ftue_first_reward` | First currency/reward earned |
| 10 | `ftue_first_round_complete` | First round/wave/level finished |
| 11 | `ftue_first_end_screen` | First results screen (`result`) |
| 12 | `ftue_first_win` | First success |
| … | … | Continue for every beat through the end of onboarding |

### Reference: a real tower-defense tutorial funnel

This is the live `tutorial` funnel of a published RUN tower-defense game with a strong tutorial — unique players per step, 2026-09-18 → 2026-10-07, after the 9/17 tutorial rewrite (earlier data mixes the old step numbers, see below):

| Step | Name | Players | From prev |
|---|---|---|---|
| 1 | `tutorial_welcome` | 941 | — |
| 2 | `tutorial_placement_tutorial_dismissed` | 910 | 97% |
| 3 | `tutorial_first_unit_placed` | 789 | 87% |
| 4 | `tutorial_first_wave_started` | 761 | 96% |
| 5 | `tutorial_first_wave_cleared` | 642 | 84% |
| 6 | `tutorial_game_over_shown` | 588 | 92% |
| 7 | `tutorial_game_over_dismissed` | 553 | 94% |
| 8 | `tutorial_upgrades_shown` | 521 | 94% |
| 9 | `tutorial_first_upgrade_purchased` | 417 | 80% |
| 10 | `tutorial_upgrade_screen_closed` | 419 | ⚠ 100% |
| 11 | `tutorial_second_battle_started` | 445 | ⚠ 106% |
| 12 | `tutorial_second_battle_first_unit_placed` | 430 | 97% |
| 13 | `tutorial_second_battle_first_wave_started` | 430 | 100% |
| 14 | `tutorial_second_battle_first_wave_cleared` | 421 | 98% |
| 15 | `tutorial_second_battle_game_over_shown` | 303 | 72% |
| 16 | `tutorial_units_shown` | 276 | 91% |
| 17 | `tutorial_first_unit_upgraded` | 238 | 86% |
| 18 | `tutorial_unit_screen_closed` | 243 | ⚠ 102% |
| 19 | `tutorial_quests_shown` | 198 | 81% |

**Copy this:**
- **Every beat is a step, and they're player actions, not screens.** "Placed a unit", "started the wave", "cleared the wave", "bought an upgrade" — not just "tutorial page 3 shown". That is what makes the drops actionable: 13% of players see the placement prompt and never place a unit (step 2→3); 16% start the first wave and never clear it (4→5).
- **It runs past the first win.** It follows the player through the first loss, the first upgrade, a whole second battle, and the first unit upgrade. Most bad funnels stop at "first level complete"; the second loop is where this game loses the most players (14→15, −28%).
- **Shown *and* dismissed / opened *and* closed** for each screen (6→7, 8→10, 16→18), so "never saw it" and "saw it and left" are separable.
- **Once-ever:** every step's event count ≈ its player count. Nothing fires twice.
- **Re-mapped with the tutorial.** When the tutorial was rewritten on 9/17, the steps were re-registered. (Better still would have been a new funnel name — the old `tutorial_upgrades_shown` at step 2 and the new one at step 8 collide in any 30-day export that spans the change.)

**Don't copy this:**
- **Optional actions on the main path.** Step 9 (`first_upgrade_purchased`) and step 17 (`first_unit_upgraded`) can be skipped, so the next step has *more* players than they do (⚠ rows). A non-monotonic row is a funnel bug: either make the action required in the tutorial, or track it as a side event instead of a step.
- **No terminal step.** The funnel ends at `tutorial_quests_shown`, so there is no single "finished onboarding" number to hold against the 50–60% target. Always end on an explicit `ftue_complete`. Here, 21% of welcomed players reach the last step; 47% reach the second battle.
- **Nothing before `tutorial_welcome`.** There is no `ftue_load_complete` / boot triad, so players who quit while the game loads are invisible to this funnel. Step 1 should be the first moment of the first session.
- Name it `ftue` (funnelOrder 1), per this catalog — `tutorial` works but breaks cross-game comparison.

The same game's other funnels show the feature-funnel pattern worth copying for each meta system (unlocked → opened → first use → depth): `cards`, `relics`, `prestige`, `daily_rewards` (`claimed_day_1` … `claimed_day_7`), `cash_shop` (`shop_opened → item_tapped → purchase_initiated → purchase_completed`). One catch: `relics` jumps from step 4 to step 7 — step numbers must be contiguous.

## Core gameplay

| Event | Key payload |
|---|---|
| `level_start` | `level_id`, `level_number` |
| `level_complete` | `level_id`, `score`, `time_elapsed_sec` |
| `level_failed` | `level_id`, `reason`, `progress_pct` |
| `level_abandoned` | `level_id`, `progress_pct` |
| `first_win` | `level_id` |
| `milestone_reached` | `milestone`, `value` |
| `reward_granted` | `amount`, `currency`, `source` |

## Monetization

Cross-reference the `rundot-monetization-iap` and `rundot-monetization-ads` skills for design.

| Event | Key payload |
|---|---|
| `ad_requested` | `placement`, `type` (`rewarded`/`interstitial`) |
| `ad_shown` | `placement`, `type` |
| `ad_reward_granted` | `placement`, `reward_id` |
| `ad_failed` | `placement`, `reason` |
| Purchase funnel (`funnel: 'purchase'`, order 2) | steps below |
| 1 `shop_opened` | `source` |
| 2 `item_selected` | `item_id`, `price` |
| 3 `checkout_started` | `item_id` |
| 4 `purchase_complete` | `item_id`, `price`, `currency` |
| `purchase_failed` | `item_id`, `reason` (readable: `insufficient`/`cancelled`/`error`), `rb_balance` |
| `ad_offer_shown` | `placement`, `reward` — when the button is actually on screen, not when an ad becomes ready |

Log every outcome, not only successes: a purchase that failed, a run that was abandoned (`run_abandoned` with where it ended), a load that never finished. The failures are where the diagnosis is.

## Errors & crashes

| Event | When | Key payload |
|---|---|---|
| `error_occurred` | try/catch, `window.error`, `unhandledrejection` | `type`, `message`, `source`, `line` |

Always fire `error_occurred` for queryable triage AND `RundotGameAPI.error(...)` for the mobile support log. `installErrorCapture()` wires the global listeners.

## Experiments

| Event | When | Key payload |
|---|---|---|
| `liveops_experiment_exposure` | Recorded **automatically** by the platform when `liveops.getConfigAsync()` resolves an assignment | `experiment_id`, `variant_id`, `config_version` |
| `feature_flag_read` | Optional, when a flag gates meaningful UI | `flag`, `enabled` |

```typescript
const { values } = await RundotGameAPI.liveops.getConfigAsync()
// `values` already includes assigned variant values.
// Exposure is auto-recorded — never fire your own experiment exposure event.
```

## Attribution enrichment (recommended)

Read landing UTM/campaign params once at startup and merge them into early events (`session_start`, `ftue_load_complete`) so paid vs. organic cohorts are separable:

```typescript
const params = await RundotGameAPI.attribution.getAttributionParams()
// merge utm_source / utm_medium / utm_campaign / fbclid / gclid into the payload
```

## Payload conventions

- `snake_case` keys, scalar values only (`string | number | boolean | null`).
- IDs over names for joins (`level_id`), human names optional alongside.
- Durations in seconds with a `_sec` suffix; percentages 0–100 with `_pct`.
- Currency amounts as integers with an explicit `currency` field.
- Readable strings, never numeric codes: `reason: 'insufficient'`, not `reason_code: 2`. A code can't be read without the game's source.
- Every currency grant gets a `currency_earn` with its `source` and `amount`, so the economy can be tuned from data.
- Heartbeats at most once a minute; a 10-second heartbeat buries everything else and `session_end` replaces most of what it was for.
