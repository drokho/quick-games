/**
 * ============================== TUNING HUB ==============================
 * Every gameplay number lives in exactly four files, all data, no logic:
 *
 *   src/game/config.ts        <- YOU ARE HERE: board layout, economy
 *                                (incl. the sell refund), lives, sizes
 *   src/game/data/towers.ts   <- tower stats, costs, upgrade tracks,
 *                                default targeting (modes: data/targeting.ts)
 *   src/game/data/enemies.ts  <- bug hp/speed/bounty
 *   src/game/data/waves.ts    <- what attacks, wave by wave
 *
 * Numbers are in design units (720-wide stage, see stage.ts) and seconds.
 * All four files feed the pure simulation engine (src/game/sim/engine.ts),
 * which also powers `npm run balance` — run it after ANY tuning change to
 * verify the game is still winnable but not trivial, without playtesting.
 * ========================================================================
 */
export const CONFIG = {
    colors: {
        // the motherboard
        grass: 0x0b1a2e,       // board base (the tiling ground)
        grassSpeck: 0x163a5c,  // circuit traces
        via: 0x2a5a86,
        pathDirt: 0x10233d,    // the data bus the hackers travel
        pathEdge: 0x2ee6d6,    // its neon edge
        pad: 0x3a4a63,         // chip socket
        padDark: 0x222d40,
        gold: 0xf5c542,
        goldDark: 0xc99a1e,
        goldShine: 0xffe58a,
        eyeWhite: 0xffffff,
        eyePupil: 0x101826,
        // towers
        firewall: 0xff6b3d,
        firewallDark: 0xc4421d,
        throttle: 0x9d7bff,
        throttleDark: 0x6a4ad0,
        purge: 0x3ddc84,
        purgeDark: 0x1f9a56,
        scanner: 0x3dd6ff,
        scannerDark: 0x1a8ab0,
        quarantine: 0xffcf3d,
        quarantineDark: 0xc9961a,
        metal: 0xc9d4e3,
        // AI hackers
        bot: 0xd94adf,
        botDark: 0x8a2a8f,
        phisher: 0x2ec4b6,
        phisherDark: 0x1a7f76,
        ransom: 0x8a2a3a,
        ransomDark: 0x5a1626,
        deepfake: 0x7b3ff2,
        deepfakeDark: 0x4a1fa8,
        overlord: 0x22142e,
        evil: 0xff3d5a,
        // projectiles + fx
        arrow: 0xffb05a,
        frost: 0xc9b3ff,
        boulder: 0x3ddc84,
        lightning: 0x7df9ff,
        poison: 0x7ed957,
        ice: 0xffd23d,
        hpBack: 0x101826,
        hpFill: 0x3ddc84,
        range: 0xffffff,
        shadow: 0x000000,
    },

    /** On-screen display sizes in design units (textures draw at 2x these). */
    sizes: {
        tower: 64,
        enemy: { bot: 42, phisher: 44, ransom: 52, deepfake: 46, overlord: 70 },
        pad: { w: 96, h: 52 },
        projectile: 16,
        pathWidth: 72,
    },

    /**
     * The designed board height in design units. The board is drawn for a
     * 9:16 screen (1280 units); on taller screens the whole board is
     * vertically centered in the extra space (see towerScene.ts), so the
     * PATH NEVER STRETCHES: path length, and therefore balance, is
     * identical on every device and in `npm run balance`.
     */
    boardHeight: 1280,

    /**
     * The bugs' road, as polyline waypoints. Enemies climb out of a burrow
     * at the first point and escape into one at the last; both ends get a
     * burrow decal so entering/leaving reads as intentional at any offset.
     */
    path: [
        { x: 170, y: 90 },
        { x: 170, y: 330 },
        { x: 610, y: 330 },
        { x: 610, y: 640 },
        { x: 110, y: 640 },
        { x: 110, y: 950 },
        { x: 610, y: 950 },
        { x: 610, y: 1300 },
    ],

    /**
     * Build spots. The center pads reach two path legs; corners reach one.
     * A pad with a `bonus` is a GOLD stone: any tower built there gets the
     * stat multiplier. Bonuses sit on the weaker-coverage pads on purpose,
     * so "great spot" vs "great bonus" is a real decision.
     */
    pads: [
        { x: 360, y: 215, bonus: { stat: 'damage', mult: 1.5 } },
        // x250 on purpose: at x200 this pad also covers the first corner
        // (the sim showed that extra coverage is worth ~3 lives)
        { x: 250, y: 485, bonus: null },
        { x: 360, y: 485, bonus: null },
        { x: 520, y: 485, bonus: null },
        { x: 200, y: 795, bonus: null },
        { x: 520, y: 795, bonus: { stat: 'range', mult: 1.5 } },
        { x: 200, y: 1090, bonus: { stat: 'fireRate', mult: 1.5 } },
        { x: 450, y: 1090, bonus: null },
    ],

    /** Tap tolerance for selecting a pad, from its center. */
    padTapRadius: 58,

    economy: {
        startCoins: 140,   // two cheap towers, or one mid + savings
        startLives: 10,
        waveBonus: 15,     // flat build-phase income per cleared wave
        /**
         * Fraction of a tower's TOTAL spend (purchase plus upgrades bought)
         * refunded on sell: at 0.75, a tower that cost 200 in total sells
         * for 150. Refunds round down. 1 would make repositioning free;
         * low values make placement a commitment.
         */
        sellRefund: 0.75,
    },

    /**
     * Meta progression: gems earned at the end of every run buy PERSISTENT
     * per-tower upgrades from the main menu (damage, attack speed, range;
     * ten levels each). These multiply on top of in-run upgrades.
     *
     * NOTE: `npm run balance` simulates with ZERO meta levels on purpose —
     * it verifies the base game a brand-new player faces.
     */
    meta: {
        /** Gems for clearing wave N = N * this (a full 10-wave run pays 55). */
        gemsPerWave: 1,
        maxLevel: 10,
        /** Buying INTO level n (1-based) costs costBase + costStep * (n - 1). */
        costBase: 4,
        costStep: 2,
        /** Effect per level, as a fraction added to the base stat. */
        damagePerLevel: 0.05,  // +50% damage at level 10
        speedPerLevel: 0.04,   // +40% attack speed at level 10
        rangePerLevel: 0.02,   // +20% range at level 10
    },

    /** Rewarded ads (systems/ads.ts, copied in from run-game-helpers). */
    ads: {
        /** Game-wide daily rewarded-watch budget shared by every placement. */
        maxPerDay: 15,
        /** Game-over placement: bonus gems = ceil(gemsEarned * this). */
        gemBonusFactor: 0.5,
    },
} as const;
