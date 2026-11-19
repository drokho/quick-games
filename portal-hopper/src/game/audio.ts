// Procedural music per world and sound effects (Web Audio), ported from the prototype.
import { DEFS } from './defs';
import type { SongCfg } from './types';

interface Song {
  bpm: number; root: number; chords: number[][]; pat: number[]; wave: OscillatorType; vol: number; cut: number;
  arpDur: number; bass: number[]; bassWave: OscillatorType; bassDur?: number; kick: number[]; hat: number[];
  hatVol?: number; oct?: number; spook?: boolean;
}

const BASES: Record<SongCfg['base'], Song> = {
  hub: { bpm: 120, root: 60, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [-3, 0, 4]], pat: [0, 1, 2, 3, 2, 1, 4, 2], wave: 'square', vol: .045, cut: 2600, arpDur: .18, bass: [0, 3, 4, 6], bassWave: 'triangle', kick: [0, 4], hat: [2, 6] },
  halloween: { bpm: 104, root: 57, chords: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [-5, -1, 2]], pat: [0, 2, 1, 2, 3, 2, 1, 2], wave: 'sawtooth', vol: .055, cut: 1100, arpDur: .26, bass: [0, 3, 6], bassWave: 'sawtooth', kick: [0, 4], hat: [2, 6], spook: true },
  space: { bpm: 80, root: 62, chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], pat: [0, 2, 3, 4, -1, 3, 2, 1], wave: 'sine', vol: .08, cut: 0, arpDur: .7, bass: [0], bassWave: 'sine', bassDur: 1.4, kick: [], hat: [4], hatVol: .025 },
  ice: { bpm: 112, root: 64, chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], pat: [4, 2, 3, 1, 4, 2, 0, 2], oct: 1, wave: 'triangle', vol: .06, cut: 0, arpDur: .3, bass: [0, 4], bassWave: 'triangle', kick: [0], hat: [2, 4, 6] },
};

const SONGS: Record<string, Song> = Object.fromEntries(DEFS.map(d => {
  const b = BASES[d.song.base], c = d.song;
  return [d.id, { ...b, root: c.root ?? b.root, bpm: c.bpm ?? b.bpm, wave: c.wave ?? b.wave, cut: c.cut ?? b.cut }];
}));

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

let AC: AudioContext | null = null;
let master: GainNode, musGain: GainNode;
let muted = false, step = 0, nextT = 0, song = 'hub';
const beats: number[] = []; // scheduled quarter-note times (for the Disco Dome beat jump)
let timer: ReturnType<typeof setInterval> | null = null;

export const isMuted = () => muted;
export function setSong(id: string) { song = SONGS[id] ? id : 'hub'; }

/** Seconds from now to the nearest beat (negative = just passed), or null if the music isn't running. */
export function beatOffset(): number | null {
  if (!AC || AC.state !== 'running' || muted) return null;
  const now = AC.currentTime;
  let best: number | null = null;
  for (const b of beats) { const d = b - now; if (best === null || Math.abs(d) < Math.abs(best)) best = d; }
  return best;
}
export const songBpm = () => SONGS[song].bpm;

export function initAudio(): void {
  if (AC) { if (AC.state === 'suspended') void AC.resume(); return; }
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    AC = new Ctor();
  } catch { return; }
  master = AC.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(AC.destination);
  musGain = AC.createGain(); musGain.gain.value = 0.55; musGain.connect(master);
  const dl = AC.createDelay(); dl.delayTime.value = 0.28;
  const fb = AC.createGain(); fb.gain.value = 0.3;
  const wet = AC.createGain(); wet.gain.value = 0.22;
  musGain.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
  nextT = AC.currentTime + 0.1;
  timer = setInterval(sched, 25);
}

export function setMuted(m: boolean) { muted = m; initAudio(); if (AC) master.gain.value = muted ? 0 : 0.6; }

/** Pause everything when the host pauses the game (RUN lifecycles). */
export function suspendAudio() { if (AC && AC.state === 'running') void AC.suspend(); }
export function resumeAudio() { if (AC && AC.state === 'suspended') void AC.resume(); }

function tone(f: number, t: number, d: number, type: OscillatorType, v: number, dest: AudioNode, cut?: number): OscillatorNode {
  const ac = AC!;
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  let node: AudioNode = o;
  if (cut) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); node = fl; }
  node.connect(g); g.connect(dest);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.025); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.start(t); o.stop(t + d + 0.05); return o;
}
function kick(t: number) {
  const ac = AC!; const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(musGain); o.start(t); o.stop(t + 0.22);
}
function playStep(s: number, time: number) {
  const S = SONGS[song], i = s % 8, bar = Math.floor(s / 8) % S.chords.length, ch = S.chords[bar];
  if (i % 2 === 0) { beats.push(time); if (beats.length > 6) beats.shift(); }
  const idx = S.pat[i];
  if (idx >= 0) { const n = S.root + ch[idx % ch.length] + 12 * Math.floor(idx / ch.length) + 12 * (S.oct || 0); tone(mtof(n), time, S.arpDur, S.wave, S.vol, musGain, S.wave === 'square' || S.wave === 'sawtooth' ? Math.min(S.cut || 1800, 1800) : S.cut); }
  if (S.bass.includes(i)) tone(mtof(S.root + ch[0] - 24), time, S.bassDur || 0.32, S.bassWave, 0.2, musGain, 700);
  // No drums in the music: on phone speakers the noise hi-hat and the kick both came out as a
  // repetitive clicking. (The song tables keep their kick/hat lists, unused.)
  if (S.spook && i === 0 && bar % 2 === 1) {
    const o = tone(mtof(S.root + 24 + ch[2]), time, 1.4, 'sine', 0.05, musGain);
    o.frequency.linearRampToValueAtTime(mtof(S.root + 23 + ch[2]), time + 1.3);
  }
}
function sched() {
  if (!AC || AC.state !== 'running') return;
  if (nextT < AC.currentTime - 0.2) nextT = AC.currentTime + 0.05;
  while (nextT < AC.currentTime + 0.12) { playStep(step, nextT); nextT += 60 / SONGS[song].bpm / 2; step++; }
}

export type Sfx = 'jump' | 'collect' | 'tp' | 'boo' | 'win' | 'boing' | 'bonk' | 'stomp' | 'dash' | 'pound' | 'box' | 'perfect' | 'puff';
export function sfx(kind: Sfx): void {
  if (!AC || AC.state !== 'running') return; const t = AC.currentTime;
  if (kind === 'jump') { const o = tone(420, t, 0.15, 'square', 0.06, master, 3000); o.frequency.exponentialRampToValueAtTime(820, t + 0.12); }
  else if (kind === 'collect') { tone(988, t, 0.12, 'triangle', 0.12, master); tone(1319, t + 0.07, 0.2, 'triangle', 0.12, master); }
  else if (kind === 'tp') { const o = tone(180, t, 0.85, 'sine', 0.18, master); o.frequency.exponentialRampToValueAtTime(1500, t + 0.7); const o2 = tone(240, t, 0.85, 'triangle', 0.08, master); o2.frequency.exponentialRampToValueAtTime(2000, t + 0.7); }
  else if (kind === 'boo') { const o = tone(320, t, 0.55, 'sawtooth', 0.08, master, 900); o.frequency.exponentialRampToValueAtTime(80, t + 0.5); }
  else if (kind === 'boing') { const o = tone(160, t, 0.35, 'sine', 0.16, master); o.frequency.exponentialRampToValueAtTime(700, t + 0.25); }
  else if (kind === 'bonk') { const o = tone(260, t, 0.18, 'square', 0.07, master, 1400); o.frequency.exponentialRampToValueAtTime(120, t + 0.16); }
  else if (kind === 'stomp') { const o = tone(520, t, 0.16, 'triangle', 0.12, master); o.frequency.exponentialRampToValueAtTime(980, t + 0.12); }
  else if (kind === 'dash') { const o = tone(300, t, 0.22, 'sawtooth', 0.05, master, 2200); o.frequency.exponentialRampToValueAtTime(1200, t + 0.2); }
  else if (kind === 'pound') { kick(t); const o = tone(110, t, 0.4, 'sine', 0.2, master); o.frequency.exponentialRampToValueAtTime(40, t + 0.35); }
  else if (kind === 'box') { tone(660, t, 0.1, 'square', 0.06, master, 3000); tone(990, t + 0.06, 0.16, 'square', 0.06, master, 3000); }
  else if (kind === 'perfect') { [0, 7, 12, 19].forEach((n, i) => tone(mtof(76 + n), t + i * 0.05, 0.2, 'triangle', 0.1, master)); }
  else if (kind === 'puff') { const o = tone(700, t, 0.12, 'sine', 0.05, master); o.frequency.exponentialRampToValueAtTime(300, t + 0.1); }
  else if (kind === 'win') { [0, 4, 7, 12].forEach((n, i) => tone(mtof(72 + n), t + i * 0.09, 0.3, 'triangle', 0.12, master)); }
}

export function stopAudioTimer() { if (timer) clearInterval(timer); }
