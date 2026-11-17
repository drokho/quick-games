// DOM overlays: HUD, toast, title card, wardrobe and touch buttons.
import { COLORS, HATS, TRAILS, look, saveSoon } from './game/save';
import { drawPlayer, TAU } from './art/draw';
import { WORLDS, TOTAL_ITEMS, ORDER, collectedCount, levelsDone, type World } from './game/worlds';
import { isMuted, setMuted, initAudio } from './game/audio';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export const keys = { l: false, r: false, j: false };
export const ui = { playing: false, wardOpen: false, onJumpPress: () => {}, onStart: () => {} };

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(title: string, sub = '', ms = 1900) {
  const el = $('toast');
  el.textContent = title;
  if (sub) { const s = document.createElement('small'); s.textContent = sub; el.appendChild(s); }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function updateHud(W: World) {
  $('wname').textContent = W.title;
  $('wcount').textContent = `${W.emoji} ${W.items.filter(i => i.got).length}/${W.items.length}`;
  $('total').textContent = `🏆 ${collectedCount()}/${TOTAL_ITEMS}`;
  const pw = $('wpower');
  pw.hidden = !W.powerName && W.id !== 'hub';
  pw.textContent = W.id === 'hub' ? `🚩 ${levelsDone()}/${ORDER.length} levels done` : `⚡ ${W.powerName}${W.done ? ' · ✓ done' : ''}`;
}

function start() {
  if (ui.playing) return;
  ui.playing = true; $('start').hidden = true; initAudio();
  ui.onStart();
}

function openWard() { ui.wardOpen = true; $('ward').hidden = false; buildWard(); keys.l = keys.r = keys.j = false; }
function closeWard() { ui.wardOpen = false; $('ward').hidden = true; }

function buildWard() {
  const ce = $('colors'); ce.innerHTML = '';
  COLORS.forEach(col => {
    const b = document.createElement('button');
    b.className = 'sw' + (look.color === col ? ' sel' : '');
    b.style.background = col; b.setAttribute('aria-label', 'Color ' + col);
    b.onclick = () => { look.color = col; saveSoon(); buildWard(); };
    ce.appendChild(b);
  });
  const mk = (el: HTMLElement, list: [string, string][], key: 'hat' | 'trail') => {
    el.innerHTML = '';
    list.forEach(([id, name]) => {
      const b = document.createElement('button');
      b.className = 'opt' + (look[key] === id ? ' sel' : '');
      b.textContent = name;
      b.onclick = () => { look[key] = id; saveSoon(); buildWard(); };
      el.appendChild(b);
    });
  };
  mk($('hats'), HATS, 'hat'); mk($('trails'), TRAILS, 'trail');
}

let pctx: CanvasRenderingContext2D | null = null;
export function drawPreview(t: number) {
  if (!ui.wardOpen) return;
  pctx ??= $<HTMLCanvasElement>('prev').getContext('2d');
  if (!pctx) return;
  pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.clearRect(0, 0, 280, 280);
  pctx.setTransform(2.6, 0, 0, 2.6, 0, 0);
  pctx.fillStyle = 'rgba(0,0,0,.15)'; pctx.beginPath(); pctx.ellipse(54, 88, 22, 5, 0, 0, TAU); pctx.fill();
  drawPlayer(pctx, 54, 88 - Math.abs(Math.sin(t * 3)) * 6, look, t, Math.sin(t * 0.8) > 0 ? 1 : -1, 0, false);
}

function bindBtn(el: HTMLElement, k: 'l' | 'r' | 'j') {
  const on = (e: PointerEvent) => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (k === 'j' && !keys.j) ui.onJumpPress();
    keys[k] = true; el.classList.add('on'); initAudio();
  };
  const off = () => { keys[k] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('lostpointercapture', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
}

const isLeft = (k: string) => k === 'ArrowLeft' || k === 'a' || k === 'A';
const isRight = (k: string) => k === 'ArrowRight' || k === 'd' || k === 'D';
const isJump = (k: string) => k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W';

export function initUi() {
  const markTouch = () => document.body.classList.add('touch');
  if (window.matchMedia('(pointer: coarse)').matches) markTouch();
  window.addEventListener('touchstart', markTouch, { once: true, passive: true });

  $('playBtn').addEventListener('click', start);
  const mute = $('muteBtn');
  mute.addEventListener('click', () => {
    setMuted(!isMuted());
    mute.textContent = isMuted() ? '🔇' : '🔊';
    mute.setAttribute('aria-label', isMuted() ? 'Unmute music' : 'Mute music');
  });
  $('wardBtn').addEventListener('click', openWard);
  $('wardDone').addEventListener('click', closeWard);
  bindBtn($('bL'), 'l'); bindBtn($('bR'), 'r'); bindBtn($('bJ'), 'j');
  $('app').addEventListener('pointerdown', () => { if (ui.playing && !ui.wardOpen) ui.onJumpPress(); });

  window.addEventListener('keydown', e => {
    if (ui.wardOpen) { if (e.key === 'Escape') closeWard(); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    if (!ui.playing && (e.key === ' ' || e.key === 'Enter')) { start(); return; }
    if (isLeft(e.key)) keys.l = true;
    if (isRight(e.key)) keys.r = true;
    if (isJump(e.key)) { if (!keys.j) ui.onJumpPress(); keys.j = true; }
  });
  window.addEventListener('keyup', e => {
    if (isLeft(e.key)) keys.l = false;
    if (isRight(e.key)) keys.r = false;
    if (isJump(e.key)) keys.j = false;
  });
  window.addEventListener('blur', () => { keys.l = keys.r = keys.j = false; });
  updateHud(WORLDS.hub);
}
