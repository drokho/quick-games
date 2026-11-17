import Phaser from 'phaser';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import PlayScene from './scenes/PlayScene';
import { initUi, updateHud } from './ui';
import { loadSave, saveNow } from './game/save';
import { loadSprites } from './art/sprites';
import { resumeAudio, suspendAudio } from './game/audio';
import { WORLDS } from './game/worlds';

const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
// Size to the game area, not the window: on F12 Games the portal's bar takes the top of the screen.
const area = () => { const r = document.getElementById('app')?.getBoundingClientRect(); return r && r.height > 0 ? r : { width: window.innerWidth, height: window.innerHeight, bottom: window.innerHeight }; };
const deviceSize = () => { const r = area(); return { w: Math.max(1, Math.round(r.width * DPR())), h: Math.max(1, Math.round(r.height * DPR())) }; };

function safe(fn: () => void) { try { fn(); } catch { /* host not ready: ignore */ } }

safe(() => RundotGameAPI.lifecycles.onPause(() => { suspendAudio(); void saveNow(); }));
safe(() => RundotGameAPI.lifecycles.onResume(() => resumeAudio()));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { suspendAudio(); void saveNow(); } else resumeAudio();
});

async function bootstrap(): Promise<void> {
  initUi();
  await Promise.all([
    loadSave(),
    loadSprites(),
    document.fonts?.load('700 20px Fredoka').catch(() => undefined),
    document.fonts?.load('500 14px Fredoka').catch(() => undefined),
  ]);
  updateHud(WORLDS.hub);

  const { w, h } = deviceSize();
  const game = new Phaser.Game({
    type: Phaser.CANVAS, // the world is drawn with Canvas 2D, so the canvas renderer avoids a texture upload each frame
    parent: 'app',
    width: w,
    height: h,
    backgroundColor: '#5fb8ff',
    scene: [PlayScene],
    audio: { noAudio: true }, // music and sfx use Web Audio directly (src/game/audio.ts)
    scale: { mode: Phaser.Scale.NONE },
    render: { antialias: true },
  });
  window.addEventListener('resize', () => {
    const s = deviceSize();
    game.scale.resize(s.w, s.h);
  });

  safe(() => RundotGameAPI.analytics.recordCustomEvent('game_loaded'));
  safe(() => RundotGameAPI.analytics.trackFunnelStep(1, 'game_loaded', 'boot', 1));
}

bootstrap().catch(err => console.error('[main] bootstrap failed', err));
