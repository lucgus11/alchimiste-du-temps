import type {
  Category,
  GameState,
  GrimoireEntry,
  Inventory,
  Meditation,
  Rarity,
  ResourceId,
  Scroll,
  ScrollSource,
} from '../types';
import { emptyInventory } from './rewards';

export const STORAGE_KEY = 'alchimiste-du-temps:v1';

export function defaultState(now: number = Date.now()): GameState {
  return {
    version: 1,
    inventory: emptyInventory(),
    xp: 0,
    scrolls: [],
    grimoire: [],
    discoveredRecipes: [],
    lastHiddenAt: null,
    meditation: null,
    totalAwayMin: 0,
    createdAt: now,
    settings: { feedback: false, introSeen: false },
  };
}

// ---- Validation défensive des données lues (localStorage peut contenir n'importe quoi) ----

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const count = (v: unknown): number => Math.max(0, Math.floor(num(v, 0)));
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const RARITIES: Rarity[] = ['commune', 'rare', 'epique', 'defi'];
const CATEGORIES: Category[] = ['cuisine', 'creation', 'balade', 'sport', 'bienetre'];
const SOURCES: ScrollSource[] = ['recipe', 'chaos', 'explosion'];
const oneOf = <T extends string>(v: unknown, list: T[], fallback: T): T =>
  typeof v === 'string' && (list as string[]).includes(v) ? (v as T) : fallback;

function readInventory(v: unknown): Inventory {
  const o = isObj(v) ? v : {};
  const ids: ResourceId[] = ['water', 'stardust', 'sage', 'essence'];
  const inv = emptyInventory();
  for (const id of ids) inv[id] = count(o[id]);
  return inv;
}

function readScroll(v: unknown): Scroll | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.title !== 'string') return null;
  return {
    id: v.id,
    questId: str(v.questId, v.id),
    title: v.title,
    description: str(v.description),
    category: oneOf(v.category, CATEGORIES, 'bienetre'),
    rarity: oneOf(v.rarity, RARITIES, 'commune'),
    xp: count(v.xp),
    source: oneOf(v.source, SOURCES, 'recipe'),
    origin: str(v.origin),
    createdAt: num(v.createdAt, 0),
  };
}

function readEntry(v: unknown): GrimoireEntry | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.title !== 'string') return null;
  return {
    id: v.id,
    questId: str(v.questId, v.id),
    title: v.title,
    category: oneOf(v.category, CATEGORIES, 'bienetre'),
    rarity: oneOf(v.rarity, RARITIES, 'commune'),
    xp: count(v.xp),
    origin: str(v.origin),
    completedAt: num(v.completedAt, 0),
  };
}

function readMeditation(v: unknown): Meditation | null {
  if (!isObj(v)) return null;
  const durationMin = count(v.durationMin);
  const startedAt = num(v.startedAt, 0);
  return durationMin > 0 && startedAt > 0 ? { startedAt, durationMin } : null;
}

export function sanitizeState(raw: unknown, now: number = Date.now()): GameState {
  const base = defaultState(now);
  if (!isObj(raw)) return base;
  const settings = isObj(raw.settings) ? raw.settings : {};
  return {
    version: 1,
    inventory: readInventory(raw.inventory),
    xp: count(raw.xp),
    scrolls: Array.isArray(raw.scrolls)
      ? raw.scrolls.map(readScroll).filter((s): s is Scroll => s !== null)
      : [],
    grimoire: Array.isArray(raw.grimoire)
      ? raw.grimoire.map(readEntry).filter((e): e is GrimoireEntry => e !== null)
      : [],
    discoveredRecipes: Array.isArray(raw.discoveredRecipes)
      ? raw.discoveredRecipes.filter((x): x is string => typeof x === 'string')
      : [],
    lastHiddenAt:
      typeof raw.lastHiddenAt === 'number' && Number.isFinite(raw.lastHiddenAt)
        ? raw.lastHiddenAt
        : null,
    meditation: readMeditation(raw.meditation),
    totalAwayMin: count(raw.totalAwayMin),
    createdAt: num(raw.createdAt, now),
    settings: {
      feedback: settings.feedback === true,
      introSeen: settings.introSeen === true,
    },
  };
}

// ---- Persistance ----------------------------------------------------------------------

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function loadState(storage: StorageLike | null, now: number = Date.now()): GameState {
  if (!storage) return defaultState(now);
  try {
    const text = storage.getItem(STORAGE_KEY);
    return text ? sanitizeState(JSON.parse(text), now) : defaultState(now);
  } catch {
    return defaultState(now);
  }
}

export function saveState(storage: StorageLike | null, state: GameState): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Stockage plein ou indisponible (navigation privée) : on continue en mémoire.
  }
}

export function getStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    const probe = '__alchimiste_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export type Listener = (state: GameState) => void;

export class Store {
  private state: GameState;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly storage: StorageLike | null) {
    this.state = loadState(storage);
  }

  get(): GameState {
    return this.state;
  }

  set(next: GameState, notify = true): void {
    this.state = next;
    saveState(this.storage, next);
    if (notify) this.emit();
  }

  update(fn: (s: GameState) => GameState): GameState {
    this.set(fn(this.state));
    return this.state;
  }

  /** Recharge depuis le stockage (modification faite dans un autre onglet). */
  reload(): void {
    this.state = loadState(this.storage);
    this.emit();
  }

  reset(): void {
    this.set(defaultState());
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }
}
