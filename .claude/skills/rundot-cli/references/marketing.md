# Paid ad campaigns — `rundot marketing`

Generate creative and run paid ad campaigns for **your own RUN game**. Meta and
Google are live networks; Reddit is wired but flight-gated; Unity submissions
end paused and require Unity creative approval plus human flighting. One
campaign is one network (`--network meta|google|reddit|run|unity` at
`prepare`, default `meta`).

## Before you start

- **Meta Android and Meta web** campaigns, and **Google web-only** campaigns,
  need no setup flag. Google app legs, the `ios` platform, and the `reddit`,
  `run`, and `unity` networks are limited previews behind
  `RUNDOT_BETA_FEATURES=1`; use them only when RUN has asked you to try one.
- **Logged in:** `prepare` / `generate` / `submit` hit prod, so run
  `rundot login` first.
- These commands manage campaigns for the game configured in the current
  directory (the one `rundot init` set up).
- **Do not touch internal ops tooling (`marketing ops`).** It's internal admin tooling and
  requires `VENUS_INTERNAL_API_KEY`.

## Lifecycle

```
prepare → refs → fill the prompt briefs → generate → review/--regen → preview → submit → status / stats
```

1. **`rundot marketing prepare --name <name>`** — scaffolds the campaign folder,
   pulls the game's name/description/keywords/thumbnail into `campaign.json`, and
   prints the creative format summary (dimensions, counts, byte caps). Optionally
   set `--network`, `--platforms`, `--campaign-type`, `--budget`, `--days`,
   `--genre`, and `--art-style` here (see below). `--art-style` takes a preset
   (`chibi`, `pixel`, `anime`, `flat-cartoon`, …), `match-references` (stick to
   the attached reference images — right for a game with an established look),
   or any custom description up to 200 characters. **Always pass
   `--countries`**: omitting it targets **US only**, the most expensive
   inventory. The recommended starting list is the tier-1 set
   `--countries US,CA,GB,AU,NZ,IE,DE,NL,SE,NO,DK`.
2. **`rundot marketing refs --name <name>`** — assembles a labeled reference
   palette and prints paste-ready `--reference <path>:<label>` lines (pass
   `--scan-dir <dir>` to also scan your own art). Pick the most recognizable cast,
   and prefer 1–2 real in-game screenshots over logo/title art.
3. **Fill the briefs** — each kind's prompt in `campaign.json` has a single
   `[[AGENT: …]]` line; replace it with concrete creative direction (name the
   characters, pose, camera, lighting, palette). `generate` refuses any prompt
   that still contains the `[[AGENT:` sentinel.
4. **`rundot marketing generate --name <name>`** — generates one numbered image +
   sidecar per ad creative. With no `--kind` it makes every ratio the network
   ships; on Meta that is the **default 10-image set — 4 square (1:1), 3 vertical
   (9:16), 3 landscape (1.91:1)** — at any budget (a `--csl` campaign gets 3
   concepts in all three ratios, 9 images, one ad per concept). Don't pass `--variants`, and
   don't cut the set down to fit a small budget: the whole pool runs as one ad
   and Meta picks the winners. `--reference` requires `--kind`, so with
   references run `--kind square`, then `--kind vertical`, then `--kind
   landscape`, once each — still 10 images. For Unity, it also
   generates the required single 15-second portrait MP4 from `prompts.video`.
   Default image model is fast/cheap; pass `--hi-fi` (or
   `--model gemini-3-pro-image-preview`) when quality matters. Use `--regen` /
   `--new-seed` / `--reference` to iterate (previous versions are kept in
   `.history/`). Run `rundot marketing tips` for the full creative
   best-practices guide.
5. **`rundot marketing preview --name <name>`** — opens a **local, offline**
   browser preview of the exact images + copy that `submit` will ship (no
   network, no auth). `--select <ids>` narrows what ships and persists to the
   campaign. Always preview before submitting.
6. **`rundot marketing submit --name <name>`** — uploads assets and creates the
   provider campaign. Meta Dynamic Creative (placement delivery or any web leg)
   enforces a combined limit of 10 images and videos. In asset-pool mode without
   a web leg, app-only campaigns allow up to 30 images and 10 separate videos.
   Google campaigns allow up to 20 images (10 square + 10 landscape); past ten,
   each ships in its own aspect only, so all of them run.
   Meta may spend after flight; Unity creates a paused install
   campaign and waits for Unity creative moderation. It prints a pre-flight
   summary + irreversibility note first.
7. **`rundot marketing status --name <name>`** / **`stats --name <name>`** —
   track flight status/budgets and performance. Mobile installs/CPI mean app
   downloads; RUN acquisitions mean a player's first recorded advertised-game
   session, never a download. `stats` displays rolling retention (24–48h exact interval,
   10-second session qualification, explicit measured/pending/unavailable/error states,
   and snapshot provenance) separately from legacy calendar retention. `stats` takes
   `--days <n>` (default 30), `--format table|csv`, `--breakdown`, `--creatives`.

## Read stats with their source context

Rows are cumulative observations. `--days` selects stored observations; it does
not select daily increments. `TOTAL` uses the newest summary. Do not sum rows.
Game D1 can use an older permitted observation. `game_d1_as_of` names that date.

Mobile installs and CPI use the recorded AppsFlyer interval. Its start and end
are inclusive UTC days. Coverage can be `complete`, `partial`, `stale`, `unknown`,
or `none`. A missing Cost leaves CPI unavailable even with known installs.
A measured zero cost can give zero CPI when installs are positive. An unknown
or zero denominator gives no rate. ROAS divides the game revenue shown by the
spend shown. Keep the revenue observation time when an earlier value is retained.

Mobile CVR is unavailable because rolling installs have no aligned click
window. The API returns `mobileCvr=null` with
`mobileCvrReason=no-aligned-click-window`. Do not divide rolling installs by
lifetime clicks. RUN CVR keeps its separate first-game-session/click basis.

`stats --format csv` includes `observed_at`, `install_since_day`,
`install_through_day`, `install_coverage`, `install_observed_at`,
`creator_revenue_observed_at`, `mobile_cvr_reason`, `game_d1_as_of`, and `period`.
`period=cumulative-observation` describes each snapshot row. Install fields
retain their own rolling dates. Missing values use empty CSV cells or an
unavailable table mark. Measured zero stays zero. JSON API fields use null with
context; marketing CLI formats remain `table|csv`.

`list` spend is nullable. Its `spendObservation` carries the value, source,
and observation date. The shared selection uses `performance-snapshot` first,
then `budget-observation` if no snapshot exists. With neither source, it returns
`unavailable` and a null value. Dates come from snapshot compute time or budget
reconciliation time. A missing date stays unknown. `status` shows the same
selected source and date. Do not replace unavailable spend with zero.

`list --format csv` appends seven context columns: `observed_at`,
`install_since_day`, `install_through_day`, `install_coverage`,
`creator_revenue_observed_at`, `spend_source`, and `spend_observed_at`.
Other fields retain their existing meanings.

Campaign API and marketing CSV rates use fractions: `0.25` means 25%.
Tables show percentages. Money uses USD. ROAS is a ratio, not a percentage.
`creator_roas=0.25` means $0.25 of game revenue per $1 of spend.
Campaign success comparisons use the server assessment and its configured
`campaign-card-success-v1` policy. Missing benchmarks or incomplete evidence
leave a metric unjudged. Tracking diagnosis, creator-program eligibility, and
spend-control recommendations have separate purposes.

For published dashboard values, use
`rundot analytics export dashboard_summary --game-id <id>`. This game query
requires content ownership. Its 21-column CSV ends with `source_observed_at`
and `source_observation_reason`. The first is empty; the reason is
`not-recorded`. The published contract has window bounds but no source
`computedAt` or revision. This legacy source context remains unknown.
`read_at` records the request read time. It does not supply source observation
time or revision. Rates are fractions. The five corrected
warehouse activity/retention exports remain live diagnostics. They exclude the
owner and report their own dates and observation time. Warehouse `*_pct` fields
use percentage points. Compare D1/D7/D30 using their named denominators.
In `retention_by_platform_30d`, deprecated `cohort_players` keeps the legacy
shared D1/D7 window.

## Spend safety — this is the creator's money

`submit` is not the Unity spend step: Unity remains paused until a human flights
an approved pack. Before and after submit, these are the levers:

- **Set the budget deliberately** at prepare time (`--budget <credits> --days <n>` —
  one campaign-wide total in credits over a fixed window; budget 50,000–25,000,000 credits,
  default 250,000 credits; min 50,000 credits = $50 USD; 1,000 credits = $1 USD),
  and adjust a running campaign with `rundot marketing budget --name <name> --credits <credits>`. Use multiples of 10 credits (1 cent).
- **Stretch the window** without adding money:
  `rundot marketing extend --name <name> --add-days <n>` (same total, paced
  longer; a window can only grow — `cancel` is how you stop early).
- **Pause / resume** a running campaign: `rundot marketing pause --name <name>`
  and `rundot marketing resume --name <name>`.
- **Stop it for good:** `rundot marketing cancel --name <name>` permanently
  cancels the campaign, stops spend, and returns the unspent credits.
- **See everything:** `rundot marketing list` uses the Installs column for
  RUN first recorded game sessions or mobile app downloads. The table explains
  the basis. Launches stays separate. In `stats`, ProvInst preserves provider
  installs on rows and TOTAL. CSV keeps separate mobile and RUN fields.
- **Ongoing / Evergreen Campaigns:** Set `--ongoing --daily-budget <credits>` during `prepare`.
  Ongoing campaigns run continuously without an expiration date. An initial 3-day
  rolling commitment buffer (3 × daily budget) is reserved, and the flight window
  extends by 24 hours every day as long as credits remain in your balance. Pass
  `--confirm-ongoing` to `submit` to confirm automated daily extension.
  The daily budget is all an ongoing campaign needs: a total cap is optional.
  To cap total spend, add `"maxTotalSpendCents": <cents>` (at least 3 × the
  daily budget) to `campaign.json`.

**How your credits move:**

- **`submit` charges nothing.** The campaign waits for RUN review; a rejected or
  withdrawn campaign never costs anything.
- **When RUN approves it and it goes live, the whole budget is reserved** from
  your credits in one go. Not enough credits, and it doesn't go live.
- **Spend is billed against that reservation** — ad spend plus RUN's processing fee.
- **Raising the budget** charges the difference right away. **Lowering it**
  returns nothing yet; the freed amount comes back when the campaign ends.
- **Pausing returns nothing.** The reserved credits stay with the campaign and the
  unused days are saved; `resume` picks up where it left off. To get credits back,
  `cancel`.
- **When the campaign ends, the unspent remainder comes back to your balance
  automatically** — whether the budget ran out, the window ended, or you
  cancelled it.

Never `submit` without confirming the creator understands a real budget will be
spent. If they're unsure, stop at `preview` and confirm the plan first.

## Ad copy is campaign-level (author once)

Meta folds every image into one Dynamic Creative feed and applies a single
**headline × primary-text** set across it. So author copy **once** in
`campaign.json`:

- `"headlines"` (≤ 40 chars) and `"primaryTexts"` (≤ 125 chars), up to 5 options
  each; Google campaigns are tighter (≤ 30 / ≤ 90). Numbered sidecars carry
  prompt/seed/refs only — putting copy there does nothing.
- When `campaign.json` has no copy (or only the untouched default seed), `generate`
  has RUN's ad copywriter write five headlines and five primary texts, each on a
  different angle (one metered text-LLM call). Review them before submit.
  `generate --refresh-copy` replaces existing copy with a new set. If the call
  fails, `generate` warns and seeds defaults from the game name/description.
- Every option must be different: `submit` rejects a headline or primary text that
  repeats another, ignoring case and punctuation (`"Fight!"` repeats `"fight"`).
- `submit` resolves copy `campaign.json` → first sidecar (back-compat) →
  defaults, then replicates the resolved set onto every creative. `preview`
  resolves the same way, so preview always matches what ships. `submit` fails
  only if the *resolved* copy is a placeholder, too long, or has too many options.

## Platforms, dimensions, and campaign type — different axes

- **`--platforms web,ios,android`** (set at `prepare`) selects which Meta **ad
  legs** run. It does **not** change creative dimensions. Omit to run Android
  only; web and iOS are explicit selections. The web-only `run` network defaults
  to web when `--platforms` is omitted.
- **`--network run`** ships RUN's own ads inside RUN games. It generates
  `square`, `vertical` and `landscape` images, bids automatically (there is no
  bid to set), ignores age targeting and a custom landing URL, and `stats` adds a
  per-placement table.
- **Creative dimensions** (WxH, counts, byte caps) are identical across
  platforms — see the summary `prepare` prints, or `rundot marketing tips`.
- **`--goal install|play|revenue|value`** (Meta and Google) sets the campaign
  type, the web destination, and the Google bidding for each leg. A refused
  combination fails `prepare` with the reason. `--campaign-type`
  (`traffic-install`, `player-activated`, `engaged-play`, `tutorial-complete`,
  `signup`, `purchase`, `value`) sets the type directly and wins over `--goal`.
  `purchase`/`value` only work once the network is receiving live purchase
  events; otherwise delivery stalls. `value` is for RUN first-party games only:
  `submit` refuses it for a creator's game. Run `rundot marketing prepare
  --help` for the full goal table.

For Google web Demand Gen campaigns, **`--google-bidding maximize-conversions`
(default) | `maximize-clicks`** selects the bidding mode. Maximize conversions
bids on the `PlayerActivated (web)` conversion action and needs `--destination
canonical`; maximize clicks needs no conversion action and is the only bidding
for `--destination mini`. The selected mode is persisted in `campaign.json`.

**Bid controls** are optional and never set by default. Set one only after the
campaign has steady conversions; with a small budget a bid control can stop
delivery. `--cost-cap <usd>` (Meta install and conversion goals, not `value`),
`--min-roas <ratio>` (Meta `value` only), `--target-cpa <usd>` (Google web with
`maximize-conversions`, and required for Google Android `purchase`), and
`--target-cpi <usd>` (Unity, and Google app legs of campaign type
`traffic-install`). On `--override`, an omitted flag keeps the stored value and
`off` clears it. A control that does not fit the campaign fails `prepare` and
names the flag. Google treats a target as a goal, not a ceiling.

For Unity, use `--network unity` with exactly one explicit mobile platform
(`--platforms ios` or `--platforms android`), an optional `--target-cpi <usd>`
($0.01–$100; without it the server default applies), one square image, and one MP4. `marketing generate` creates the MP4 after the
prepared video brief is filled. Submit creates a paused install campaign that
waits for creative approval before it can be launched. Use `status` to check
readiness.

## RUN.tv campaigns and deep link routing

RUN.tv campaigns are authored as standard app campaigns:
`rundot marketing prepare --name <name> --game-id 5u4uBHrkmLc8bG0OOaS9`

To route new installs or web clicks to a specific story or episode, pass standard `--share-params`:
`rundot marketing prepare --name <name> --game-id 5u4uBHrkmLc8bG0OOaS9 --share-params storyId=<slug>&videoId=<id>`

- **Deep link route priority:** The client routes deep links by checking `channel` > `feed` > `creator` > `leaderboard` > standard app launch. Standard app launch opens the app runtime with the share parameters forwarded as query parameters.
- **No series route handler:** Deep links route directly through the app runtime rather than a dedicated `/series` route handler.
- **Legacy campaign migration:** Campaigns prepared with legacy `--target ugc` are rejected by `generate`, `preview`, and `submit`. Use `rundot marketing prepare --name <name> --override` to upgrade them to standard app targeting.

## Internal 1P: App Store Custom Listings (CSL & CPP)

Only internal 1P staff configure these destinations. They manage `game.run.app`
store assets in Google Play Console and App Store Connect.

### New campaigns

Create a new Android campaign with a Custom Store Listing slug:

    rundot marketing prepare --name ascii-android --platforms android --csl asciiworld

iOS campaigns require the beta flag. Create a campaign with a Custom Product Page UUID:

    RUNDOT_BETA_FEATURES=1 rundot marketing prepare --name ascii-ios --platforms ios --cpp 11111111-2222-3333-4444-555555555555

### Patching unsubmitted manifests

Update destination options on an unsubmitted campaign with `--override`:

    rundot marketing prepare --name ascii-android --override --csl asciiworld
    RUNDOT_BETA_FEATURES=1 rundot marketing prepare --name ascii-ios --override --cpp-id 11111111-2222-3333-4444-555555555555

`--override` retains omitted destination fields.

### Options and values

- **Android CSL:** Use `--csl <slug>` or `--store-listing <slug>`. Provide only the slug, not a full URL. The slug must be the listing's exact Play Console URL key (the `<key>` in `&listing=<key>`). Meta ads receive it as the creative's `app_product_page_id` on the plain store URL. A Meta campaign with a CSL ships as placement ads. Meta chooses the placements of the Android and iOS legs; a web leg stays on Facebook and Instagram. Pass `--placements facebook,instagram` to keep Audience Network out. Every selected image ships.
- **iOS CPP:** Use `--cpp <uuid>`, `--cpp-id <uuid>`, or `--custom-product-page-id <uuid>`. Provide only the UUID, not `?ppid=`. Meta ads receive it as the creative's `app_product_page_id`; the server also appends `?ppid=<uuid>`.
- **Direct store URL:** Use `--store-url-override <url>` to route directly to a store link. A platform-specific CSL or CPP takes priority over direct store URLs. Direct store URLs apply only to their matching store platform.
- **Do not use `--store` for routing:** `--store` selects creative asset dimensions (e.g. app store screenshots), not ad routing destinations.
- **Only Meta and Reddit serve a store destination:** Meta sends the value as the creative's `app_product_page_id`; Reddit puts the store URL in the ad's click URL. The CLI rejects `--csl` and `--cpp` on `google`, `unity` and `run`, where the ad never uses the store URL. For Google, create the listing in Play Console with target users "By Google Ads campaign", link the Play account to Google Ads, then select it under Ad group -> Ad Assets -> Advanced options; it serves on the Display Network only, for App campaigns for installs promoting an Android app. Unity ads open an AppsFlyer OneLink, and RUN campaigns are web-only.

### Direct manifest editing

You can also edit destinations directly in `campaign.json`:

- `storeListing`: Android CSL slug.
- `customProductPageId`: iOS CPP UUID.
- `storeUrlOverride`: Direct store URL.

### Submitted campaigns

Local manifest edits do not update submitted campaigns. To change a live campaign,
stop it with `rundot marketing cancel --name <name>`. Then submit the revision
under a new campaign name.

## Submit is irreversible

Campaigns are **never edited in place**. To revise a submitted campaign: stop it
with `rundot marketing cancel --name <name>`, then submit the revision under a
**new** `--name` (names are single-use, even after cancel). Iterating on *assets*
is free up until `submit` — use `--regen` and `preview` as much as you want first.

## Related

Deciding *when* to run a campaign and reading its performance is
`rundot-marketing-ua-analysis`. Creative direction and best practices are
`rundot-marketing-assets`. Free organic promotion (`rundot socials`) is
`rundot-marketing-social`.

CSV includes `retention_queries` when a canonical batch exists. This field contains the full JSON batch array. It preserves each definition, count, state, and source receipt. CSV includes `retention_read_error` when a saved canonical result fails validation. This field keeps the error code and receipt.
