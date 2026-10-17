import { describe, expect, it } from 'vitest';
import { EPIC_QUESTS, MICRO_CHALLENGES, RECIPES, findRecipe, recipeKey } from '../data/recipes';
import { RESOURCE_IDS } from '../data/resources';
import type { ResourceId } from '../types';
import {
  CHAOS_EPIC_CHANCE,
  applyCraft,
  canCraft,
  completeScroll,
  resolveCraft,
} from './craft';
import { MAX_AWAY_MIN, awardForMinutes, levelFromXp, levelProgress, xpToReach } from './rewards';
import { cancelMeditation, markHidden, settle, startMeditation } from './presence';
import { STORAGE_KEY, defaultState, loadState, sanitizeState, saveState } from './store';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

describe('récolte hors-écran', () => {
  it('ne donne rien avant 10 minutes', () => {
    expect(awardForMinutes(9)).toEqual({ water: 0, stardust: 0, sage: 0, essence: 0 });
  });
  it('respecte les paliers 10 / 20 / 30 / 60 minutes', () => {
    expect(awardForMinutes(10)).toEqual({ water: 1, stardust: 0, sage: 0, essence: 0 });
    expect(awardForMinutes(20)).toEqual({ water: 2, stardust: 1, sage: 0, essence: 0 });
    expect(awardForMinutes(30)).toEqual({ water: 3, stardust: 1, sage: 1, essence: 0 });
    expect(awardForMinutes(60)).toEqual({ water: 6, stardust: 3, sage: 2, essence: 1 });
  });
  it('plafonne les très longues absences', () => {
    expect(awardForMinutes(100_000)).toEqual(awardForMinutes(MAX_AWAY_MIN));
  });
  it('gère les valeurs absurdes', () => {
    expect(awardForMinutes(-5).water).toBe(0);
    expect(awardForMinutes(Number.NaN).water).toBe(0);
  });
});

describe('suivi de présence', () => {
  it('convertit une absence en ressources et efface le timestamp', () => {
    let s = defaultState(T0);
    s = markHidden(s, T0);
    expect(s.lastHiddenAt).toBe(T0);
    const r = settle(s, T0 + 35 * MIN);
    expect(r.absence?.minutes).toBe(35);
    expect(r.state.inventory).toEqual({ water: 3, stardust: 1, sage: 1, essence: 0 });
    expect(r.state.lastHiddenAt).toBeNull();
    expect(r.state.totalAwayMin).toBe(35);
  });
  it("n'écrase pas un horodatage déjà posé", () => {
    const s = markHidden(markHidden(defaultState(T0), T0), T0 + 5 * MIN);
    expect(s.lastHiddenAt).toBe(T0);
  });
  it("ignore une horloge qui recule", () => {
    const s = markHidden(defaultState(T0), T0);
    const r = settle(s, T0 - 10 * MIN);
    expect(r.absence).toBeUndefined();
    expect(r.state.inventory.water).toBe(0);
  });
  it('signale le plafond', () => {
    const s = markHidden(defaultState(T0), T0);
    const r = settle(s, T0 + 600 * MIN);
    expect(r.absence?.capped).toBe(true);
    expect(r.absence?.counted).toBe(MAX_AWAY_MIN);
  });
  it('termine la méditation avec bonus, puis compte le surplus hors-écran', () => {
    let s = startMeditation(defaultState(T0), 10, T0);
    s = markHidden(s, T0 + MIN);
    const r = settle(s, T0 + 40 * MIN);
    expect(r.meditation?.durationMin).toBe(10);
    expect(r.meditation?.awarded.water).toBe(2); // 1 palier + bonus de concentration
    expect(r.absence?.minutes).toBe(30); // de la fin (T0+10) jusqu'à T0+40
    expect(r.state.meditation).toBeNull();
  });
  it("ne double pas les gains tant que la méditation est en cours", () => {
    let s = startMeditation(defaultState(T0), 30, T0);
    s = markHidden(s, T0 + MIN);
    const r = settle(s, T0 + 15 * MIN);
    expect(r.absence).toBeUndefined();
    expect(r.meditation).toBeUndefined();
    expect(r.state.meditation).not.toBeNull();
    expect(r.state.inventory.water).toBe(0);
  });
  it("l'abandon ne rapporte rien", () => {
    const s = cancelMeditation(startMeditation(defaultState(T0), 30, T0));
    expect(settle(s, T0 + 60 * MIN).state.inventory.water).toBe(0);
  });
});

describe('recettes et chaudron', () => {
  it("l'ordre des ingrédients n'a pas d'importance", () => {
    expect(recipeKey(['sage', 'water'])).toBe(recipeKey(['water', 'sage']));
    expect(findRecipe(['sage', 'water'])?.id).toBe('infusion-du-calme');
  });
  it('chaque recette a des ingrédients valides, uniques et 3 quêtes', () => {
    const keys = new Set<string>();
    for (const r of RECIPES) {
      expect(r.ingredients.length).toBeGreaterThanOrEqual(2);
      expect(r.ingredients.length).toBeLessThanOrEqual(3);
      expect(r.ingredients.every((i) => RESOURCE_IDS.includes(i))).toBe(true);
      expect(r.quests).toHaveLength(3);
      keys.add(recipeKey(r.ingredients));
    }
    expect(keys.size).toBe(RECIPES.length);
  });
  it('les identifiants de quêtes sont uniques', () => {
    const ids = [...RECIPES.flatMap((r) => r.quests), ...EPIC_QUESTS, ...MICRO_CHALLENGES].map(
      (q) => q.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('vérifie le stock avant de mélanger', () => {
    const inv = { water: 1, stardust: 0, sage: 1, essence: 0 };
    expect(canCraft(inv, ['water', 'sage'])).toBe(true);
    expect(canCraft(inv, ['water', 'water'])).toBe(false);
    expect(canCraft(inv, ['water'])).toBe(false);
    expect(canCraft({ ...inv, water: 9 }, ['water', 'water', 'water', 'water'])).toBe(false);
  });
  it('une recette connue débloque toujours une quête de son thème', () => {
    const s = defaultState(T0);
    const o = resolveCraft(['water', 'sage'], s, () => 0.5);
    expect(o.kind).toBe('recipe');
    if (o.kind === 'recipe') {
      expect(o.recipe.id).toBe('infusion-du-calme');
      expect(o.firstDiscovery).toBe(true);
      expect(o.recipe.quests.map((q) => q.id)).toContain(o.quest.id);
    }
  });
  it('mélange inconnu : 70 % épique / 30 % explosion', () => {
    const s = defaultState(T0);
    const mix: ResourceId[] = ['water', 'essence', 'essence']; // pas une recette
    expect(findRecipe(mix)).toBeUndefined();
    expect(resolveCraft(mix, s, () => 0.0).kind).toBe('epic');
    expect(resolveCraft(mix, s, () => CHAOS_EPIC_CHANCE - 0.001).kind).toBe('epic');
    expect(resolveCraft(mix, s, () => CHAOS_EPIC_CHANCE).kind).toBe('explosion');
    expect(resolveCraft(mix, s, () => 0.999).kind).toBe('explosion');
  });
  it('la distribution réelle est proche de 70/30', () => {
    const s = defaultState(T0);
    let epic = 0;
    const N = 20_000;
    for (let i = 0; i < N; i++) {
      if (resolveCraft(['water', 'essence', 'essence'], s).kind === 'epic') epic++;
    }
    expect(epic / N).toBeGreaterThan(0.67);
    expect(epic / N).toBeLessThan(0.73);
  });
  it('consomme les ingrédients et ajoute le parchemin', () => {
    const s = { ...defaultState(T0), inventory: { water: 2, stardust: 0, sage: 1, essence: 0 } };
    const ings: ResourceId[] = ['water', 'sage'];
    const outcome = resolveCraft(ings, s, () => 0);
    const { state, scroll } = applyCraft(s, ings, outcome, T0);
    expect(state.inventory).toEqual({ water: 1, stardust: 0, sage: 0, essence: 0 });
    expect(state.scrolls).toHaveLength(1);
    expect(scroll.rarity).toBe('commune');
    expect(state.discoveredRecipes).toContain('infusion-du-calme');
  });
  it("l'explosion donne un micro-défi de rareté « défi »", () => {
    const s = defaultState(T0);
    const o = resolveCraft(['water', 'essence', 'essence'], s, () => 0.99);
    const { scroll } = applyCraft(
      { ...s, inventory: { water: 1, stardust: 0, sage: 0, essence: 2 } },
      ['water', 'essence', 'essence'],
      o,
      T0,
    );
    expect(scroll.rarity).toBe('defi');
    expect(scroll.source).toBe('explosion');
  });
  it('privilégie les quêtes jamais vues', () => {
    let s = defaultState(T0);
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const o = resolveCraft(['water', 'sage'], s, () => 0);
      const r = applyCraft({ ...s, inventory: { water: 5, stardust: 0, sage: 5, essence: 0 } }, ['water', 'sage'], o, T0 + i);
      seen.add(r.scroll.questId);
      s = r.state;
    }
    expect(seen.size).toBe(3);
  });
});

describe('validation des quêtes & XP', () => {
  it('accorde XP, retire le parchemin et écrit dans le Grimoire', () => {
    const s0 = { ...defaultState(T0), inventory: { water: 2, stardust: 0, sage: 0, essence: 0 } };
    const o = resolveCraft(['water', 'water'], s0, () => 0);
    const { state, scroll } = applyCraft(s0, ['water', 'water'], o, T0);
    const done = completeScroll(state, scroll.id, T0 + 1);
    expect(done).not.toBeNull();
    expect(done?.state.xp).toBe(20);
    expect(done?.state.scrolls).toHaveLength(0);
    expect(done?.state.grimoire[0]?.questId).toBe(scroll.questId);
  });
  it('une quête déjà validée ne rapporte pas deux fois', () => {
    const s0 = defaultState(T0);
    expect(completeScroll(s0, 'inconnu', T0)).toBeNull();
  });
  it('les niveaux suivent la courbe attendue', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
    expect(xpToReach(3)).toBe(200);
    expect(levelProgress(125)).toEqual({ level: 2, into: 75, span: 150 });
  });
});

describe('persistance', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    };
  };
  it('sauvegarde puis recharge le même état', () => {
    const st = memory();
    const s = { ...defaultState(T0), xp: 123, lastHiddenAt: T0 + 5, inventory: { water: 4, stardust: 3, sage: 2, essence: 1 } };
    saveState(st, s);
    expect(loadState(st, T0)).toEqual(s);
  });
  it('survit à des données corrompues', () => {
    const st = memory();
    st.setItem(STORAGE_KEY, '{pas du json');
    expect(loadState(st, T0).xp).toBe(0);
    expect(sanitizeState({ xp: -5, inventory: { water: 'x', sage: 2.9 }, scrolls: [1, null] }, T0)).toMatchObject({
      xp: 0,
      inventory: { water: 0, sage: 2 },
      scrolls: [],
    });
  });
});
