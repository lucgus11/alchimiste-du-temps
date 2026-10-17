import { EPIC_QUESTS, MICRO_CHALLENGES, findRecipe } from '../data/recipes';
import { RARITY_XP } from '../data/resources';
import type {
  GameState,
  GrimoireEntry,
  Inventory,
  QuestDef,
  RecipeDef,
  ResourceId,
  Scroll,
  ScrollSource,
} from '../types';
import { levelFromXp } from './rewards';

export const MIN_INGREDIENTS = 2;
export const MAX_INGREDIENTS = 3;
/** Mélange inconnu : probabilité d'obtenir une Quête Épique (sinon : explosion). */
export const CHAOS_EPIC_CHANCE = 0.7;
export const MICRO_CHALLENGE_SECONDS = 60;

export type Rng = () => number;

export type CraftOutcome =
  | { kind: 'recipe'; recipe: RecipeDef; quest: QuestDef; firstDiscovery: boolean }
  | { kind: 'epic'; quest: QuestDef }
  | { kind: 'explosion'; quest: QuestDef };

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Tire une quête en privilégiant celles que le joueur n'a jamais vues. */
export function pickQuest(
  pool: readonly QuestDef[],
  state: Pick<GameState, 'scrolls' | 'grimoire'>,
  rng: Rng,
): QuestDef {
  const pending = new Set(state.scrolls.map((s) => s.questId));
  const done = new Set(state.grimoire.map((g) => g.questId));
  const unseen = pool.filter((q) => !pending.has(q.id) && !done.has(q.id));
  const notPending = pool.filter((q) => !pending.has(q.id));
  const candidates = unseen.length > 0 ? unseen : notPending.length > 0 ? notPending : pool;
  const index = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
  return candidates[index] as QuestDef;
}

export function canCraft(inventory: Inventory, ingredients: readonly ResourceId[]): boolean {
  if (ingredients.length < MIN_INGREDIENTS || ingredients.length > MAX_INGREDIENTS) return false;
  const need: Inventory = { water: 0, stardust: 0, sage: 0, essence: 0 };
  for (const id of ingredients) need[id] += 1;
  return (Object.keys(need) as ResourceId[]).every((id) => inventory[id] >= need[id]);
}

/** Détermine le résultat d'un mélange (fonction pure : le hasard est injecté). */
export function resolveCraft(
  ingredients: readonly ResourceId[],
  state: GameState,
  rng: Rng = Math.random,
): CraftOutcome {
  const recipe = findRecipe(ingredients);
  if (recipe) {
    return {
      kind: 'recipe',
      recipe,
      quest: pickQuest(recipe.quests, state, rng),
      firstDiscovery: !state.discoveredRecipes.includes(recipe.id),
    };
  }
  if (rng() < CHAOS_EPIC_CHANCE) {
    return { kind: 'epic', quest: pickQuest(EPIC_QUESTS, state, rng) };
  }
  return { kind: 'explosion', quest: pickQuest(MICRO_CHALLENGES, state, rng) };
}

function scrollFrom(quest: QuestDef, source: ScrollSource, origin: string, now: number): Scroll {
  return {
    id: newId(),
    questId: quest.id,
    title: quest.title,
    description: quest.description,
    category: quest.category,
    rarity: quest.rarity,
    xp: RARITY_XP[quest.rarity],
    source,
    origin,
    createdAt: now,
  };
}

/** Consomme les ingrédients et ajoute le parchemin correspondant. Retourne aussi ce parchemin. */
export function applyCraft(
  state: GameState,
  ingredients: readonly ResourceId[],
  outcome: CraftOutcome,
  now: number,
): { state: GameState; scroll: Scroll } {
  const inventory = { ...state.inventory };
  for (const id of ingredients) inventory[id] = Math.max(0, inventory[id] - 1);

  let scroll: Scroll;
  let discovered = state.discoveredRecipes;
  if (outcome.kind === 'recipe') {
    scroll = scrollFrom(outcome.quest, 'recipe', outcome.recipe.name, now);
    if (!discovered.includes(outcome.recipe.id)) discovered = [...discovered, outcome.recipe.id];
  } else if (outcome.kind === 'epic') {
    scroll = scrollFrom(outcome.quest, 'chaos', 'Mélange chaotique', now);
  } else {
    scroll = scrollFrom(outcome.quest, 'explosion', 'Explosion du chaudron', now);
  }

  return {
    state: { ...state, inventory, discoveredRecipes: discovered, scrolls: [...state.scrolls, scroll] },
    scroll,
  };
}

export const MAX_GRIMOIRE_ENTRIES = 500;

/** Valide une quête : XP + enregistrement dans le Grimoire. */
export function completeScroll(
  state: GameState,
  scrollId: string,
  now: number,
): { state: GameState; entry: GrimoireEntry; levelBefore: number; levelAfter: number } | null {
  const scroll = state.scrolls.find((s) => s.id === scrollId);
  if (!scroll) return null;

  const entry: GrimoireEntry = {
    id: newId(),
    questId: scroll.questId,
    title: scroll.title,
    category: scroll.category,
    rarity: scroll.rarity,
    xp: scroll.xp,
    origin: scroll.origin,
    completedAt: now,
  };
  const xp = state.xp + scroll.xp;
  return {
    state: {
      ...state,
      xp,
      scrolls: state.scrolls.filter((s) => s.id !== scrollId),
      grimoire: [entry, ...state.grimoire].slice(0, MAX_GRIMOIRE_ENTRIES),
    },
    entry,
    levelBefore: levelFromXp(state.xp),
    levelAfter: levelFromXp(xp),
  };
}
