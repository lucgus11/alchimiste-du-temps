import { RESOURCES } from '../data/resources';
import type { Inventory } from '../types';

/** Durée maximale prise en compte pour une seule absence (anti-triche : laisser le téléphone des jours). */
export const MAX_AWAY_MIN = 180;

/** Bonus de concentration offert à chaque méditation terminée. */
export const MEDITATION_BONUS: Partial<Inventory> = { water: 1 };

export function emptyInventory(): Inventory {
  return { water: 0, stardust: 0, sage: 0, essence: 0 };
}

export function addInventory(a: Inventory, b: Partial<Inventory>): Inventory {
  return {
    water: a.water + (b.water ?? 0),
    stardust: a.stardust + (b.stardust ?? 0),
    sage: a.sage + (b.sage ?? 0),
    essence: a.essence + (b.essence ?? 0),
  };
}

export function inventoryTotal(inv: Partial<Inventory>): number {
  return (inv.water ?? 0) + (inv.stardust ?? 0) + (inv.sage ?? 0) + (inv.essence ?? 0);
}

/**
 * Ressources gagnées pour `minutes` passées hors-écran.
 * Chaque ressource est accordée à chaque multiple complet de son palier :
 * 10 min → 💧, 20 min → ✨, 30 min → 🌿, 60 min → 💎 (et ainsi de suite, jusqu'au plafond).
 */
export function awardForMinutes(minutes: number): Inventory {
  const m = Math.min(Math.max(0, Math.floor(Number.isFinite(minutes) ? minutes : 0)), MAX_AWAY_MIN);
  const out = emptyInventory();
  for (const r of RESOURCES) out[r.id] = Math.floor(m / r.everyMin);
  return out;
}

/** Minutes entières écoulées entre deux timestamps (jamais négatif, même si l'horloge recule). */
export function elapsedMinutes(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / 60_000));
}

// ---- Niveaux ---------------------------------------------------------------

/** XP total nécessaire pour atteindre un niveau (niveau 1 = 0 XP). */
export function xpToReach(level: number): number {
  return 50 * (level - 1) ** 2;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

const TITLES = [
  'Apprenti',
  'Initié',
  'Alchimiste',
  'Adepte',
  'Maître Alchimiste',
  'Archimage',
  'Gardien du Temps',
];

export function titleForLevel(level: number): string {
  return TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))] ?? 'Apprenti';
}

export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelFromXp(xp);
  const base = xpToReach(level);
  return { level, into: xp - base, span: xpToReach(level + 1) - base };
}

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, '0')} min`;
}
