/**
 * Every texture the game uses comes from here, resolved in two steps:
 *
 *   1. REAL ART — if the alias is listed in src/assets/manifest.ts (and so
 *      was loaded at boot), that image is used.
 *   2. PROCEDURAL FALLBACK — otherwise the placeholder is drawn at runtime,
 *      so the game always runs, even with zero bundled images.
 *
 * To swap in your art: drop a PNG in public/images/, add it to the manifest
 * under the alias named on the make*() function below, done — no code
 * changes anywhere else.
 *
 * Aliases (display sizes live in CONFIG.sizes; author real art at 2x them):
 *   'tower-firewall' / 'tower-throttle' / 'tower-purge' / 'tower-scanner' / 'tower-quarantine'
 *                                              the antivirus towers, front-facing
 *   'enemy-bot' / 'enemy-phisher' / 'enemy-ransom' / 'enemy-deepfake' / 'enemy-overlord'
 *                                              the AI hackers
 *   'proj-firewall' / 'proj-throttle' / 'proj-purge' / 'proj-quarantine'
 *                                              projectiles (the scanner's beam draws as a line)
 *   'fx-ice'                                   translucent quarantine box over frozen hackers
 *   'pad'                                      chip socket build spot (flat 3/4 ellipse)
 *   'pad-gold'                                 bonus build spot (gold socket)
 *   'burrow'                                   network port the hackers enter/exit through
 *   'grass-tile'                               circuit board ground, must tile on BOTH axes
 *
 * Procedural textures are drawn at 2x their design-unit display size and
 * scaled down by the sprites that use them, so edges stay crisp at high DPR.
 */
import { Assets, Graphics, Texture, type Renderer } from 'pixi.js';
import { CONFIG } from './config.ts';

const C = CONFIG.colors;
const SS = 2;

const generated = new WeakSet<Texture>();

/** Manifest-listed art wins; the drawn placeholder is the fallback. */
function art(alias: string, fallback: () => Texture): Texture {
    if (Assets.cache.has(alias)) return Assets.get<Texture>(alias);
    return fallback();
}

function gen(renderer: Renderer, draw: (g: Graphics) => void): Texture {
    const g = new Graphics();
    draw(g);
    const tex = renderer.generateTexture({ target: g, resolution: 1 });
    g.destroy();
    generated.add(tex);
    return tex;
}

/**
 * Scene teardown MUST use this instead of texture.destroy(): generated
 * placeholders are per-scene and freed; manifest-loaded art is shared in
 * the Assets cache and must survive scene remounts.
 */
export function freeTexture(tex: Texture): void {
    if (generated.has(tex)) tex.destroy(true);
}

const T = CONFIG.sizes.tower * SS;

/** Two big friendly eyes, shared by every tower. */
function eyes(g: Graphics, w: number, h: number, y: number, r = 0.08, gap = 0.17) {
    g.circle(w * (0.5 - gap), h * y, w * r).fill(C.eyeWhite);
    g.circle(w * (0.5 + gap), h * y, w * r).fill(C.eyeWhite);
    g.circle(w * (0.5 - gap), h * (y + 0.012), w * r * 0.5).fill(C.eyePupil);
    g.circle(w * (0.5 + gap), h * (y + 0.012), w * r * 0.5).fill(C.eyePupil);
}

/** Firewall: a brick shield with a flame on top. */
export function makeFirewallTexture(renderer: Renderer): Texture {
    return art('tower-firewall', () => gen(renderer, (g) => {
        const w = T;
        const h = T;
        // flame
        g.poly([w * 0.5, h * 0.0, w * 0.66, h * 0.2, w * 0.6, h * 0.3, w * 0.4, h * 0.3, w * 0.34, h * 0.2]).fill(C.quarantine);
        // shield
        g.poly([w * 0.1, h * 0.2, w * 0.9, h * 0.2, w * 0.86, h * 0.66, w * 0.5, h * 0.98, w * 0.14, h * 0.66]).fill(C.firewallDark);
        g.poly([w * 0.16, h * 0.25, w * 0.84, h * 0.25, w * 0.8, h * 0.63, w * 0.5, h * 0.9, w * 0.2, h * 0.63]).fill(C.firewall);
        // bricks
        for (const [y, off] of [[0.56, 0], [0.7, 0.1]] as [number, number][]) {
            for (let x = 0.24 + off; x < 0.76; x += 0.2) g.rect(w * x, h * y, w * 0.16, h * 0.08).fill(C.firewallDark);
        }
        eyes(g, w, h, 0.4);
    }));
}

/** Throttler: an hourglass that slows everything down. */
export function makeThrottleTexture(renderer: Renderer): Texture {
    return art('tower-throttle', () => gen(renderer, (g) => {
        const w = T;
        const h = T;
        g.roundRect(w * 0.12, h * 0.04, w * 0.76, h * 0.1, w * 0.04).fill(C.throttleDark);
        g.roundRect(w * 0.12, h * 0.86, w * 0.76, h * 0.1, w * 0.04).fill(C.throttleDark);
        g.poly([w * 0.18, h * 0.14, w * 0.82, h * 0.14, w * 0.56, h * 0.5, w * 0.82, h * 0.86, w * 0.18, h * 0.86, w * 0.44, h * 0.5]).fill(C.throttle);
        // sand
        g.poly([w * 0.3, h * 0.86, w * 0.7, h * 0.86, w * 0.5, h * 0.68]).fill(C.quarantine);
        g.rect(w * 0.485, h * 0.5, w * 0.03, h * 0.2).fill(C.quarantine);
        eyes(g, w, h, 0.28, 0.07, 0.12);
    }));
}

/** Purge Bomb: a cleaning robot with a launcher on top. */
export function makePurgeTexture(renderer: Renderer): Texture {
    return art('tower-purge', () => gen(renderer, (g) => {
        const w = T;
        const h = T;
        g.roundRect(w * 0.36, h * 0.0, w * 0.28, h * 0.26, w * 0.06).fill(C.metal);
        g.circle(w * 0.5, h * 0.06, w * 0.08).fill(C.purgeDark);
        g.roundRect(w * 0.06, h * 0.2, w * 0.88, h * 0.76, w * 0.24).fill(C.purgeDark);
        g.roundRect(w * 0.1, h * 0.22, w * 0.8, h * 0.68, w * 0.22).fill(C.purge);
        // recycle stripes
        g.rect(w * 0.26, h * 0.72, w * 0.48, h * 0.06).fill(C.purgeDark);
        eyes(g, w, h, 0.48, 0.09, 0.18);
    }));
}

/** Scanner: a big lens on a stand, with a sweep line. */
export function makeScannerTexture(renderer: Renderer): Texture {
    return art('tower-scanner', () => gen(renderer, (g) => {
        const w = T;
        const h = T;
        g.rect(w * 0.44, h * 0.7, w * 0.12, h * 0.2).fill(C.metal);
        g.roundRect(w * 0.22, h * 0.86, w * 0.56, h * 0.12, w * 0.05).fill(C.scannerDark);
        g.circle(w * 0.5, h * 0.42, w * 0.4).fill(C.scannerDark);
        g.circle(w * 0.5, h * 0.42, w * 0.33).fill(C.scanner);
        g.circle(w * 0.5, h * 0.42, w * 0.2).fill(C.eyeWhite);
        g.circle(w * 0.5, h * 0.44, w * 0.11).fill(C.eyePupil);
        g.circle(w * 0.45, h * 0.38, w * 0.04).fill(C.eyeWhite);
        g.rect(w * 0.14, h * 0.41, w * 0.72, h * 0.025).fill({ color: C.lightning, alpha: 0.8 });
    }));
}

/** Quarantine: a padlock with a happy face. */
export function makeQuarantineTexture(renderer: Renderer): Texture {
    return art('tower-quarantine', () => gen(renderer, (g) => {
        const w = T;
        const h = T;
        g.roundRect(w * 0.24, h * 0.02, w * 0.52, h * 0.5, w * 0.26).stroke({ width: w * 0.1, color: C.metal });
        g.roundRect(w * 0.08, h * 0.36, w * 0.84, h * 0.6, w * 0.14).fill(C.quarantineDark);
        g.roundRect(w * 0.12, h * 0.38, w * 0.76, h * 0.54, w * 0.12).fill(C.quarantine);
        eyes(g, w, h, 0.56, 0.08, 0.16);
        // keyhole mouth
        g.circle(w * 0.5, h * 0.74, w * 0.05).fill(C.eyePupil);
        g.poly([w * 0.47, h * 0.75, w * 0.53, h * 0.75, w * 0.55, h * 0.86, w * 0.45, h * 0.86]).fill(C.eyePupil);
    }));
}

/** Angry red eyes, shared by the hackers. */
function evilEyes(g: Graphics, s: number, y: number, gap = 0.14, r = 0.065) {
    g.circle(s * (0.5 - gap), s * y, s * r).fill(C.evil);
    g.circle(s * (0.5 + gap), s * y, s * r).fill(C.evil);
    g.circle(s * (0.5 - gap), s * y, s * r * 0.4).fill(C.eyeWhite);
    g.circle(s * (0.5 + gap), s * y, s * r * 0.4).fill(C.eyeWhite);
    g.rect(s * (0.5 - gap - r), s * (y - r * 1.5), s * r * 2, s * 0.025).fill(C.eyePupil);
    g.rect(s * (0.5 + gap - r), s * (y - r * 1.5), s * r * 2, s * 0.025).fill(C.eyePupil);
}

/** Spam Bot: a little robot head with an antenna. */
export function makeBotTexture(renderer: Renderer): Texture {
    return art('enemy-bot', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.bot * SS;
        g.rect(s * 0.48, s * 0.02, s * 0.04, s * 0.2).fill(C.botDark);
        g.circle(s * 0.5, s * 0.06, s * 0.07).fill(C.evil);
        g.roundRect(s * 0.1, s * 0.2, s * 0.8, s * 0.74, s * 0.18).fill(C.botDark);
        g.roundRect(s * 0.14, s * 0.24, s * 0.72, s * 0.62, s * 0.15).fill(C.bot);
        evilEyes(g, s, 0.5);
        g.rect(s * 0.3, s * 0.7, s * 0.4, s * 0.06).fill(C.botDark);
    }));
}

/** Phisher: a sneaky fish dangling a hook. */
export function makePhisherTexture(renderer: Renderer): Texture {
    return art('enemy-phisher', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.phisher * SS;
        g.poly([s * 0.82, s * 0.55, s * 1.0, s * 0.3, s * 1.0, s * 0.8]).fill(C.phisherDark);
        g.ellipse(s * 0.46, s * 0.55, s * 0.4, s * 0.3).fill(C.phisher);
        g.poly([s * 0.4, s * 0.28, s * 0.6, s * 0.28, s * 0.5, s * 0.12]).fill(C.phisherDark);
        // the hook on a line
        g.moveTo(s * 0.3, s * 0.3).lineTo(s * 0.18, s * 0.04).stroke({ width: s * 0.025, color: C.metal });
        g.arc(s * 0.12, s * 0.1, s * 0.06, 0, Math.PI).stroke({ width: s * 0.035, color: C.metal });
        g.circle(s * 0.3, s * 0.48, s * 0.07).fill(C.evil);
        g.circle(s * 0.3, s * 0.48, s * 0.03).fill(C.eyeWhite);
        g.rect(s * 0.14, s * 0.66, s * 0.22, s * 0.04).fill(C.phisherDark);
    }));
}

/** Ransomware: a heavy locked chest. Slow and tough. */
export function makeRansomTexture(renderer: Renderer): Texture {
    return art('enemy-ransom', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.ransom * SS;
        g.roundRect(s * 0.06, s * 0.2, s * 0.88, s * 0.74, s * 0.12).fill(C.ransomDark);
        g.roundRect(s * 0.1, s * 0.24, s * 0.8, s * 0.3, s * 0.1).fill(C.ransom);
        g.roundRect(s * 0.1, s * 0.58, s * 0.8, s * 0.32, s * 0.06).fill(C.ransom);
        g.rect(s * 0.06, s * 0.52, s * 0.88, s * 0.06).fill(C.gold);
        g.roundRect(s * 0.4, s * 0.46, s * 0.2, s * 0.22, s * 0.04).fill(C.gold);
        g.circle(s * 0.5, s * 0.55, s * 0.035).fill(C.eyePupil);
        evilEyes(g, s, 0.38, 0.2, 0.06);
    }));
}

/** Deepfake: a mask with glitchy stripes. */
export function makeDeepfakeTexture(renderer: Renderer): Texture {
    return art('enemy-deepfake', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.deepfake * SS;
        g.ellipse(s * 0.5, s * 0.52, s * 0.42, s * 0.46).fill(C.deepfakeDark);
        g.ellipse(s * 0.5, s * 0.5, s * 0.38, s * 0.42).fill(C.deepfake);
        g.rect(s * 0.08, s * 0.3, s * 0.3, s * 0.05).fill({ color: 0x3df2ff, alpha: 0.8 });
        g.rect(s * 0.62, s * 0.66, s * 0.32, s * 0.05).fill({ color: 0xff4fd8, alpha: 0.8 });
        evilEyes(g, s, 0.44, 0.15, 0.07);
        g.arc(s * 0.5, s * 0.62, s * 0.14, 0.2, Math.PI - 0.2).stroke({ width: s * 0.04, color: C.eyeWhite });
    }));
}

/** Rogue AI: the boss, a dark core with one glaring eye. */
export function makeOverlordTexture(renderer: Renderer): Texture {
    return art('enemy-overlord', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.overlord * SS;
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            g.rect(s * 0.5 + Math.cos(a) * s * 0.38 - s * 0.05, s * 0.5 + Math.sin(a) * s * 0.38 - s * 0.05, s * 0.1, s * 0.1).fill(C.botDark);
        }
        g.circle(s * 0.5, s * 0.5, s * 0.4).fill(C.overlord);
        g.circle(s * 0.5, s * 0.5, s * 0.36).stroke({ width: s * 0.03, color: C.evil, alpha: 0.7 });
        g.circle(s * 0.5, s * 0.5, s * 0.2).fill(C.evil);
        g.circle(s * 0.5, s * 0.5, s * 0.1).fill(C.eyeWhite);
        g.circle(s * 0.5, s * 0.5, s * 0.05).fill(C.eyePupil);
        g.rect(s * 0.26, s * 0.24, s * 0.18, s * 0.04).fill(C.evil);
        g.rect(s * 0.56, s * 0.24, s * 0.18, s * 0.04).fill(C.evil);
    }));
}

export function makeProjFirewallTexture(renderer: Renderer): Texture {
    return art('proj-firewall', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.projectile * SS;
        g.circle(s / 2, s / 2, s * 0.48).fill(C.firewall);
        g.circle(s / 2, s / 2, s * 0.26).fill(C.quarantine);
    }));
}

export function makeProjThrottleTexture(renderer: Renderer): Texture {
    return art('proj-throttle', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.projectile * SS;
        g.circle(s / 2, s / 2, s * 0.4).stroke({ width: s * 0.16, color: C.frost });
        g.circle(s / 2, s / 2, s * 0.14).fill(C.eyeWhite);
    }));
}

export function makeProjPurgeTexture(renderer: Renderer): Texture {
    return art('proj-purge', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.projectile * SS;
        g.circle(s / 2, s / 2, s * 0.5).fill(C.purgeDark);
        g.circle(s / 2, s / 2, s * 0.36).fill(C.purge);
        g.circle(s * 0.38, s * 0.38, s * 0.12).fill({ color: 0xffffff, alpha: 0.5 });
    }));
}

export function makeProjQuarantineTexture(renderer: Renderer): Texture {
    return art('proj-quarantine', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.projectile * SS;
        g.roundRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8, s * 0.15).fill(C.quarantine);
        g.rect(s * 0.42, s * 0.2, s * 0.16, s * 0.6).fill(C.quarantineDark);
    }));
}

/** Quarantine box: drawn over frozen (quarantined) hackers. */
export function makeIceCubeTexture(renderer: Renderer): Texture {
    return art('fx-ice', () => gen(renderer, (g) => {
        const s = 64 * SS;
        g.roundRect(0, 0, s, s, s * 0.12).fill({ color: C.ice, alpha: 0.35 });
        g.roundRect(s * 0.05, s * 0.05, s * 0.9, s * 0.9, s * 0.1).stroke({ width: s * 0.07, color: C.ice, alpha: 0.9 });
        // hazard stripes along the top
        for (let i = 0; i < 4; i++) g.poly([s * (0.1 + i * 0.22), s * 0.05, s * (0.2 + i * 0.22), s * 0.05, s * (0.12 + i * 0.22), s * 0.17, s * (0.02 + i * 0.22), s * 0.17]).fill({ color: C.eyePupil, alpha: 0.7 });
    }));
}

/** Chip socket build pad: flat 3/4 ellipse with pins. */
export function makePadTexture(renderer: Renderer): Texture {
    return art('pad', () => gen(renderer, (g) => {
        const w = CONFIG.sizes.pad.w * SS;
        const h = CONFIG.sizes.pad.h * SS;
        g.ellipse(w * 0.5, h * 0.55, w * 0.48, h * 0.42).fill(C.padDark);
        g.ellipse(w * 0.5, h * 0.48, w * 0.44, h * 0.36).fill(C.pad);
        g.roundRect(w * 0.32, h * 0.28, w * 0.36, h * 0.4, w * 0.04).fill(C.padDark);
        for (let i = 0; i < 4; i++) g.rect(w * (0.35 + i * 0.09), h * 0.2, w * 0.03, h * 0.08).fill(C.via);
        for (let i = 0; i < 4; i++) g.rect(w * (0.35 + i * 0.09), h * 0.68, w * 0.03, h * 0.08).fill(C.via);
    }));
}

/** GOLD build pad: a bonus socket (config pads with a `bonus`). */
export function makeGoldPadTexture(renderer: Renderer): Texture {
    return art('pad-gold', () => gen(renderer, (g) => {
        const w = CONFIG.sizes.pad.w * SS;
        const h = CONFIG.sizes.pad.h * SS;
        g.ellipse(w * 0.5, h * 0.55, w * 0.48, h * 0.42).fill(C.goldDark);
        g.ellipse(w * 0.5, h * 0.48, w * 0.44, h * 0.36).fill(C.gold);
        const cx = w * 0.5;
        const cy = h * 0.48;
        const pts: number[] = [];
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? w * 0.11 : w * 0.045;
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8);
        }
        g.poly(pts).fill(C.goldShine);
    }));
}

/** Network port: where the hackers jack in (path start) and try to reach (path end). */
export function makeBurrowTexture(renderer: Renderer): Texture {
    return art('burrow', () => gen(renderer, (g) => {
        const w = 110 * SS;
        const h = 64 * SS;
        g.roundRect(w * 0.04, h * 0.08, w * 0.92, h * 0.84, h * 0.18).fill(C.pathEdge);
        g.roundRect(w * 0.1, h * 0.18, w * 0.8, h * 0.64, h * 0.12).fill(0x050a14);
        for (let i = 0; i < 6; i++) g.rect(w * (0.2 + i * 0.11), h * 0.24, w * 0.05, h * 0.16).fill(C.gold);
        g.rect(w * 0.16, h * 0.62, w * 0.68, h * 0.06).fill({ color: C.evil, alpha: 0.8 });
    }));
}

/** Circuit board tile: MUST tile seamlessly on both axes (traces run edge to edge). */
export function makeGrassTexture(renderer: Renderer): Texture {
    return art('grass-tile', () => gen(renderer, (g) => {
        const s = 120 * SS;
        g.rect(0, 0, s, s).fill(C.grass);
        const tw = s * 0.025;
        // full-length traces, so the edges always line up
        g.rect(0, s * 0.3 - tw / 2, s, tw).fill(C.grassSpeck);
        g.rect(s * 0.7 - tw / 2, 0, tw, s).fill(C.grassSpeck);
        g.rect(0, s * 0.82 - tw / 2, s, tw).fill(C.grassSpeck);
        // short traces with vias, inside the tile
        g.rect(s * 0.15, s * 0.3, tw, s * 0.32).fill(C.grassSpeck);
        g.circle(s * 0.15 + tw / 2, s * 0.62, s * 0.03).fill(C.via);
        g.rect(s * 0.7, s * 0.55, s * 0.18, tw).fill(C.grassSpeck);
        g.circle(s * 0.88, s * 0.55 + tw / 2, s * 0.03).fill(C.via);
        g.roundRect(s * 0.32, s * 0.45, s * 0.2, s * 0.2, s * 0.02).fill(C.padDark);
        for (let i = 0; i < 3; i++) g.rect(s * (0.35 + i * 0.06), s * 0.42, s * 0.02, s * 0.03).fill(C.via);
        g.circle(s * 0.7, s * 0.3, s * 0.035).fill(C.via);
    }));
}
