/**
 * The defenders. Each tower is an antivirus tool; stats are per LEVEL 1, and each
 * in-run upgrade multiplies damage and fire rate. All of this is consumed
 * by the pure engine, so `npm run balance` sees every edit here.
 *
 * Attack kinds:
 *   projectile — homing shot; `splash` > 0 damages everything near the hit,
 *                `arc` is a cosmetic lob (the sim ignores it).
 *   beam       — instant glowing line; `chains` extra targets get hit, each
 *                hop within `chainRange` of the last, at `chainFalloff`^hop
 *                damage.
 *
 * `status` (optional) is inflicted on every damaged bug (see data/status.ts).
 *
 * `metaUnique` is the tower's signature PERSISTENT upgrade track (bought
 * with gems on the main menu, alongside damage/speed/range):
 *   crit            — +perLevel crit chance; crits do 2x damage
 *   chains          — +perLevel extra beam hops
 *   splash          — +perLevel splash radius (design units)
 *   status-duration — +perLevel seconds on the tower's status effect
 */
import type { StatusInflict } from './status.ts';
import type { TargetingMode } from './targeting.ts';

export interface UpgradeStep {
    cost: number;
    damageMult: number;
    fireRateMult: number;
}

export type TowerAttack =
    | { kind: 'projectile'; projSpeed: number; splash: number; arc?: boolean }
    | { kind: 'beam'; chains: number; chainRange: number; chainFalloff: number };

export type MetaUniqueDef =
    | { kind: 'crit'; perLevel: number; maxLevel: number; name: string; desc: string }
    | { kind: 'chains'; perLevel: number; maxLevel: number; name: string; desc: string }
    | { kind: 'splash'; perLevel: number; maxLevel: number; name: string; desc: string }
    | { kind: 'status-duration'; perLevel: number; maxLevel: number; name: string; desc: string }
    | { kind: 'status-damage'; perLevel: number; maxLevel: number; name: string; desc: string }
    | { kind: 'knockback'; perLevel: number; maxLevel: number; name: string; desc: string };

export interface TowerDef {
    id: string;
    name: string;
    cost: number;
    /**
     * Attack radius in design units, measured pad center → enemy. With the
     * example board, the mid pads sit 155 units from the path rows: keep
     * every range >= 160 or that tower cannot fire from those pads.
     */
    range: number;
    /** Shots per second. */
    fireRate: number;
    damage: number;
    attack: TowerAttack;
    /** Inflicted on every bug this tower damages. */
    status?: StatusInflict;
    /** Default targeting mode (see data/targeting.ts); player-changeable per placed tower. */
    targeting: TargetingMode;
    /** Sequential in-run upgrades (level 2, level 3...). */
    upgrades: UpgradeStep[];
    /** The tower's signature persistent upgrade (gems shop). */
    metaUnique: MetaUniqueDef;
}

export const TOWERS: TowerDef[] = [
    {
        // rapid packet blaster, the cheap all-rounder
        id: 'firewall',
        name: 'Firewall',
        cost: 60,
        range: 170,
        fireRate: 1.6,
        damage: 12,
        attack: { kind: 'projectile', projSpeed: 700, splash: 0 },
        targeting: 'first',
        upgrades: [
            { cost: 50, damageMult: 1.4, fireRateMult: 1.1 },
            { cost: 90, damageMult: 1.4, fireRateMult: 1.1 },
        ],
        metaUnique: {
            kind: 'crit',
            perLevel: 0.025,
            maxLevel: 10,
            name: 'Deep Scan',
            desc: 'Critical hit chance (crits do 2x damage)',
        },
    },
    {
        // squeezes the bandwidth: hackers crawl through the slow zone
        id: 'throttle',
        name: 'Throttler',
        cost: 70,
        range: 170,
        fireRate: 0.9,
        damage: 10,
        attack: { kind: 'projectile', projSpeed: 550, splash: 0 },
        status: { type: 'slow', factor: 0.55, duration: 1.6 },
        // 'first' on purpose: switching to 'strongest' (slow the tanks) is
        // the smart play for the player to discover.
        targeting: 'first',
        upgrades: [
            { cost: 60, damageMult: 1.5, fireRateMult: 1.1 },
            { cost: 100, damageMult: 1.5, fireRateMult: 1.1 },
        ],
        metaUnique: {
            kind: 'status-duration',
            perLevel: 0.5,
            maxLevel: 10,
            name: 'Lag Spike',
            desc: 'Slow lasts longer',
        },
    },
    {
        // lobs a data-wipe bomb that clears a whole cluster
        id: 'purge',
        name: 'Purge Bomb',
        cost: 110,
        range: 160,
        fireRate: 0.55,
        damage: 36,
        attack: { kind: 'projectile', projSpeed: 420, splash: 90, arc: true },
        targeting: 'first',
        upgrades: [
            { cost: 90, damageMult: 1.6, fireRateMult: 1.1 },
            { cost: 150, damageMult: 1.6, fireRateMult: 1.1 },
        ],
        metaUnique: {
            kind: 'splash',
            perLevel: 8,
            maxLevel: 10,
            name: 'Wider Wipe',
            desc: 'Blast radius',
        },
    },
    {
        // a scan beam that jumps from hacker to hacker
        id: 'scanner',
        name: 'Scanner',
        cost: 100,
        range: 180,
        fireRate: 1.0,
        damage: 11,
        attack: { kind: 'beam', chains: 2, chainRange: 120, chainFalloff: 0.7 },
        targeting: 'first',
        upgrades: [
            { cost: 60, damageMult: 1.45, fireRateMult: 1.1 },
            { cost: 110, damageMult: 1.45, fireRateMult: 1.1 },
        ],
        metaUnique: {
            kind: 'chains',
            perLevel: 1,
            maxLevel: 3,
            name: 'Network Sweep',
            desc: 'Scan beam jumps to more hackers',
        },
    },
    {
        // locks a hacker in a quarantine box so it cannot move
        id: 'quarantine',
        name: 'Quarantine',
        cost: 120,
        range: 165,
        fireRate: 0.5,
        damage: 8,
        attack: { kind: 'projectile', projSpeed: 600, splash: 0 },
        status: { type: 'frozen', duration: 0.9 },
        targeting: 'strongest',
        upgrades: [
            { cost: 80, damageMult: 1.5, fireRateMult: 1.15 },
            { cost: 130, damageMult: 1.5, fireRateMult: 1.15 },
        ],
        metaUnique: {
            kind: 'status-duration',
            perLevel: 0.12,
            maxLevel: 10,
            name: 'Lockdown',
            desc: 'Quarantine lasts longer',
        },
    },
];

export function towerDef(id: string): TowerDef {
    const def = TOWERS.find((t) => t.id === id);
    if (!def) throw new Error(`unknown tower: ${id}`);
    return def;
}
