/**
 * Sprites pixel art 12×12, dessinés sous forme de grilles de caractères.
 * `.` = transparent. Chaque lettre renvoie à la palette du sprite.
 */
export type SpriteId = 'water' | 'stardust' | 'sage' | 'essence' | 'scroll';

interface Sprite {
  rows: string[];
  palette: Record<string, string>;
}

export const SPRITES: Record<SpriteId, Sprite> = {
  water: {
    palette: { o: '#1b4f8a', b: '#3fa9f5', l: '#8fdcff', w: '#ffffff' },
    rows: [
      '.....oo.....',
      '.....oo.....',
      '....obbo....',
      '....obbo....',
      '...obbbbo...',
      '..obbbbbbo..',
      '..obwlbbbo..',
      '.obwlbbbbbo.',
      '.obwbbbbbbo.',
      '.obbbbbbbbo.',
      '..obbbbbbo..',
      '...oooooo...',
    ],
  },
  stardust: {
    palette: { g: '#c9902b', y: '#ffd86b', w: '#fff6d0' },
    rows: [
      '.....gg.....',
      '.....yy.....',
      '....gyyg....',
      '....yyyy....',
      '.gyyyywyyyg.',
      '.ggyywwwyygg',
      '.gyyyywyyyg.',
      '....yyyy....',
      '....gyyg....',
      '.....yy.....',
      '..w..gg..w..',
      '............',
    ],
  },
  sage: {
    palette: { d: '#2f6b3a', g: '#6fcf6f', l: '#b9f5a8', b: '#7a5230' },
    rows: [
      '..........dd',
      '........ddgd',
      '......ddgggd',
      '.....dgglggd',
      '....dgglgggd',
      '...dgglggggd',
      '...dgllgggd.',
      '..dgglggggd.',
      '..dgggggdd..',
      '.dgggggdd...',
      '.bddddd.....',
      'b...........',
    ],
  },
  essence: {
    palette: { o: '#5a2a8a', p: '#c792ff', m: '#8b4bd6', w: '#ffffff' },
    rows: [
      '....oooo....',
      '...opppwo...',
      '..opppwppo..',
      '.oppwpppppo.',
      '.opwpppmmpo.',
      '.oppppmmmmo.',
      '..opppmmmo..',
      '..oppmmmmo..',
      '...opmmmo...',
      '....ommo....',
      '.....oo.....',
      '............',
    ],
  },
  scroll: {
    palette: { o: '#3b2410', r: '#c9a36a', y: '#f2dfae', k: '#8a6a3c' },
    rows: [
      '.oooooooooo.',
      'orrrrrrrrrro',
      '.oyyyyyyyyo.',
      '.oykkkkkyyo.',
      '.oyyyyyyyyo.',
      '.oykkkkyyyo.',
      '.oyyyyyyyyo.',
      '.oykkkkkyyo.',
      '.oyyyyyyyyo.',
      'orrrrrrrrrro',
      '.oooooooooo.',
      '............',
    ],
  },
};

export const SPRITE_SIZE = 12;

const cache = new Map<SpriteId, string>();

/** Génère (une seule fois) une image PNG en data-URL pour un sprite. */
export function spriteUrl(id: SpriteId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const sprite = SPRITES[id];
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    sprite.rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const color = sprite.palette[ch];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      });
    });
  }
  const url = canvas.toDataURL('image/png');
  cache.set(id, url);
  return url;
}

export function spriteImg(id: SpriteId, cls = ''): string {
  return `<img class="px ${cls}" src="${spriteUrl(id)}" width="${SPRITE_SIZE}" height="${SPRITE_SIZE}" alt="" draggable="false">`;
}
