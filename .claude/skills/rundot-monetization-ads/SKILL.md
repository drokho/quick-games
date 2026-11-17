---
name: rundot-monetization-ads
description: >-
  Add ad monetization to a RUN.game title with rewarded video and interstitial
  ads through the RUN SDK ads API — placements that earn revenue without wrecking
  retention. Use when adding or tuning ads, rewarded videos, interstitials, ad
  placements, or when the user mentions ad monetization, ad revenue, rewarded
  ads, interstitials, or "how do I make money from ads."
---

# RUN.game Ad Monetization

Earn revenue by showing ads inside your game — rewarded videos (opt-in, player chooses to watch for a reward) and interstitials (shown at natural breaks). This is *earning* from ads; *spending* on ads to acquire players is `rundot-marketing-ua-analysis`.

**Why this matters beyond the money:** ad revenue is what lets you fund user acquisition and grow. When each player earns more than they cost to acquire, you recycle that revenue into more installs — the growth flywheel (see `rundot-marketing-ua-analysis`). Ads are usually the *first* monetization a casual game turns on because they earn from every player, not just payers. But over-monetizing tanks retention, which starves the same flywheel — so the whole game here is earning **without** driving players away.

**When to run this:** after the core loop is fun and retention beats the typical RUN game on its platforms (`rundot-retention`). Ads layered on a game players don't return to just annoy the few who show up. Instrument analytics first (`rundot-analytics`) so you can watch retention as you add ads.

## Coaching approach — ask, teach, reveal blind spots

Creators tend to either bolt on aggressive interstitials that gut retention, or bury a rewarded ad where no one sees it and earn nothing. Your job is to find the placements that feel like a *service to the player*, and to make the retention-vs-revenue tradeoff explicit. Ask, teach, and name the blind spots.

Ask as you go (a couple at a time):

- Where in your loop would a player *genuinely want* more of something (another life, double coins, a skip)? That's a rewarded ad.
- What are the natural "breaths" in your game — level end, game over, menu — where a short interruption wouldn't break flow?
- How would you know if adding ads *lowered* your retention? (Are you set up to see that?)
- What does your genre's top game do — how often do ads appear, and are they mostly rewarded or forced?
- Who's your player? A relaxing-puzzle audience tolerates far fewer forced ads than a hyper-casual one.

Teach the why, and name the blind spots first-timers miss: **rewarded ads are almost always the right place to start** — they're opt-in, player-positive, and don't hurt retention because the player chooses them. Interstitials earn but cost goodwill, so they need frequency caps and natural placement. The classic mistake is maximizing ad *frequency* for short-term ARPDAU while quietly destroying retention and therefore LTV — the flywheel spins *down*. Another: forgetting that ads pay very differently by platform and that interstitials are hidden for subscribers, then wondering why revenue looks off in testing.

## Study comparable titles' ad patterns

Before placing anything, look at how 2–3 successful games *in your genre* use ads — they've tuned the balance against millions of sessions. Play them (or watch gameplay) and note: how often interstitials appear, whether they're mostly rewarded vs. forced, what rewards the rewarded ads offer, and where in the loop each ad sits. Match on genre and audience — a hyper-casual game's ad load would drive a cozy puzzle audience away. Summarize the pattern back to the creator, then adapt it to this loop rather than copying a load built for a different tolerance.

## The two ad types

| Type | Player experience | Earns | Use for |
|---|---|---|---|
| **Rewarded video** | Opt-in — player taps to watch in exchange for a benefit | High eCPM, no retention cost | Extra life/continue, double rewards, free currency, timer skip, temporary power-up |
| **Interstitial** | Forced — plays at a break point | Earns but spends goodwill | Between levels, after game over, on session end — **never mid-gameplay** |

Interstitials are automatically hidden for platform subscribers; you can call the API for everyone and subscribers simply won't see one.

**On RUN, default to rewarded only.** Across the games RUN has reviewed, interstitials cost more goodwill than they earn in run-based, idle, rhythm and cozy games alike, and subscribers never see them anyway. Reach for one only in a genre whose comps clearly run them, after retention is healthy.

**Ads serve on every platform, at very different rates.** In the RUN phone app, rewarded views pay many times what RUN Network pays on desktop and mobile web (roughly $5 per thousand views there). Web revenue stays small, so purchases matter more for web players — but still offer rewarded ads on desktop web: across RUN they go with better retention there more than on any other platform. Never swap a desktop ad for a "pay RUN Bits instead" button; offer Bits only as the fallback when no ad is ready.

## Rewarded ads — the player-positive default

Preflight readiness, show, and **only grant the reward when the call resolves `true`** (a `false` covers both "no ad shown" and "player closed early"):

```typescript
const ready = await RundotGameAPI.ads.isRewardedAdReadyAsync();
if (ready) {
  const earned = await RundotGameAPI.ads.showRewardedAdAsync({
    adDisplayId: 'extra_life',
    adDisplayName: 'Extra Life Reward',
  });
  if (earned) grantExtraLife();
}
```

- **Preflight with `isRewardedAdReadyAsync()`** and disable/hide the reward button when it returns `false`, so players never tap a dead button.
- **Always pass `adDisplayId` / `adDisplayName`** so each placement is attributable in analytics — you need per-placement data to know which offers work.
- **Make the reward feel worth the ~30s.** Doubling a level's coins or a free continue reads as generous; 5 coins does not.
- **The best placements save or multiply something the player just earned.** A once-per-run revive when most runs end in an early death, and a "double this run's earnings" at the end of every run, consistently outperform a free-currency button. In competitive or leaderboard games, keep a revived run off the board or mark it.
- **Offer, don't nag.** Surface rewarded ads where the player already wants the thing (the game-over "continue?", a "double your reward" button), not as a constant pop-up.

## Interstitials — earn without wrecking the flow

```typescript
const ready = await RundotGameAPI.ads.isInterstitialAdReadyAsync();
if (ready) {
  await RundotGameAPI.ads.showInterstitialAd({
    adDisplayId: 'level_transition',
    adDisplayName: 'Level Transition',
  });
}
```

- **Only at natural breaks** — level end, game over, returning to menu. Never interrupt active play.
- **Cap frequency.** Enforce a minimum time between interstitials (e.g. ≥60–90s) and/or a cadence (every N levels). The helper below does this.
- **Protect the first session.** Don't show interstitials during FTUE — let new players reach the fun before any forced ad. Consider suppressing them for the first few sessions entirely.
- **Watch retention when you turn them on.** If D1/D7 dips after enabling interstitials, you're over-monetizing; pull back frequency.

## Instrument every placement

Wire ad events through `rundot-analytics` so you can read revenue *and* its retention cost:

- `ad_offer_shown` / `ad_requested` / `ad_shown` / `ad_reward_granted` / `ad_failed` (with `placement`, `type`) — the analytics catalog's monetization taxonomy; offered→requested→shown→granted is your per-placement funnel. Fire `ad_offer_shown` when the button is actually on screen, not whenever an ad becomes ready, so you can see placements players ignore.
- Watch D1/D7 retention and session length **before vs. after** each ad change — ARPDAU up but retention down is usually a net LTV loss.

## Drop-in helper

`ads.ts` wraps preflight, safe reward-granting, interstitial frequency capping, and analytics. Copy it into the project and adapt placement IDs.

## Checklist

```
- [ ] Retention beats the typical RUN game on its platforms before ads are added
- [ ] Rewarded only (no interstitials) unless the genre's comps clearly run them; rewarded ads offered on desktop web too
- [ ] Rewarded ads are the primary surface; rewards feel worth the watch
- [ ] Reward granted ONLY when showRewardedAdAsync resolves true
- [ ] Reward buttons preflight isRewardedAdReadyAsync and hide/disable when not ready
- [ ] Interstitials only at natural breaks, never mid-gameplay
- [ ] Interstitial frequency capped (min interval and/or every N levels)
- [ ] No interstitials during FTUE / first session(s)
- [ ] Every placement passes adDisplayId/adDisplayName and fires analytics
- [ ] Retention + session length watched before/after each ad change
```

## Anti-patterns

- ❌ Maximizing interstitial frequency for ARPDAU while retention (and LTV) quietly collapse.
- ❌ Forced ads mid-gameplay or during the first session.
- ❌ Granting a rewarded prize when the call resolved `false` (ad skipped / not shown).
- ❌ Rewarded ads with rewards so weak no one opts in — you built the surface and earn nothing.
- ❌ No frequency cap on interstitials.
- ❌ Missing `adDisplayId` — you can't tell which placements earn.
- ❌ Copying a hyper-casual ad load onto a low-tolerance (cozy/puzzle) audience.
- ❌ Hiding rewarded ads on desktop web, or replacing them with a RUN Bits purchase — web fills, and a paid-only button there converts almost no one.
- ❌ Judging ad revenue on web against the phone app — the rates differ several-fold.

## Resources

- `rundot-marketing-ua-analysis` — the growth flywheel ad revenue funds; LTV > CPI math.
- `rundot-retention` — protect the retention that ad revenue depends on.
- `rundot-analytics` — instrument placements and watch the retention cost.
- `rundot-monetization-iap` — the other half of monetization; ads + IAP together (hybrid) is common.
- SDK: `RundotGameAPI.ads` — `isRewardedAdReadyAsync`, `showRewardedAdAsync`, `isInterstitialAdReadyAsync`, `showInterstitialAd`.
