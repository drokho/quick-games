// Uploads a folder to the F12 Games server over FTP, sending only what changed.
//
//   node tools/upload.mjs <local folder> <remote folder under FTP_ROOT> [--exclude path/]... [--dry]
//
// Login comes from f12-games/.env.deploy, or FTP_* environment variables when that file is missing. A record of what was uploaded last
// time is kept in .upload-cache/ so a release only sends the changed files.
// Pages, service workers and game info go last, so phones never see a new
// page before the files it needs are there. Files removed locally are deleted
// from the server afterwards.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { checkServerIdentity } from 'node:tls';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnv() {
  const file = path.join(home, '.env.deploy');
  // no .env.deploy (a cloud session): read the login from environment variables instead
  if (!existsSync(file)) {
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('FTP_')));
    for (const k of ['FTP_HOST', 'FTP_USER', 'FTP_PASS', 'FTP_ROOT']) {
      if (!env[k]) throw new Error(`${k} is not set: add the FTP_* variables to the cloud environment, or copy .env.deploy.example to .env.deploy`);
    }
    return env;
  }
  const env = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  for (const k of ['FTP_HOST', 'FTP_USER', 'FTP_PASS', 'FTP_ROOT']) {
    if (!env[k]) throw new Error(`${k} is empty in ${file}`);
  }
  return env;
}

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    return d.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

const LAST = /(^|\/)(index\.html|index\.php|sw\.js|manifest\.webmanifest|f12\.json)$/;

export async function upload(localDir, remoteDir, { exclude = [], dry = false } = {}) {
  let env;
  try {
    env = loadEnv();
  } catch (err) {
    if (!dry) throw err;
    env = { FTP_HOST: 'not-set', FTP_ROOT: '/' }; // a dry run works before the login is filled in
  }
  const local = path.resolve(localDir);
  const remote = path.posix.join(env.FTP_ROOT, remoteDir);
  const files = walk(local).filter((f) => !exclude.some((x) => f === x || f.startsWith(x)));

  mkdirSync(path.join(home, '.upload-cache'), { recursive: true });
  const cacheFile = path.join(home, '.upload-cache', `${env.FTP_HOST}${remote}`.replace(/[^a-z0-9.-]+/gi, '_') + '.json');
  const before = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
  const after = {};
  for (const f of files) after[f] = createHash('sha1').update(readFileSync(path.join(local, f))).digest('hex');

  const changed = files.filter((f) => before[f] !== after[f]).sort((a, b) => Number(LAST.test(a)) - Number(LAST.test(b)));
  const gone = Object.keys(before).filter((f) => !(f in after));
  console.log(`[upload] ${remote}: ${changed.length} changed, ${files.length - changed.length} unchanged, ${gone.length} to remove`);
  if (dry) {
    for (const f of changed) console.log('  +', f);
    for (const f of gone) console.log('  -', f);
    return;
  }
  if (!changed.length && !gone.length) return;

  let client = new Client(30000);
  const secure = env.FTP_SECURE === 'implicit' ? 'implicit' : env.FTP_SECURE !== 'false';
  // FTP_TLS_NAME: the name on the host's certificate when it isn't FTP_HOST (e.g. Hostinger's hstgr.io).
  // The certificate is still fully verified, just against that name.
  const secureOptions = env.FTP_TLS_NAME ? { checkServerIdentity: (_host, cert) => checkServerIdentity(env.FTP_TLS_NAME, cert) } : {};
  const connect = () => client.access({ host: env.FTP_HOST, port: Number(env.FTP_PORT || (secure === 'implicit' ? 990 : 21)), user: env.FTP_USER, password: env.FTP_PASS, secure, secureOptions });
  let dirNow = '';
  /** Runs an FTP step, reconnecting when the host drops the session (shared hosts often do). */
  const retry = async (step) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await step();
      } catch (err) {
        if (attempt >= 5) throw err;
        console.log(`[upload] connection dropped (${err.code || err.message}), reconnecting...`);
        client.close();
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        client = new Client(30000);
        dirNow = '';
        await connect().catch(() => undefined);
      }
    }
  };
  try {
    await connect();
    const done = { ...before };
    let n = 0;
    for (const f of changed) {
      const dir = path.posix.join(remote, path.posix.dirname(f));
      await retry(async () => {
        if (dir !== dirNow) {
          await client.ensureDir(dir);
          dirNow = dir;
        }
        await client.uploadFrom(path.join(local, f), path.posix.basename(f));
      });
      done[f] = after[f];
      if (++n % 25 === 0 || n === changed.length) {
        console.log(`[upload] ${n}/${changed.length}`);
        writeFileSync(cacheFile, JSON.stringify(done)); // so an interrupted upload can resume
      }
    }
    for (const f of gone) {
      await retry(() => client.remove(path.posix.join(remote, f), true));
      delete done[f];
    }
    writeFileSync(cacheFile, JSON.stringify(done));
  } finally {
    client.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const exclude = [];
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--exclude') exclude.push(args[++i]);
    else if (args[i] !== '--dry') pos.push(args[i]);
  }
  if (pos.length !== 2) {
    console.error('Usage: node tools/upload.mjs <local folder> <remote folder> [--exclude path]... [--dry]');
    process.exit(1);
  }
  const localDir = path.isAbsolute(pos[0]) ? pos[0] : path.resolve(process.cwd(), pos[0]);
  upload(localDir, pos[1], { exclude, dry: args.includes('--dry') }).catch((err) => {
    console.error('[upload] failed:', err.message);
    process.exit(1);
  });
}
