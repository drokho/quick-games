/**
 * The authored invasion, wave by wave (endless waves follow; see below). Entries in a wave spawn sequentially (with a
 * short gap between entries), each entry spawning `count` of one bug type
 * every `spacing` seconds. No hidden scaling: what you read is what attacks,
 * and what `npm run balance` simulates.
 */
export interface WaveEntry {
    enemy: string;
    count: number;
    spacing: number;
}

export interface Wave {
    entries: WaveEntry[];
    /** Endless-only stat multipliers (authored waves leave these unset = 1). */
    hpMult?: number;
    speedMult?: number;
}

/** Gap between one entry finishing and the next starting, seconds. */
export const ENTRY_GAP = 0.8;

export const WAVES: Wave[] = [
    { entries: [{ enemy: 'bot', count: 6, spacing: 1.1 }] },
    { entries: [{ enemy: 'bot', count: 10, spacing: 0.9 }] },
    { entries: [{ enemy: 'bot', count: 6, spacing: 0.9 }, { enemy: 'phisher', count: 4, spacing: 0.8 }] },
    { entries: [{ enemy: 'phisher', count: 10, spacing: 0.7 }, { enemy: 'bot', count: 4, spacing: 0.8 }] },
    { entries: [{ enemy: 'ransom', count: 4, spacing: 1.4 }, { enemy: 'bot', count: 8, spacing: 0.7 }] },
    { entries: [{ enemy: 'phisher', count: 8, spacing: 0.6 }, { enemy: 'ransom', count: 4, spacing: 1.2 }] },
    { entries: [{ enemy: 'bot', count: 14, spacing: 0.5 }, { enemy: 'deepfake', count: 4, spacing: 0.9 }] },
    { entries: [{ enemy: 'ransom', count: 10, spacing: 0.9 }, { enemy: 'phisher', count: 8, spacing: 0.55 }] },
    { entries: [{ enemy: 'deepfake', count: 12, spacing: 0.6 }, { enemy: 'ransom', count: 6, spacing: 0.9 }] },
    { entries: [{ enemy: 'overlord', count: 3, spacing: 3.0 }, { enemy: 'deepfake', count: 10, spacing: 0.55 }, { enemy: 'ransom', count: 6, spacing: 0.8 }] },
];

// ---------------------------------------------------------------------------
// ENDLESS: once the authored waves above are cleared, waves keep coming,
// generated deterministically from the wave number (no randomness, so the
// balance sim and real play agree). Survive as long as you can.
// ---------------------------------------------------------------------------

export const ENDLESS = {
    hpPerWave: 0.12,     // +12% enemy hp per endless wave
    speedPerWave: 0.02,  // +2% enemy speed per endless wave...
    speedCap: 1.4,       // ...up to +40% (faster than this is unreadable)
    countPerWave: 2,     // extra basic enemies per endless wave
};

/** The wave at a 0-based index: authored while they last, generated after. */
export function waveAt(index: number): Wave {
    if (index < WAVES.length) return WAVES[index];
    const k = index - WAVES.length + 1; // 1-based endless wave number
    const spacing = Math.max(0.3, 0.7 - 0.02 * k);
    const entries: WaveEntry[] = [
        { enemy: 'bot', count: 8 + ENDLESS.countPerWave * k, spacing },
        { enemy: 'deepfake', count: 4 + k, spacing: spacing + 0.1 },
        { enemy: 'ransom', count: 3 + Math.floor(k / 2), spacing: 0.9 },
    ];
    if (k % 3 === 0) entries.unshift({ enemy: 'overlord', count: 1 + Math.floor(k / 3), spacing: 3 });
    return {
        entries,
        hpMult: 1 + ENDLESS.hpPerWave * k,
        speedMult: Math.min(ENDLESS.speedCap, 1 + ENDLESS.speedPerWave * k),
    };
}
