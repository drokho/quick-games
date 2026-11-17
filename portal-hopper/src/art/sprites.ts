// Optional PNG overrides for the code-drawn art.
//
// Drop a PNG in public/sprites/ and list it in public/sprites/sprites.json, e.g.
//   { "item-star": { "file": "star.png", "w": 32, "h": 32 } }
// Keys: player-body, hat-<id>, item-<kind>, ghost, bat, decor-<type>.
// w/h are in world units; the image is drawn centred on x and with its bottom on y
// (items and ghosts are centred on y). Any key not listed keeps its code drawing.

export interface Sprite { img: HTMLImageElement; w: number; h: number }
const sprites = new Map<string, Sprite>();

export async function loadSprites(): Promise<void> {
  try {
    const res = await fetch('./sprites/sprites.json');
    if (!res.ok) return;
    const list = (await res.json()) as Record<string, { file: string; w: number; h: number }>;
    await Promise.all(Object.entries(list).map(([key, s]) => new Promise<void>(done => {
      const img = new Image();
      img.onload = () => { sprites.set(key, { img, w: s.w, h: s.h }); done(); };
      img.onerror = () => done();
      img.src = `./sprites/${s.file}`;
    })));
  } catch {
    // No overrides: everything stays code-drawn.
  }
}

export const sprite = (key: string): Sprite | undefined => sprites.get(key);

/** Draws the sprite for `key` if one is loaded and returns true; otherwise returns false. */
export function drawSprite(c: CanvasRenderingContext2D, key: string, x: number, y: number, centredY = false): boolean {
  const s = sprites.get(key);
  if (!s) return false;
  c.drawImage(s.img, x - s.w / 2, centredY ? y - s.h / 2 : y - s.h, s.w, s.h);
  return true;
}
