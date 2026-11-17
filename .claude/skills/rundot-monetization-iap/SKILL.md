---
name: rundot-monetization-iap
description: >-
  Add in-app purchases to a RUN.game title — real-money direct purchases, RUN
  Bits spends on a shop catalog, bundles, consumables, cosmetics, and
  subscriptions — through the RUN
  SDK iap/shop APIs, with an economy that's fair and converts. Use when adding
  or tuning a shop, IAP, bundles, currency, starter packs, subscriptions, or
  when the user mentions purchases, monetization, spending, whales, or "how do I
  sell things in my game."
---

# RUN.game In-App Purchases

Let players buy digital goods with **real money (direct purchase)** or **RUN Bits** (the platform hard currency): consumables, cosmetics, convenience, progression, bundles, and subscriptions. The SDK handles the billing flow — your job is designing *what* to sell and *why a player wants it*.

**Why this matters beyond the money:** IAP revenue funds user acquisition and growth. When a player's lifetime value exceeds what they cost to acquire, you reinvest the surplus into more installs — the growth flywheel (see `rundot-marketing-ua-analysis`). IAP is where most of a game's revenue comes from a small share of players, so it's the high-ceiling half of monetization — but only if the economy is fair enough that players *want* to spend, not feel forced to.

**When to run this:** after the core loop is fun and retention beats the typical RUN game on its platforms (`rundot-retention`, `rundot-game-coach`). Players only spend on a game they're invested in — a purchase prompt in a game they'd otherwise quit converts no one. Instrument analytics first (`rundot-analytics`) so every SKU is measurable.

## Coaching approach — ask, teach, reveal blind spots

Creators often either sell nothing anyone wants, or reach straight for pay-to-win that poisons the game. Your job is to find what players would *gladly* pay for and price it fairly, and to make the whale/first-purchase reality concrete. Ask, teach, and name the blind spots.

Ask as you go (a couple at a time):

- What does a player most *want* in your game that money could reasonably give them — time, cosmetics, convenience, progression?
- Would a purchase ever make the game *less* fun for that player or their opponents? (If yes, rethink it.)
- Why would someone buy for the *first* time — what's the small, obvious, high-value first offer?
- Which top games in your genre sell what? Are they cosmetic-led, progression-led, or convenience-led?
- Do you know that most revenue comes from a few players — and does your catalog have anything worth a big spend for them?

Teach the why, and name the blind spots first-timers miss: **the first purchase is the hardest** — a cheap, generous starter pack converts far more players than a wall of expensive bundles. **A small fraction of players ("whales") drive most revenue**, so you need high-value offers for them *and* an easy on-ramp for everyone else. And the trap that kills games: **pay-to-win in a competitive game** — selling power erodes the fun for non-payers, who are the audience payers want to beat. Selling *fairly* (cosmetics, convenience, generous value) usually out-earns selling *aggressively* because it protects retention and the flywheel.

## Study comparable titles' economies

Before designing a catalog, study how 2–3 successful games *in your genre* monetize — they've tuned their economy against millions of players. Note: what they sell (cosmetics vs. progression vs. convenience), their starter/first-time offer, their price points, how they run sales and limited-time offers, and whether they use a subscription/battle-pass. Match on genre and audience; a cosmetic-led model that works for one loop may earn nothing in another. Summarize the pattern back to the creator, then adapt — don't clone an economy built for a different loop.

## What to sell (a menu, pick what fits the loop)

| Category | Examples | Notes |
|---|---|---|
| **Consumables** | Extra lives/continues, boosts, currency packs, timer skips | Repeatable revenue; the workhorse of most economies |
| **Cosmetics** | Skins, themes, trails, emotes | Zero balance impact — safe in competitive games; identity/self-expression sells |
| **Convenience** | Auto-collect, extra slots, remove friction | Respects the player's time; low pay-to-win risk |
| **Progression** | Chapter/level-pack unlocks, characters | Fine in solo games; risky in competitive |
| **Bundles / starter packs** | Cheap high-value first offer, themed bundles | Starter pack converts first-time buyers; bundles raise ARPU |
| **Subscriptions** | Recurring perks, ad-removal, monthly currency | Recurring revenue; RUN offers CORE/PLUS/PRIME/ULTIMATE tiers |

## The first purchase: sell it for real money

**A RUN Bits price is a wall for a first-time buyer.** A player with no Bits who taps a 100-Bit item is sent to buy a whole Bits pack first — a bigger, vaguer decision than the item they wanted — and almost none complete it. In games reviewed across RUN, nearly every first purchase attempt ended there, including on well-chosen items.

So make the first purchase a **direct purchase**: the item is priced in real money and the player buys exactly that, in one checkout.

- **Price it at $0.99–$4.99** (`tier_099`–`tier_499`) and make it obviously generous: a starter bundle, a permanent unlock, a first-purchase double.
- **Sell something permanent.** Permanent boosts (a currency multiplier, faster game speed, an extra slot) and cosmetics are the easiest first buys; a small consumable isn't worth opening a wallet for.
- **Show it after the loop has clicked** — after the first upgrade or the first boss, not before the player knows what the currency is worth. A 24-hour timer on a one-time starter offer is fine; fake scarcity isn't.
- **Show it only to non-payers** (`hasUserMadePurchase()`), and give the first purchase a visible bonus.
- After that first purchase, RUN Bits pricing works well for repeat spends; always show the item, price and balance before sending a short player to `openStore()`.

## Three ways to charge

**1. Direct purchase (real money)** — a normal shop item whose price pins a platform price tier. No store dashboards, no SKUs: RUN's price ladder is pre-provisioned on web, iOS, Android and Steam, and sandboxed in Playground.

```json
{
  "itemId": "starter_pack",
  "price": { "type": "direct_purchase", "value": "tier_199" },
  "entitlements": [{ "entitlementId": "starter_pack", "quantity": 1, "consumable": false }]
}
```

Upload it with the rest of `rundot/shop.config.json` (`rundot game upload-server-config` or `rundot deploy`), point a tag at it, and buy it with the same `shop.purchase(itemId, idempotencyKey)` call as below. `value` is a tier id (`tier_099` … `tier_9999`), never a dollar amount; `iap.listDirectPurchaseSkus()` lists your active real-money items.

**2. Simple spend (`RundotGameAPI.iap`)** — spend RUN Bits directly on an item id. Good for one-off unlocks and continues.

```typescript
const result = await RundotGameAPI.iap.spendCurrency('continue_run', 5, {
  description: 'Continue your run',   // shown in the host confirmation dialog
  screenName: 'game_over',
});
if (result.success) {
  resumeGame();
} else if (result.error === 'USER_CANCELLED') {
  // player backed out of the dialog; nothing was charged
}
```

- `spendCurrency` auto-opens the RUN Bits purchase flow if the player is short. It does **not** return a balance — call `getHardCurrencyBalance()` after if you need it.
- Only `'USER_CANCELLED'` is a stable error value; don't branch on any other error string.

**3. Shop catalog with RUN Bits (`RundotGameAPI.shop`)** — define a catalog in `rundot/shop.config.json` (items, collections, sales), upload it, and purchase by id with an idempotency key. Use this for a real storefront with sales, bundles, and scheduled offers.

```typescript
const idempotencyKey = crypto.randomUUID();          // prevents double charges on retry
const result = await RundotGameAPI.shop.purchase('speed_boost', idempotencyKey);
if (result.success) grantEntitlements(result.order);
```

- **`result.success` is the grant gate.** If the player is short on currency the host opens the top-up paywall; dismissing it resolves `{ success: false, cancelled: true, order: null }`. That is a player choice, not a failure — handle it quietly (no error toast), the same way `USER_CANCELLED` is handled above. TypeScript won't let you read `result.order` until you've checked `success`.
- The catalog is server config — each upload is an immutable version pinned by `configId`. If the catalog changed since the client fetched it, `purchase` throws a stale-catalog error: re-fetch `getCatalog()` and retry (the helper does this). Rejections are reserved for real failures.
- Sales are separate objects targeting items/collections by id, so you can schedule discounts without touching item definitions.

**Subscriptions (`RundotGameAPI.iap`)** — `getSubscriptions()`, `purchaseSubscription(tier, interval)`, and gate content with `isUserSubscribed(tier)` (respects tier hierarchy). Tiers low→high: CORE, PLUS, PRIME, ULTIMATE; intervals `'weekly' | 'monthly' | 'annual'`.

## Design principles

- **Sell value, not unfair power.** Especially in competitive games, keep purchases cosmetic/convenience so non-payers still enjoy the game.
- **Make the first purchase trivial to say yes to.** A cheap, obviously-generous starter pack (once per player), sold as a direct purchase, is the single highest-leverage offer. Use `hasUserMadePurchase()` to show it only to non-payers.
- **Don't underprice.** Most creators price too low. Match a successful comparable game rather than discounting, and fill the middle of the range ($10–$20): it's where a healthy economy earns most, rather than one rare big pack.
- **Give buyers a reason to buy again** — limited-time offers, packs that grow with progress, or something that renews.
- **Serve whales too.** Have at least one high-value bundle worth a big spend — most revenue comes from a few players.
- **Always show the balance and confirm the purchase.** Pass a clear `description` so the host dialog tells players exactly what they're buying.
- **Anchor and discount honestly.** Show original vs. sale price; use limited-time offers to create urgency — but don't fake scarcity.
- **Never nickel-and-dime.** An economy that feels stingy or manipulative kills retention and the flywheel it feeds.

## Instrument every SKU

The platform tracks server-side `shop_purchase` / `shop_purchase_failed` / `shop_refund` automatically. Use the standard client-side purchase funnel from `rundot-analytics`:

- `shop_opened` → `item_selected` → `checkout_started` → `purchase_complete`, with funnel name `purchase` and order `2`. Record `purchase_failed` with `item_id`, a readable `reason` (`insufficient`, `cancelled`, `error`) and the player's Bits balance — without the reason, every failed first purchase looks the same.
- Call `trackShopOpened(source)` when the storefront opens and `trackItemViewed(item)` when an item detail view opens; `buyItem` records checkout start and its outcome.
- Track first-purchase conversion, ARPDAU, ARPPU, and payer %. Watch that monetization changes don't dent retention.

## Drop-in helper

`purchase.ts` wraps shop purchases with an idempotency key, stale-catalog re-fetch/retry, and analytics funnel events. Copy it in and adapt item ids.

## Checklist

```
- [ ] Retention beats the typical RUN game on its platforms before monetizing hard
- [ ] The first purchase is a direct purchase ($0.99–$4.99), permanent or generous, shown after the loop clicks
- [ ] Catalog fits the loop (consumables/cosmetics/convenience/progression as appropriate)
- [ ] No pay-to-win in competitive modes — power sold fairly or not at all
- [ ] A cheap, generous first-time starter pack exists (shown to non-payers)
- [ ] At least one high-value bundle for big spenders
- [ ] Every spend passes a clear `description`; balance shown in the shop UI
- [ ] Shop purchases use an idempotencyKey and handle stale-catalog retry
- [ ] Store funnel events fire; ARPDAU/ARPPU/payer% + retention tracked
```

## Anti-patterns

- ❌ Pay-to-win in a competitive game — sells short-term, poisons the fun payers came for.
- ❌ Only expensive bundles, no cheap first-purchase on-ramp — most players never convert.
- ❌ A first offer priced in RUN Bits — an empty wallet turns it into "buy a whole Bits pack first," and almost nobody does.
- ❌ Showing the starter offer before the player knows what the currency is worth.
- ❌ No high-value offer — leaving whale revenue on the table.
- ❌ Spending without a `description` — the host dialog can't tell the player what they're buying.
- ❌ Ignoring `USER_CANCELLED` or branching on unstable error strings.
- ❌ Skipping the idempotencyKey / stale-catalog retry — double charges or failed buys.
- ❌ A stingy, manipulative economy that trades retention for a short revenue bump.

## Resources

- `rundot-marketing-ua-analysis` — the growth flywheel IAP revenue funds; LTV > CPI, benchmark D7–D14 ROAS for IAP.
- `rundot-retention` — players only spend on games they return to.
- `rundot-analytics` — SKU-level funnels, ARPPU, payer conversion.
- `rundot-monetization-ads` — the other half; ads + IAP (hybrid) is common in casual.
- SDK: direct purchase (`direct_purchase` price in `shop.config.json`, `iap.listDirectPurchaseSkus`), `RundotGameAPI.iap` (`spendCurrency`, `getHardCurrencyBalance`, `openStore`, `hasUserMadePurchase`, subscriptions), `RundotGameAPI.shop` (`getCatalog`, `purchase`, `purchaseCollectionItem`, `requestRefund`), config in `rundot/shop.config.json`.
