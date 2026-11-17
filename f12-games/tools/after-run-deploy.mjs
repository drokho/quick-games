// Claude Code hook: after a successful `rundot deploy` (private or --public) in a
// game that is on F12 Games, build the web app and upload it to F12 Games too.
//
// Wired in ~/.claude/settings.json as a PostToolUse hook on Bash|PowerShell. It
// reads the hook input on stdin and does nothing unless the command ran
// `rundot deploy` in a folder with an f12.config.json. `npm run release` already
// covers both sides, so it doesn't trigger this.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEPLOY = /(^|[\s;&|(])rundot(\.cmd|\.exe)?\s+deploy\b/;

/** Git Bash paths (/c/projects/x) to Windows ones (C:/projects/x). */
function native(p) {
  const m = p.match(/^\/([a-zA-Z])(\/.*)?$/);
  return m && process.platform === 'win32' ? `${m[1].toUpperCase()}:${m[2] ?? '/'}` : p;
}

/** The folder `rundot deploy` ran in: the last `cd` / `Set-Location` before it, else the hook's cwd. */
function deployDir(command, cwd) {
  const before = command.slice(0, command.search(DEPLOY) + 1);
  const cds = [...before.matchAll(/(?:^|[\s;&|(])(?:cd|Set-Location|sl|pushd)\s+(?:-Path\s+)?("([^"]+)"|'([^']+)'|([^\s;&|)]+))/g)];
  const last = cds.at(-1);
  const target = last ? native(last[2] ?? last[3] ?? last[4]) : '.';
  return path.resolve(cwd, target);
}

function findGame(dir) {
  for (let d = dir, i = 0; i < 3; i++, d = path.dirname(d)) {
    if (existsSync(path.join(d, 'f12.config.json'))) return d;
    if (path.dirname(d) === d) break;
  }
  return null;
}

function reply(message, context) {
  process.stdout.write(JSON.stringify({ systemMessage: message, hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: context } }));
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const command = String(input?.tool_input?.command ?? '');
if (!DEPLOY.test(command) || /\s(--help|-h|-\?)\b/.test(command)) process.exit(0);

const game = findGame(deployDir(command, input.cwd || process.cwd()));
if (!game) process.exit(0);

const out = String(input?.tool_response?.stdout ?? input?.tool_response?.output ?? JSON.stringify(input?.tool_response ?? ''));
if (/deploy failed|Deployment failed|"success"\s*:\s*false/i.test(out)) process.exit(0);

const slug = JSON.parse(readFileSync(path.join(game, 'f12.config.json'), 'utf8')).slug;
// F12_HOOK_DRY=1 builds and lists what would upload without sending anything (for testing the hook)
const flags = ['--pwa', ...(process.env.F12_HOOK_DRY ? ['--dry'] : [])];
const r = spawnSync(process.execPath, [path.join(home, 'tools', 'release.mjs'), ...flags], { cwd: game, encoding: 'utf8', shell: false });
const log = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
mkdirSync(path.join(home, '.upload-cache'), { recursive: true });
const logFile = path.join(home, '.upload-cache', `after-run-deploy-${slug}.log`);
writeFileSync(logFile, `${new Date().toISOString()}  ${command}\n\n${log}`);

if (r.status === 0) {
  const changed = log.match(/\[upload\][^\n]*changed[^\n]*/)?.[0] ?? '';
  reply(
    `F12 Games updated: https://games.f12crowd.com/games/${slug}/`,
    `The F12 Games hook rebuilt the web app for ${slug} and uploaded it after this RUN deploy (${changed.trim()}). Live at https://games.f12crowd.com/games/${slug}/. Mention this to the user alongside the RUN link.`,
  );
} else {
  const tail = log.trim().split(/\r?\n/).slice(-15).join('\n');
  reply(
    `F12 Games upload failed for ${slug} (RUN deploy is fine). Log: ${logFile}`,
    `The RUN deploy succeeded, but the F12 Games hook failed to build or upload ${slug}. Tell the user, look at the log, fix it, then run \`npm run release -- --pwa\` in ${game}. Last lines:\n${tail}`,
  );
}
