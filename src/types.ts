export type ResourceId = 'water' | 'stardust' | 'sage' | 'essence';
export type Inventory = Record<ResourceId, number>;

export type Rarity = 'commune' | 'rare' | 'epique' | 'defi';
export type Category = 'cuisine' | 'creation' | 'balade' | 'sport' | 'bienetre';
export type ScrollSource = 'recipe' | 'chaos' | 'explosion';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  short: string;
  emoji: string;
  /** Un objet est gagné à chaque multiple de ce nombre de minutes hors-écran. */
  everyMin: number;
  color: string;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  category: Category;
  rarity: Rarity;
}

export interface RecipeDef {
  id: string;
  name: string;
  icon: string;
  ingredients: ResourceId[];
  category: Category;
  rarity: Rarity;
  flavor: string;
  quests: QuestDef[];
}

/** Parchemin de quête débloqué, en attente d'être accompli. */
export interface Scroll {
  id: string;
  questId: string;
  title: string;
  description: string;
  category: Category;
  rarity: Rarity;
  xp: number;
  source: ScrollSource;
  origin: string;
  createdAt: number;
}

/** Exploit enregistré dans le Grimoire. */
export interface GrimoireEntry {
  id: string;
  questId: string;
  title: string;
  category: Category;
  rarity: Rarity;
  xp: number;
  origin: string;
  completedAt: number;
}

export interface Meditation {
  startedAt: number;
  durationMin: number;
}

export interface Settings {
  feedback: boolean;
  introSeen: boolean;
}

export interface GameState {
  version: 1;
  inventory: Inventory;
  xp: number;
  scrolls: Scroll[];
  grimoire: GrimoireEntry[];
  discoveredRecipes: string[];
  lastHiddenAt: number | null;
  meditation: Meditation | null;
  totalAwayMin: number;
  createdAt: number;
  settings: Settings;
}
