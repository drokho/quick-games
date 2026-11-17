// Vite plugin that turns a RUN game into an F12 Games PWA.
//
// Use it for `vite build --mode pwa`. It swaps the RUN SDK for our stand-in
// (run-shim.ts), writes dist-pwa/ with a web app manifest, icons, an offline
// service worker, and f12.json (what the portal shows on the game picker).
// Game settings come from f12.config.json in the game's folder.

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { fitCssUnderBar, homeBarScript, homeBarStyle } from './home-bar';

export interface F12Config {
  slug: string;
  title: string;
  shortName?: string;
  description: string;
  /** Longer text for the portal's info popup; blank lines start new paragraphs */
  about?: string;
  themeColor: string;
  background: string;
  orientation?: 'portrait' | 'landscape' | 'any';
  /** Square PNGs, relative to the game folder */
  icons: { '192': string; '512': string };
  /** Shown on the portal tile; defaults to the 512 icon */
  thumbnail?: string;
  /** Realtime rooms: message kinds the relay replays to late joiners */
  rooms?: Record<string, { sticky?: string[] }>;
  /** Paths (prefixes, relative to the build) the service worker caches only once used */
  lazy?: string[];
  /** Order on the portal; lower comes first */
  order?: number;
  /** 'older' games are hidden on the portal until the older-games password is entered */
  audience?: 'kids' | 'older';
  /** 'shared': leaderboards live on the F12 server (nickname + score). Default: this device only */
  leaderboard?: 'device' | 'shared';
  /**
   * A built Android APK (relative to the game folder) to offer on the portal card. It's copied
   * into the upload as <slug>.apk, not cached for offline play, and its version is read from
   * the output-metadata.json Gradle writes beside it. Skipped with a warning if it isn't built.
   */
  apk?: string;
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function readF12Config(root = process.cwd()): F12Config {
  return JSON.parse(readFileSync(path.join(root, 'f12.config.json'), 'utf8')) as F12Config;
}

export interface F12PwaOptions {
  /**
   * Build for an app store wrapper (Capacitor) instead of the F12 site: no F12 home bar, no
   * service worker, leaderboard on the device only (nothing sent to the F12 server), output in
   * dist-app/. Leaving it out builds the F12 PWA exactly as before.
   */
  app?: boolean;
}

export function f12Pwa(opts: F12PwaOptions = {}): Plugin {
  const root = process.cwd();
  const cfg = readF12Config(root);
  const app = !!opts.app;
  let outDir = path.join(root, app ? 'dist-app' : 'dist-pwa');
  let building = false;

  return {
    name: 'f12-games-pwa',
    enforce: 'pre',

    config(_c, env) {
      building = env.command === 'build';
      return {
        base: './',
        define: {
          __F12_GAME__: JSON.stringify({
            slug: cfg.slug,
            api: process.env['F12_API'] ?? '/api/room.php',
            rooms: cfg.rooms ?? {},
            board: !app && cfg.leaderboard === 'shared' ? (process.env['F12_BOARD_API'] ?? '/api/board.php') : null,
          }),
        },
        resolve: {
          alias: [
            { find: /^@series-inc\/rundot-game-sdk\/api$/, replacement: path.join(here, 'run-shim.ts') },
            { find: /^@series-inc\/rundot-game-sdk$/, replacement: path.join(here, 'run-sdk-root.ts') },
          ],
        },
        build: { outDir: app ? 'dist-app' : 'dist-pwa', emptyOutDir: true },
        server: { fs: { allow: [root, here] } },
      };
    },

    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },

    // Game stylesheets: sized to the space under the F12 bar (see home-bar.ts)
    transform(code, id) {
      if (app) return;
      if (/\.css($|\?)/.test(id) && !id.includes('/node_modules/')) return { code: fitCssUnderBar(code), map: null };
    },

    transformIndexHtml() {
      if (app) return [{ tag: 'meta', attrs: { name: 'theme-color', content: cfg.themeColor }, injectTo: 'head' as const }];
      const tags = [
        { tag: 'style', attrs: { id: 'f12-bar-style' }, children: homeBarStyle(), injectTo: 'head-prepend' as const },
        { tag: 'script', children: homeBarScript(cfg.shortName ?? cfg.title, '/'), injectTo: 'head-prepend' as const },
        { tag: 'meta', attrs: { name: 'theme-color', content: cfg.themeColor }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: cfg.shortName ?? cfg.title }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'description', content: cfg.description }, injectTo: 'head' as const },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: 'f12-icons/icon-192.png' }, injectTo: 'head' as const },
      ];
      if (!building) return tags;
      return [
        ...tags,
        { tag: 'link', attrs: { rel: 'manifest', href: 'manifest.webmanifest' }, injectTo: 'head' as const },
        { tag: 'script', children: REGISTER_SW, injectTo: 'body' as const },
      ];
    },

    closeBundle() {
      if (!building) return;
      if (app) {
        console.log(`
[f12] ${cfg.title} app build ready in ${path.relative(root, outDir)}/`);
        return;
      }
      const icons = path.join(outDir, 'f12-icons');
      mkdirSync(icons, { recursive: true });
      copyFileSync(path.join(root, cfg.icons['192']), path.join(icons, 'icon-192.png'));
      copyFileSync(path.join(root, cfg.icons['512']), path.join(icons, 'icon-512.png'));
      const thumb = cfg.thumbnail ? `f12-icons/thumb${path.extname(cfg.thumbnail)}` : 'f12-icons/icon-512.png';
      if (cfg.thumbnail) copyFileSync(path.join(root, cfg.thumbnail), path.join(outDir, thumb));

      writeJson(path.join(outDir, 'manifest.webmanifest'), {
        id: `/games/${cfg.slug}/`,
        name: cfg.title,
        short_name: cfg.shortName ?? cfg.title,
        description: cfg.description,
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: cfg.orientation ?? 'portrait',
        theme_color: cfg.themeColor,
        background_color: cfg.background,
        icons: [
          { src: 'f12-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'f12-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'f12-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      });

      // Everything gets cached up front except the big lazy folders (music etc.)
      const lazy = cfg.lazy ?? ['cdn-assets/'];
      const files = walk(outDir)
        .map((f) => path.relative(outDir, f).split(path.sep).join('/'))
        .filter((f) => f !== 'sw.js' && f !== 'f12.json' && !lazy.some((p) => f.startsWith(p)));
      const swTemplate = readFileSync(path.join(here, 'sw.js'), 'utf8');
      const hash = createHash('sha1').update(swTemplate);
      for (const f of files.sort()) hash.update(f).update(readFileSync(path.join(outDir, f)));
      const version = hash.digest('hex').slice(0, 10);

      writeJson(path.join(outDir, 'f12.json'), {
        slug: cfg.slug,
        title: cfg.title,
        description: cfg.description,
        about: cfg.about ?? '',
        themeColor: cfg.themeColor,
        background: cfg.background,
        icon: 'f12-icons/icon-192.png',
        thumbnail: thumb,
        order: cfg.order ?? 100,
        audience: cfg.audience ?? 'kids',
        version,
        updated: new Date().toISOString(),
        ...(copyApk() ?? {}),
      });

      const sw = swTemplate
        .replace('__SLUG__', cfg.slug)
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(['./', ...files.filter((f) => f !== 'index.html')]))
        .replace('__LAZY__', JSON.stringify(lazy));
      writeFileSync(path.join(outDir, 'sw.js'), sw);
      const mb = files.reduce((n, f) => n + statSync(path.join(outDir, f)).size, 0) / 1e6;
      console.log(`\n[f12] ${cfg.title} PWA ready in ${path.relative(root, outDir)}/ (version ${version}, ${files.length} files, ${mb.toFixed(1)} MB cached up front)`);
    },
  };

  // Copied after the offline file list is made, so the service worker never caches it
  function copyApk() {
    if (!cfg.apk) return null;
    const src = path.join(root, cfg.apk);
    if (!existsSync(src)) {
      console.warn(`\n[f12] ${cfg.apk} isn't built, so the portal won't offer the Android app`);
      return null;
    }
    const file = `${cfg.slug}.apk`;
    copyFileSync(src, path.join(outDir, file));
    const meta = path.join(path.dirname(src), 'output-metadata.json');
    const versionName = existsSync(meta)
      ? ((JSON.parse(readFileSync(meta, 'utf8')) as { elements?: { versionName?: string }[] }).elements?.[0]?.versionName ?? '')
      : '';
    return { apk: { file, size: statSync(src).size, version: versionName } };
  }
}

const REGISTER_SW = `
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('[F12 Games] offline mode unavailable', err));
  });
}`;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

function writeJson(file: string, data: unknown) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}
