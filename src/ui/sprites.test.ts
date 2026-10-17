import { describe, expect, it } from 'vitest';
import { SPRITES, SPRITE_SIZE, type SpriteId } from './sprites';

describe('sprites pixel art', () => {
  for (const id of Object.keys(SPRITES) as SpriteId[]) {
    it(`${id} : grille ${SPRITE_SIZE}×${SPRITE_SIZE} et palette complète`, () => {
      const { rows, palette } = SPRITES[id];
      expect(rows).toHaveLength(SPRITE_SIZE);
      for (const row of rows) {
        expect(row).toHaveLength(SPRITE_SIZE);
        for (const ch of row) expect(ch === '.' || ch in palette).toBe(true);
      }
    });
  }
});
