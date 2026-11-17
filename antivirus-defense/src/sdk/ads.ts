/**
 * This game's rewarded-ads instance: systems/ads.ts (the reusable core —
 * daily cap, subscriber instant-grant, RUN Bits fallback on no-ads
 * platforms) wired to this game's save and analytics.
 *
 * Lazy singleton: created on first use, which is always after boot — so the
 * debugFakeAds decision (fake ads in plain-browser dev, real ads in the RUN
 * host) sees the settled SDK state.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { createAds, type AdsSystem, type FallbackSpendRequest, type FallbackSpendResult } from '../systems/ads.ts';
import { getSave, flushSave, canSave } from '../state/save.ts';
import { sdkReady } from './runSdk.ts';
import { CONFIG } from '../game/config.ts';

let _ads: AdsSystem | null = null;

/**
 * The no-ads-platform Bits charge. The server keeps the Bits, but only the
 * save keeps the bonus. So do not sell when this session cannot save (the
 * first read failed): the player would pay and lose the bonus at the end of
 * the session.
 */
export async function spendBits({ productId, costRB, description }: FallbackSpendRequest): Promise<FallbackSpendResult> {
    if (!canSave()) return { status: 'failed', error: 'save_unavailable' };
    try {
        const result = await RundotGameAPI.iap.spendCurrency(productId, costRB, { description });
        if (result && result.success) return { status: 'purchased' };
        const err = (result && result.error) || 'spend_failed';
        if (err === 'USER_CANCELLED') return { status: 'cancelled' };
        return { status: 'failed', error: String(err).slice(0, 200) };
    } catch (e: unknown) {
        return { status: 'failed', error: String(e instanceof Error ? e.message : e).slice(0, 200) };
    }
}

export function adsSystem(): AdsSystem {
    if (_ads) return _ads;
    _ads = createAds({
        getState: () => getSave().ads,
        maxPerDay: CONFIG.ads.maxPerDay,
        persist: () => flushSave(),
        fallbackSpend: spendBits,
        // Plain-browser dev has no host to serve ads: fake the watch so the
        // reward flow stays testable. Inside the RUN host this is always
        // false (sdkReady() is true there).
        debugFakeAds: !sdkReady(),
        analytics: {
            onRewardGranted: ({ trigger, method }) => {
                if (!sdkReady()) return;
                try {
                    RundotGameAPI.analytics.recordCustomEvent('ad_reward_granted', { trigger, method })
                        .catch(() => {});
                } catch { /* non-fatal */ }
            },
            onRewardFailed: ({ trigger, reason }) => {
                if (!sdkReady()) return;
                try {
                    RundotGameAPI.analytics.recordCustomEvent('ad_reward_failed', { trigger, reason })
                        .catch(() => {});
                } catch { /* non-fatal */ }
            },
        },
    });
    return _ads;
}
