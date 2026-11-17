// Releases a game to both RUN and F12 Games. Run it from the game's folder:
//
//   npm run release              build + deploy to RUN (private) + build + upload the PWA
//   npm run release -- --pwa     only the F12 Games web app
//   npm run release -- --run     only RUN
//   npm run release -- --dry     build everything, show what would upload, deploy nothing

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { upload } from './upload.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const doRun = !args.includes('--pwa');
const doPwa = !args.includes('--run');
const game = process.cwd();
const cfg = JSON.parse(readFileSync(path.join(game, 'f12.config.json'), 'utf8'));

function sh(cmd) {
  console.log(`\n> ${cmd}`);
  const r = spawnSync(cmd, { cwd: game, shell: true, stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8' });
  process.stdout.write(r.stdout ?? '');
  if (r.status !== 0) {
    console.error(`\n[release] "${cmd}" failed`);
    process.exit(r.status ?? 1);
  }
  return r.stdout ?? '';
}

if (doRun) {
  sh('npm run build');
  if (!dry) {
    const out = sh('rundot deploy');
    if (/No changes detected/i.test(out)) console.warn('\n[release] RUN says nothing changed since the last deploy');
  }
}

if (doPwa) {
  sh('npm run build:pwa');
  await upload(path.join(game, 'dist-pwa'), `games/${cfg.slug}`, { dry });
  if (!dry) console.log(`\n[release] F12 Games: https://games.f12crowd.com/games/${cfg.slug}/`);
}
