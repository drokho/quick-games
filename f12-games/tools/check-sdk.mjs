// Lists the RUN SDK features a game uses that F12 Games doesn't provide yet.
//
//   node tools/check-sdk.mjs <game folder> [--json]
//
// It finds every `RundotGameAPI.x.y` in the game's src/ and compares it with
// platform/sdk-support.json (what platform/run-shim.ts covers). Anything listed
// as missing would hit the shim's warn-and-do-nothing stub in the web build.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const support = JSON.parse(readFileSync(path.join(home, 'platform', 'sdk-support.json'), 'utf8'));

const SDK_API = /import\s+(\w+)\s*(?:,\s*\{[^}]*\})?\s*from\s*['"]@series-inc\/rundot-game-sdk\/api['"]/g;
const SDK_ANY = /from\s*['"](@series-inc\/rundot-game-sdk[^'"]*)['"]/g;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'node_modules' ? [] : walk(full);
    return /\.(m?[jt]sx?)$/.test(d.name) ? [full] : [];
  });
}

/** 'ok' when the shim covers this use, otherwise 'missing'. Namespace-only uses of a partial namespace are 'check'. */
function status(ns, member) {
  const s = support.supported[ns];
  if (s === true) return 'ok';
  if (!s) return 'missing';
  if (!member) return 'check';
  return s.includes(member) ? 'ok' : 'missing';
}

export function checkGame(gameDir) {
  const uses = new Map(); // "ns.member" -> { ns, member, status, at: [file:line] }
  const otherImports = new Set();
  for (const file of walk(path.join(gameDir, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(SDK_ANY)) if (m[1] !== '@series-inc/rundot-game-sdk/api') otherImports.add(m[1]);
    const names = [...text.matchAll(SDK_API)].map((m) => m[1]);
    if (!names.length) continue;
    const rel = path.relative(gameDir, file).split(path.sep).join('/');
    const lines = text.split(/\r?\n/);
    for (const name of new Set(names)) {
      const use = new RegExp(`\\b${name}\\s*\\??\\.\\s*(\\w+)(?:\\s*\\??\\.\\s*(\\w+))?`, 'g');
      lines.forEach((line, i) => {
        for (const m of line.matchAll(use)) {
          const ns = m[1];
          // `RundotGameAPI.log(...)` has no member; `RundotGameAPI.system.getSafeArea` does
          const member = support.supported[ns] === true ? undefined : m[2];
          const key = member ? `${ns}.${member}` : ns;
          if (!uses.has(key)) uses.set(key, { use: key, ns, member, status: status(ns, member), at: [] });
          uses.get(key).at.push(`${rel}:${i + 1}`);
        }
      });
    }
  }
  const list = [...uses.values()].sort((a, b) => a.use.localeCompare(b.use));
  return { uses: list, otherImports: [...otherImports], decisions: support.decisions };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) {
    console.error('Usage: node tools/check-sdk.mjs <game folder> [--json]');
    process.exit(1);
  }
  const result = checkGame(path.resolve(dir));
  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const show = (label, s) => {
      const items = result.uses.filter((u) => u.status === s);
      if (!items.length) return;
      console.log(`\n${label}`);
      for (const u of items) {
        const note = result.decisions[u.ns] ? `  (${result.decisions[u.ns]})` : '';
        console.log(`  ${u.use.padEnd(36)} ${u.at.slice(0, 4).join(', ')}${u.at.length > 4 ? ` +${u.at.length - 4} more` : ''}${s === 'ok' ? '' : note}`);
      }
    };
    show('Already covered by F12 Games:', 'ok');
    show('Missing (build these in platform/run-shim.ts):', 'missing');
    show('Used through a variable, check which members the code calls:', 'check');
    if (result.otherImports.length) console.log(`\nOther SDK imports to review: ${result.otherImports.join(', ')}`);
    const missing = result.uses.filter((u) => u.status !== 'ok').length;
    console.log(`\n${missing ? `${missing} to fill in` : 'Nothing missing'} for ${path.basename(path.resolve(dir))}`);
  }
}
