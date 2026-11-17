---
name: rundot-marketing-ua-analysis
description: >-
  Decide WHEN to run a paid user-acquisition campaign for a RUN.game title
  (especially the first one), then read campaign performance and optimize spend
  with the `rundot marketing` CLI (CPI, ROAS, CTR, IPM, installs). Use when
  planning or timing a marketing campaign, judging launch readiness, choosing a
  campaign objective, or when the user mentions UA, ad spend, CPI, ROAS, CTR/CVR
  funnel targets, campaign stats, purchase or ROAS campaigns, scaling, or
  "should I run ads yet."
---

# RUN.game Paid UA: Timing & Analysis

Two jobs: (1) decide **when it's the right time to spend on a paid campaign** — especially the first — and (2) **read campaign performance and optimize spend** once live. This is *paid* user acquisition (spending to acquire players); organic sharing is `rundot-marketing-social` (`rundot socials`), asset creation is `rundot-marketing-assets`.

## Always run `rundot socials` — even when spending on ads

**Never skip organic CLI sharing.** Complete the `rundot socials` workflow at every stage — fixing FTUE, re-measuring retention, launching, updating, *and* while paid campaigns are live. Paid UA multiplies your funnel; organic fills it for $0. There is no excuse to skip free promotion.

```bash
rundot socials profile show
rundot deploy --public --changelog "<real release notes>"
rundot game info
rundot socials prepare --update <version>
rundot socials open reddit --target playmygame   # review and rewrite the caption for this platform
rundot socials mark-posted <platform> --url <url>
rundot socials verify
```

Use socials to: gather playtesters, drive sessions to re-measure retention, learn which hooks resonate, **and** supplement paid campaigns with free installs. If a creator asks "how do I get users?" route to `rundot-marketing-social` and run the CLI — always. Route here for paid only when retention gates are met, but **still run socials in parallel**.

## Coaching approach — ask, teach, reveal blind spots

Paid UA is where inexperienced creators lose the most money the fastest, usually by spending before the game is ready or by misreading the numbers. Your job is to slow them down, make them confront the unit economics *before* spending, and teach them to read a campaign honestly. Ask, teach, and surface the questions they've never had to answer.

Ask as you go (a couple at a time):

- What are you hoping this campaign proves — that people *install*, or that they *stay and pay*? (Those are different tests.)
- What is a player worth to you, and what can you afford to pay to acquire one? (If they don't know: that's the first lesson.)
- What are your current D1/D7 numbers on each platform, and how do they compare to the typical RUN game there?
- How much are you truly willing to lose on a learning test — and is this money you can afford to burn?
- If the campaign "works," what's your plan to fund the next one? (Introduce the flywheel.)
- If it comes back red, what will you do — and how will you know *why* it failed?

Teach the why, and name the blind spots first-timers miss: **paid UA multiplies your funnel, it doesn't fix it** — buying installs for a game that doesn't retain just burns cash faster. Most beginners optimize on CPI alone and ignore whether installs retain or pay. They read tiny cohorts as gospel. And they don't grasp `LTV > CPI` — the single equation that decides whether spending builds a business or a money pit. Make them sit with these before a dollar is spent.

## When to run your first campaign

**The core principle: paid UA multiplies whatever your funnel already does — it doesn't fix it.** Buying installs for a game that doesn't retain or monetize is paying to fill a leaky bucket: the players churn and the money is gone. The right time to run your first campaign is *after* the funnel holds water, not before. A campaign is also how you'd *validate* that — but as a small, cheap **learning test**, never an immediate scaling push.

### Readiness gate — clear these before spending

```
- [ ] Build is stable: crash-free rate ~99%+ (see rundot-analytics error tracking)
- [ ] Core loop is fun and the FTUE gets players to it (rundot-ftue-onboarding)
- [ ] Analytics instrumented so you can actually read the funnel (rundot-analytics)
- [ ] Retention beats the typical RUN game on the platform you'll buy (see below) — the earliest product-market-fit signal
- [ ] A basic retention reason exists so acquired players come back (rundot-retention)
- [ ] You know your ROAS target and payback window BEFORE spending (see below)
```

If retention is below the typical RUN game on that platform, **iterate on the product first** — do not scale spend on a broken funnel.

### Retention bars on RUN

Use RUN's own numbers, not industry medians — RUN's players and platforms differ from a store-installed mobile game. Compare each platform to its own baseline (per-platform table in `rundot-game-coach`, "Read the numbers per platform"):

- **Typical RUN game, new players:** Android D1 7–11%; desktop web 3–5%; mobile web 1.5–4%.
- **Typical $100 Meta test (Android):** about 5–6% of paid players back the next day, and usually nobody on day 7. Standout tests reach roughly 17–29% D1.
- **The payback bar:** for paid installs to earn back their cost, a game needs roughly **35% D1 and 12% D7** on its acquired cohort. Few games reach it; the usual gap is D2–D7, not D1.
- D1 is the earliest true PMF signal; a broken retention curve is a product problem no amount of spend fixes.
- Judge D1 on mobile installs. Web traffic retains far less, drags any blended number down, and makes a web-only campaign (at best) a creative/CPI signal, never a retention verdict.
- **Small-test numbers are a ceiling.** The first players a campaign finds are the keenest; as spend grows, ad networks reach broader audiences and D1, session length and CTR usually fall while CPI rises. Plan on a $100 test's numbers getting worse at scale, not better.
- **Measured campaign retention doesn't depend on the game's own events.** RUN computes it from its own session data. Some installs drop out of the campaign's cohort when the campaign tag doesn't carry through to a RUN account — that shrinks the group rather than counting them as churned, so read small cohorts as directional.

### Choosing a campaign platform: Android vs iOS vs web

Each platform answers a different question. Pick the platform for the question you're asking, not the audience you eventually want.

| Platform | Best for | Cost | What it can tell you | What it can't |
|---|---|---|---|---|
| **Android** | First paid test, first real D1 read | Lowest mobile CPI | Marketability (hook/CTR/CPI) **and** retention — clean install signal, cheapest learning per dollar | iOS-specific behavior, payer quality on iOS |
| **iOS** | Scaling a game that already retains; monetization reads | Highest CPI | Higher-value users, stronger payer conversion — where the LTV usually is | A cheap first read; attribution is noisier (ATT/SKAN), so small tests are murky |
| **Web** | Cheap creative/hook screening only | Cheapest clicks | Whether an ad concept gets attention (hook rate, CTR), rough CPI feasibility | **Retention — at all.** Web players barely return; any D1 from a web campaign is noise, not a verdict |

**The default sequence:**

1. **Android, tier-1 countries first.** Low CPI plus reliable attribution means you learn the most per dollar: one small test gives a directional read on creatives *and* the first honest D1.
2. **iOS second, after retention is green on Android.** iOS installs cost 2–3× more, so buy them once you know the game holds players — that's when the higher iOS LTV is worth paying for. Expect small iOS tests to be noisy; give them more installs before judging.
3. **Web only as a creative screener, if at all.** It can cheaply tell you whether a hook or ad concept gets clicks before you spend mobile budget on it. Never use it to judge retention or marketability of the game itself — a "failed" web campaign proves nothing about the product, and a "successful" one proves nothing beyond the ad. If you skip web screening entirely and go straight to Android, that's fine.

**Platform-choice anti-patterns:**
- ❌ Running a web campaign to "cheaply check if the game retains" — web retention is structurally terrible regardless of game quality; you'll conclude the game is broken when only the channel is.
- ❌ Starting on iOS because "that's where the money is" — the money is there, but so is 2–3× the CPI and murkier attribution; earn the iOS spend with an Android retention read first.
- ❌ Blending platforms in one read — judge each platform's D1/CPI separately; a mixed cohort hides which channel is working.

### Know your target before you spend

Set the ROAS target and payback window up front, matched to the **monetization model** — comparing across models is a category error:

- **Ad-monetized (hyper/hybrid casual):** short payback, benchmark **D3–D7 ROAS**.
- **IAP-driven:** benchmark **D7–D14** (some to D30).
- **Subscription:** benchmark **D30–D90**.

The math that governs scale: **LTV > CPI, paid back inside your payback window.** Know these numbers before spending, not after.

**Payback doesn't have to be immediate** — it accrues across the window. A subscription game recouping a $3 install over 60 days is healthy; judging it on D1 revenue would kill a profitable campaign.

**UA and monetization are one problem, not two.** As monetization improves, the CPI you can afford rises, so audiences and channels that were unprofitable last month become viable. When CPI is already at the ceiling of what you can pay, raising ARPU (`rundot-monetization-iap` / `rundot-monetization-ads`) is as legitimate a fix as cheaper creative.

### The growth flywheel: monetization funds UA

This is the whole point of monetization — not just to earn, but to **fund acquisition and build a self-sustaining business.** When each player earns more than they cost to acquire (`LTV > CPI`), every dollar of spend comes back as more than a dollar of revenue, and you recycle that revenue into more installs:

```
spend on UA → acquire players → they retain & monetize (ads/IAP)
   → revenue > acquisition cost → reinvest the surplus into more UA → repeat
```

The loop only spins if two things hold: **retention** keeps players around long enough to monetize, and **monetization** (`rundot-monetization-ads` / `rundot-monetization-iap`) turns that time into revenue above CPI. If either is weak the flywheel stalls — you're spending faster than you earn. That's why this skill gates on retention *and* a known LTV before authorizing scale: a healthy flywheel is what turns a game into a business, and a broken one just burns cash faster the more you spend.

### Run the first campaign as a test

An early campaign is not about scaling — it exists to answer four questions:

1. Does the market respond to the creative?
2. Is the game's marketing appealing enough to generate clicks?
3. Does the store / landing page convert visitors into installs?
4. Can the game's monetization support paid acquisition?

**Validate the entire funnel before increasing spend** — a green answer on one question with the others unread is not validation, it's the setup for scaling a leak.

- Start **small and cheap** — a modest budget to reach a readable signal, not to grow yet.
- **Read the full funnel** (below), decide, iterate. Only scale when early ROAS is positive/trending and LTV > CPI within the payback window.
- **If D0/D7 ROAS looks strong but D30 collapses, it's a retention problem, not a UA problem** — go back to product.

### Campaign objective: install campaigns validate, purchase campaigns scale

`rundot marketing prepare` sets the optimization intent with `--campaign-type` and the channel with `--network` (default `meta`). The defaults are right for the cheap first test — but **scaling does not come off the back of install campaigns unless the game is heavily ads-driven.** An install objective buys the cheapest *installer*, who is rarely the same person as a payer. When revenue is IAP or subscription, meaningful spend is driven by purchase / ROAS campaigns that optimize toward players who actually buy.

| `--campaign-type` | Use it to | Requires |
| --- | --- | --- |
| `traffic-install` (default) | Validate the funnel — CTR, CVR, rough CPI feasibility | Nothing extra |
| `purchase` | Scale IAP/subscription revenue by optimizing for payers | Meta purchase conversion signal live, **and a game that already sells** — with almost no in-game purchases, Meta has no buyers to learn from and spends several times the install CPI to find one or none |
| `value` | Scale on ROAS by optimizing for revenue per player, not payer count | Same signal, plus enough purchase volume to learn from |
| `tutorial-complete` (web legs) | Optimize mobile-web traffic toward players who learn the loop | The game sends `tutorial_complete` under that exact name (`rundot-analytics`); otherwise the leg gets no conversion signal. App legs optimize for installs regardless |

Meta `prepare` shows purchase readiness for each leg kind. Web readiness uses
delivered purchases with a Meta click in the last 7 days across all games.
App readiness uses the account purchase count across all apps. These counts
do not measure one game's readiness. Only staff can see the counts.
Other users see a status. The line gives the thresholds per ad set:
50 for purchase learning and 15 for app Value. Web Value has no known threshold.
An error or legacy delivery mode shows `readiness unavailable`.
This line does not stop preparation and needs no new flag.

For Meta purchase and Value campaigns, new conversion counts contain purchases
only. Provider installs are separate. Rows without `conversionsDefinition: 2`
show `legacy, includes installs`. Do not use these rows to calculate purchase
CPA. Use mobile attribution for the Installs column.

Any Meta Value leg failure stops submission. The server attempts to delete each
created object. The CLI shows the leg and provider error. Check each ID whose
removal was not confirmed. The IDs can refer to Meta objects, shares, or
campaign documents. Meta campaigns were created paused. The CLI recommends
`--campaign-type purchase` only for a verified Meta Value refusal.
Cross-channel web optimization remains disabled until the operator approves
and completes the paused-object Meta test.

```bash
# Funnel proven and purchase signal live — switch the objective to scale
rundot marketing prepare --name scale-q3 --campaign-type purchase \
  --platforms android,ios --countries US,CA,GB,AU,NZ,IE,DE,NL,SE,NO,DK --budget 2500000 --days 21
```

**Sequence it:** cheap `traffic-install` run to prove the funnel → purchase signal live → `purchase`/`value` to scale.

Meta Android is the standard campaign. `--network` also accepts `google`, `reddit`, `run`, and `unity`, and `--platforms` accepts `ios` and `web`; these are limited previews, so stick to Meta Android unless RUN has asked you to try one. Of those only `reddit` supports `purchase`/`value`; `google` supports `traffic-install` and, on web legs only, `engaged-play` (canonical game page, bidding on the engaged-play conversion once RUN has set it up); `run` and `unity` are `traffic-install` only, and a bad pairing is rejected at `submit`, not `prepare` (google engaged-play is the exception: `prepare` checks it, including with the server). Google additionally takes `--google-bidding`: `maximize-clicks` (default, no conversion setup needed) or `maximize-conversions`, which requires Google Ads conversion tracking already in place — don't reach for it before conversions are actually tracked. Run `rundot marketing prepare --help` for the authoritative current values.

### Budgets, durations & sample sizes for a clean read

Rules of thumb — they depend on genre, CPI, and effect size, so treat them as starting points and verify against current benchmarks.

**Budget — a real first test is small**

A first test is a cheap **viability sniff**, not a statistically significant read. Its job is to answer: *can I hit a sane CPI, does a hook stop the scroll, and are there glaring funnel red flags?* — not to prove D7 retention or ROAS.

- **First test:** ~**$350 total** — **$50/day for 7 days**, **Android only**, **the tier-1 country list**, the **default 10-image creative set** (`rundot marketing generate` with no `--variants`). At this size you get a directional read on **hook rate, CTR, and rough CPI feasibility** (a few thousand impressions is enough). You will *not* get a stable retention or ROAS read — don't over-read it.
  - **Android only:** lower CPI than iOS and cleaner install signal — you learn more per dollar on your first spend.
  - **Tier-1 countries:** `US,CA,GB,AU,NZ,IE,DE,NL,SE,NO,DK`. These are English-speaking and high-value markets that behave like the US, with much cheaper inventory: on the same game, the tier-1 list ran at about two-thirds of the US-only CPI. **Always pass `--countries` explicitly** — leaving it out means **US only**, the most expensive Android inventory there is, and the prepare summary just says "default geo".

```bash
rundot marketing prepare --name first-test --platforms android --countries US,CA,GB,AU,NZ,IE,DE,NL,SE,NO,DK
```
- **Don't go below ~$50/day.** Under that, Meta can't gather enough install signal to optimize, and `prepare` warns. If the budget is tight, shorten the window rather than lowering the daily rate.
- **Reaching statistical significance is a later, bigger step:** a proper soft-launch read of retention/ROAS needs ~$1,000+ per cohort, often **$2,000–$5,000 per platform** (up to $5k–$10k across channels). That's the stage *after* your cheap test shows the ad→install pipeline is viable — not the first spend.
- RUN budgets are a **campaign-wide lifetime total in credits** (where 1,000 credits = $1 USD; e.g. 350,000 credits over 7 days for a first test; set via `rundot marketing prepare --budget <credits>` and `rundot marketing budget --credits <credits>`, funded from prepaid credits); `--platforms` selects which legs are ON, not a per-platform amount. Scale gradually and watch ROAS hold.

**Duration**
- **Match the run to the metric you're gating on.** A cheap first test reading hook rate / CTR / CPI only needs **~5–7 days**. A D7 ROAS/retention decision needs ≥7 days of cohort maturation *plus* ramp, so a proper significance read runs **~2–6 weeks per iteration**.
- **Kill individual creatives fast:** 48–72h is enough to judge hook rate / CTR / CPI.
- **Don't judge too early** — early-hour numbers are noisy; let cohorts mature before deciding.

**Minimum sample sizes (players/events per variant for a trustworthy read)**
- **Hook rate / CTR:** ≥100 clicks per variant — at a ~1% CTR that's ~10,000 impressions.
- **CPI:** ~100+ installs per variant for a rough read; more to stabilize.
- **D1 / D7 retention:** aim for **~1,000 installs per cohort** for a stable read; a few hundred is directional at best.
- **ROAS / payer conversion:** with payer rates around 1–2%, you need **thousands of installs** before revenue is a meaningful signal — treat early ROAS on tiny cohorts as directional only.
- **Isolate one variable per test.** Every extra test cell splits your traffic, so more cells means proportionally more budget/time to reach significance in each. A cell is a campaign or ad set, not an image: the images in one Meta asset pool share one ad, and Meta shifts delivery toward the winners on its own, so keep the full 10-image set whatever the budget.

## Test gates: the green-light flow

Treat each test as a set of **gates**. You need a green light on both before scaling. This gives a first-time creator a clear, honest decision path instead of endlessly burning money.

### Gate 1 — a reasonable CPI for the genre

Green means your CPI lands at or below a viable level for your genre and platform, so `LTV > CPI` is achievable. Rough **US** benchmarks (2026 — vary by genre/quality/creative and shift over time, so verify current numbers):

| Genre | Android CPI (US) | iOS CPI (US) |
| --- | --- | --- |
| Hyper/hypercasual | ~$0.25–1.50 | ~$0.50–2.50 |
| Casual / puzzle | ~$1.50–3.00 | ~$2.50–5.00 |
| Mid-core (RPG/strategy/action) | ~$3–6 | ~$5–8+ |

(You're testing Android first, so judge against the Android column; a tier-1 mix should land at or below these US figures.) **Red on CPI** is usually a creative or targeting problem, not a product one — iterate creatives (`rundot-marketing-assets`), tighten the audience, and re-test. A too-expensive install breaks the LTV math no matter how good the game is.

### Gate 2 — a green light on retention

Green means acquired players clearly beat the typical RUN test and game on that platform (see "Retention bars on RUN" above); scaling with confidence needs the payback bar. Retention is the real product signal; a cheap CPI with red retention is still a loss.

**If you're NOT green on retention, stop buying installs and fix the funnel — in this order — before spending again:**

1. **Telemetry first — check for crashes.** A crash or error silently tanks retention and is the cheapest thing to fix. Confirm the game is instrumented and crash-free via `rundot-analytics` (`error_occurred`, window/unhandledrejection capture).
2. **Onboarding / FTUE design** — is the first session getting players to the fun fast? (`rundot-ftue-onboarding`).
3. **FTUE funnel drop-offs** — read the granular FTUE funnel and find the exact beat losing players (`rundot-analytics`). Fix the biggest drop.
4. **Retention mechanics** — is there a reason and a reminder to come back? (`rundot-retention`).

Then **run a second test.**

### If the second test still comes back red

Be honest with the creator. If retention still won't beat the typical RUN game after a genuine pass through telemetry, FTUE, and retention fixes, ask them to **sincerely consider whether they can realistically improve it — or whether it's time to move on to a new game.** Not every concept retains, and sunk cost (money and time already spent) is not a reason to keep spending. Starting fresh on a stronger idea often beats pouring more into one that won't hold players. This is a real, respectable outcome — surface it plainly rather than encouraging endless spend.

**Both gates green →** proceed to a larger significance read and scale gradually (below).

## Reading campaign performance

Campaigns run on your prepaid **credits**. A campaign spends only after RUN reviews and approves it; see `rundot-cli` → `references/marketing.md` for exactly when credits are reserved and returned.

### Start by reading campaign history (do this first)

Before advising on a new test, **always check whether this game already ran campaigns.** Don't ask the creator from scratch if the CLI can answer.

```bash
rundot marketing list                                  # all campaigns + latest snapshot
rundot marketing status --name <campaign>              # status, budgets, rejection reason, Meta IDs
rundot marketing stats  --name <campaign> --days 30    # daily spend, CTR, installs, CPI, ROAS
```

Also scan the project for local artifacts: `rundot/marketing/` folders, `cli-export-*.json`, contact sheets — these show what was submitted even if the creator forgets.

**What to pull from history:**
- Campaign names, status (`flighted`, `rejected`, `paused-external`, etc.) and any `rejectedReason`
- **Platform** the spend ran on (web vs android vs ios) — a mobile-game test on web-only is not comparable to Android/US
- Spend, impressions, CTR, installs, CPI — read together, not in isolation
- Whether status is `paused-external` (creator edited in Meta Ads Manager; campaign auto-paused — fix via CLI only)

Summarize past tests back to the creator before recommending the next one. If installs are 0 despite high CTR, diagnose the **ad→install** funnel before blaming retention or scaling spend.

```bash
rundot marketing list                                  # all campaigns + latest snapshot
rundot marketing status --name spring-push             # status, budgets, IDs
rundot marketing stats  --name spring-push             # last 30 days (table)
rundot marketing stats  --name spring-push --days 30 --format csv > out.csv
```

`stats` reports spend, impressions, clicks, CTR, mobile installs, mobile CPI,
game revenue, and creator ROAS. Game revenue is the promoted game's
creator-dashboard revenue before the creator share. It includes paid Buck spend
in that game, less refunds, plus finalized game ad revenue. It excludes wallet
purchases until the value is spent in the game. Provider conversion value is a
diagnostic. It is not game revenue. Ad revenue can lag through the last
finalized UTC day. A `—` (table) or blank cell (CSV) means **no data reported**,
not zero.

Manage a live campaign (always via the CLI, never in Meta Ads Manager — out-of-band edits auto-pause the campaign):

```bash
rundot marketing budget --name spring-push --platforms ios,android --credits 250000
rundot marketing pause  --name spring-push     # stops delivery; credits stay reserved, unused days are saved
rundot marketing resume --name spring-push
rundot marketing cancel --name spring-push     # permanent; unspent credits return to your balance
```

## Metrics that matter (read them together)

| Metric | What it tells you | Trap |
| --- | --- | --- |
| Hook rate (3-sec view %) | Did the opening stop the scroll? | A great hook on a weak game still churns |
| CTR | Did the ad earn the tap? | High CTR + low store CVR = misleading creative |
| IPM (installs/1k impressions) | Combined creative + store strength | Channel-dependent — compare like-for-like |
| CPI | Cost per install | **Cheap CPI means nothing if retention is bad** |
| Store CVR | Did the store page close the promise? | Often the real bottleneck, not the ad |
| D1 / D7 retention | Did the install become a player? | The earliest true quality signal |
| Early ROAS (D3/D7) | Is spend paying back? | **The only metric that authorizes scaling** |

Never judge on CPI alone — a cheap install that churns is a loss.

### The funnel chain: CTR → CVR → CPI

Read the top of the funnel as a chain — high CTR = people want to learn more, high CVR = the page closes the promise, low CPI = the funnel is efficient — and note who owns each link:

| Stage | Target | Primarily driven by |
| --- | --- | --- |
| CTR | **3%+** | Ad creative and messaging |
| CVR (click → install) | **30%+** | Store / landing page — icon, screenshots, feature graphic |
| CPI | Below ARPU/LTV | Combined effect of CTR, CVR, CPM, and auction competitiveness |

**The links are not equally weighted — CTR is the highest-leverage lever.** A lift in CTR pulls CPI down well beyond the click-cost arithmetic, so fixing creative (`rundot-marketing-assets`) is usually the cheapest way to move the whole funnel at once.

**These are goals, not averages — don't confuse the two.** The gaming-feed CTR *average* is ~1%, which is what `rundot marketing stats` calibrates against: it raises a soft advisory only below ~0.5% (half the average), once a campaign has ≥5,000 impressions. So a 1.5% CTR clears the CLI's floor while still sitting well short of the 3%+ you're aiming for — one is "not alarming", the other is "good". Judge creatives only after the ~7-day learning phase either way.

**The 30% CVR target is not the CVR column in `stats`** — different denominators. The target means store-page-view → install. `rundot marketing stats` computes mobile installs ÷ **all** clicks, for **app legs only**, so it will read lower and the two aren't comparable. On a web-only campaign the column shows `—` (missing data, not a dead funnel); on a mixed app+web campaign it's *understated*, because the numerator counts app installs while the denominator counts clicks across every leg.

"Store" means whichever page takes the click: an App Store / Play listing on an app leg, the game's landing page on a **web leg, which has no store page at all**.

## Scale / hold / kill

- **Kill fast.** A creative or campaign under your CTR threshold or above target CPI gets ~48–72h, then cut it. Don't nurse losers.
- **Hold & iterate.** Signal is mixed — change one variable (creative hook, audience, budget) and re-read.
- **Scale.** Early ROAS is positive and LTV > CPI within the payback window — raise budget gradually (via `rundot marketing budget`), watching that ROAS holds as spend grows. If revenue is IAP/subscription, switch the objective too (see *Campaign objective*): raising budget on a `traffic-install` campaign buys more installs, not more payers.

### Diagnose the failure point

When a campaign underperforms, locate *where* before reacting — each needs a different fix:

- **Acquisition** — CPI too high for your LTV → creative/targeting problem (`rundot-marketing-assets`), or raise what you can afford to pay (`rundot-monetization-iap` / `-ads`). Split it further: a high cost per thousand impressions and a weak click→install rate are different fixes from a weak CTR.
- **Low CTR, strong D1** — the game holds the players the ad does bring; the ad is the weak link. Test new creative that shows the biggest moment (the power fantasy, a screen full of action) in the first second, and make the store page's first screenshot match the ad, before spending more.
- **Product** — installs don't retain (D1/D7 low) → fix the loop/FTUE, not the ads.
- **Monetization** — players stay but don't pay/convert → economy/offers (`rundot-monetization-iap` / `-ads`).

## Anti-patterns

- ❌ Skipping `rundot socials` because you're running paid UA — always shill for free; organic and paid are additive.
- ❌ Recommending paid UA without completing the `socials profile show` → changelog → `prepare --update <version>` → caption-edit workflow — free tracked promotion has zero downside.
- ❌ Running a first campaign to *scale* rather than to *learn* — burn money before you know the unit economics.
- ❌ Spending on paid UA before retention beats the typical RUN game on that platform — filling a leaky bucket.
- ❌ Running a purchase-optimized campaign for a game with almost no in-game purchases — the network has no buyers to learn from.
- ❌ Expecting a small test's D1 to hold at scale — it's a ceiling.
- ❌ Optimizing on CPI alone — ignores whether installs retain and pay.
- ❌ Scaling on install campaigns when revenue is IAP/subscription-driven — an install objective optimizes for installs, not payers.
- ❌ Treating UA and monetization as separate problems — better monetization is what makes more campaigns profitable.
- ❌ Not setting a ROAS target / payback window before spending.
- ❌ Reacting to D0 ROAS drops with more spend when it's a D30 retention problem.
- ❌ Editing budgets in Meta Ads Manager — do it via `rundot marketing budget` or the campaign auto-pauses.
- ❌ Reading a `—`/blank stat as zero — it means no data.
- ❌ Drawing conclusions from cohorts too small to be significant (e.g. judging D7 retention on 50 installs), or splitting a tiny budget across too many test cells.
- ❌ Buying more installs to fix red retention instead of fixing crashes/FTUE/retention first.
- ❌ Letting sunk cost drive spend — if retention won't improve after a genuine fix pass, moving to a new game is a valid outcome.

## Resources

- `rundot-marketing-social` — **always complete the socials workflow** alongside paid campaigns: confirm the profile, ship a changelog, prepare the promoted version, then edit each caption before posting.
- `rundot-marketing-assets` — the creatives a campaign runs on; scale/kill decisions feed back into creative.
- `rundot-analytics` — retention, funnels, and crash rate that gate readiness.
- `rundot-retention` / `rundot-ftue-onboarding` — fix the funnel before scaling spend.
- `rundot-monetization-iap` / `rundot-monetization-ads` — LTV side of the LTV > CPI math.
