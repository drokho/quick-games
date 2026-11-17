// Behavior check for src/state/save.ts on the shared save system.
// Runs the real modules with a fake RUN SDK. Run: npm test (Node 22.18 or later; the script skips on an older Node)
import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

interface Fake {
  cloud: Map<string, string>;
  cloudReads: number;
  cloudWrites: string[];
  failReads: boolean;
  failWrites: boolean;
  deviceCacheCalls: number;
  ready: boolean;
}
const fake: Fake = { cloud: new Map(), cloudReads: 0, cloudWrites: [], failReads: false, failWrites: false, deviceCacheCalls: 0, ready: true };

const deviceCacheTouched = async (): Promise<never> => {
  fake.deviceCacheCalls += 1;
  throw new Error('the save must never use deviceCache');
};
let spendCalls = 0;
const sdkModule = {
  appStorage: {
    getItem: async (k: string) => {
      fake.cloudReads += 1;
      if (fake.failReads) throw new Error('read timeout');
      return fake.cloud.get(k) ?? null;
    },
    setItem: async (k: string, v: string) => {
      if (fake.failWrites) throw new Error('write rejected');
      fake.cloudWrites.push(v);
      fake.cloud.set(k, v);
    },
  },
  deviceCache: { getItem: deviceCacheTouched, setItem: deviceCacheTouched },
  iap: { spendCurrency: async () => { spendCalls += 1; return { success: true }; } },
  lifecycles: { onPause: () => undefined, onSleep: () => undefined, onQuit: () => undefined },
};

// Module loader hook: point the SDK and runSdk imports at fakes.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (specifier === '@series-inc/rundot-game-sdk/api') return { url: 'fake-sdk:api', shortCircuit: true };
  if (specifier.endsWith('/sdk/runSdk.ts') || specifier === './runSdk.ts') return { url: 'fake-sdk:runsdk', shortCircuit: true };
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url === 'fake-sdk:api') return { format: 'module', source: 'export default globalThis.__fakeSdk;', shortCircuit: true };
  if (url === 'fake-sdk:runsdk') return { format: 'module', source: 'export const sdkReady = () => globalThis.__fakeSdkReady();', shortCircuit: true };
  return next(url, context);
}`), import.meta.url);
const testGlobals = globalThis as typeof globalThis & { __fakeSdk?: typeof sdkModule; __fakeSdkReady?: () => boolean };
testGlobals.__fakeSdk = sdkModule;
testGlobals.__fakeSdkReady = (): boolean => fake.ready;

const KEY = 'td-template:save:v1';
const VALID_SAVE = { bestWave: 3, gems: 100, meta: {}, audio: { music: 0.6, sfx: 0.8 }, ads: { watchedToday: 0, lastResetDay: null } };
const currencyOf = (text: string): number => JSON.parse(text).gems;

type SaveModule = typeof import('../src/state/save.ts');
let instance = 0;
/** A fresh save module per test: the save system loads once per session. */
async function freshSave(): Promise<SaveModule> {
  fake.cloud.clear(); fake.cloudReads = 0; fake.cloudWrites = []; fake.deviceCacheCalls = 0;
  fake.failReads = false; fake.failWrites = false; fake.ready = true;
  instance += 1;
  return import(`../src/state/save.ts?instance=${instance}`) as Promise<SaveModule>;
}

mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1_700_000_000_000 });
const tick = async (ms = 0): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await new Promise<void>((resolve) => setImmediate(resolve));
  if (ms > 0) mock.timers.tick(ms);
  for (let i = 0; i < 5; i += 1) await new Promise<void>((resolve) => setImmediate(resolve));
};
const quietWarn = mock.method(console, 'warn', () => undefined);
const quietError = mock.method(console, 'error', () => undefined);
void quietWarn; void quietError;

test('a failed cloud read plays on defaults at once and never writes this session', async () => {
  const save = await freshSave();
  fake.cloud.set(KEY, JSON.stringify(VALID_SAVE));
  fake.failReads = true;
  const data = await save.loadSave();
  assert.equal(data.gems, 0, 'defaults, not the device or a stale copy');
  assert.equal(fake.cloudReads, 1, 'one read, no retry loop');

  fake.failReads = false; // the store comes back later in the session
  save.addGems(5);
  save.flushSave();
  await tick(60_000);
  assert.equal(fake.cloudWrites.length, 0, 'the stored save is never overwritten');
  assert.equal(JSON.parse(fake.cloud.get(KEY)!).gems, VALID_SAVE.gems);
});

test('cloud read success with no data is a new player: writes are allowed', async () => {
  const save = await freshSave();
  await save.loadSave();
  save.addGems(3);
  await tick();
  assert.equal(fake.cloudWrites.length, 1);
  assert.equal(currencyOf(fake.cloudWrites[0]), 3);
});

test('the save never touches deviceCache', async () => {
  const save = await freshSave();
  await save.loadSave();
  save.addGems(1);
  save.flushSave();
  await tick();
  assert.equal(fake.deviceCacheCalls, 0);
});

test('an unreadable cloud blob is never overwritten', async () => {
  for (const blob of ['{not json', '[1,2,3]', '"text"']) {
    const save = await freshSave();
    fake.cloud.set(KEY, blob);
    await save.loadSave();
    save.addGems(7);
    save.flushSave();
    await tick();
    assert.equal(fake.cloudWrites.length, 0, `no write over ${blob}`);
    assert.equal(fake.cloud.get(KEY), blob, 'the stored blob is unchanged');
  }
});

test('wrong-typed fields in a stored object are coerced, and the save keeps working', async () => {
  const save = await freshSave();
  fake.cloud.set(KEY, JSON.stringify({ ...VALID_SAVE, gems: 'lots' }));
  const data = await save.loadSave();
  assert.equal(data.gems, 0);
  save.addGems(2);
  await tick();
  assert.equal(currencyOf(fake.cloudWrites.at(-1)!), 2);
});

test('a failed cloud write is logged and retried by the next save point', async () => {
  const save = await freshSave();
  fake.cloud.set(KEY, JSON.stringify(VALID_SAVE));
  await save.loadSave();
  fake.failWrites = true;
  save.addGems(5);
  await tick();
  assert.equal(fake.cloudWrites.length, 0);
  fake.failWrites = false;
  save.flushSave(); // e.g. onPause
  await tick();
  assert.equal(currencyOf(fake.cloudWrites.at(-1)!), VALID_SAVE.gems + 5);
});

test('without the RUN SDK the game plays on defaults and nothing is written', async () => {
  const save = await freshSave();
  fake.ready = false;
  const data = await save.loadSave();
  assert.equal(data.gems, 0);
  save.addGems(4);
  await tick();
  assert.equal(save.getSave().gems, 4);
  assert.equal(fake.cloudReads, 0);
  assert.equal(fake.cloudWrites.length, 0);
});

test('canSave() is true after a good read and false after a failed read', async () => {
  const ok = await freshSave();
  fake.cloud.set(KEY, JSON.stringify(VALID_SAVE));
  await ok.loadSave();
  assert.equal(ok.canSave(), true);

  const failed = await freshSave();
  fake.failReads = true;
  await failed.loadSave();
  assert.equal(failed.canSave(), false);
});

test('the Bits fallback does not charge when this session cannot save', async () => {
  await freshSave();
  fake.failReads = true;
  // sdk/ads.ts imports the plain save module, so load that instance.
  const save = (await import('../src/state/save.ts')) as SaveModule;
  await save.loadSave();
  assert.equal(fake.cloudReads, 1, 'the read was attempted and failed');
  const { spendBits } = await import('../src/sdk/ads.ts');
  const result = await spendBits({ productId: 'bonus', costRB: 5, description: 'Double coins' });
  assert.deepEqual(result, { status: 'failed', error: 'save_unavailable' });
  assert.equal(spendCalls, 0, 'no Bits were charged');
});
