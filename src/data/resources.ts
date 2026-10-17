import type { Category, Rarity, ResourceDef, ResourceId } from '../types';

export const RESOURCES: readonly ResourceDef[] = [
  { id: 'water', name: "Goutte d'Eau Pure", short: 'Eau Pure', emoji: '💧', everyMin: 10, color: '#5ec8ff' },
  { id: 'stardust', name: "Poussière d'Étoile", short: 'Étoile', emoji: '✨', everyMin: 20, color: '#ffd86b' },
  { id: 'sage', name: 'Feuille de Sauge', short: 'Sauge', emoji: '🌿', everyMin: 30, color: '#8fe388' },
  { id: 'essence', name: 'Essence Cristallisée', short: 'Essence', emoji: '💎', everyMin: 60, color: '#d28bff' },
];

export const RESOURCE_IDS: readonly ResourceId[] = RESOURCES.map((r) => r.id);

export const RESOURCE_BY_ID = Object.fromEntries(RESOURCES.map((r) => [r.id, r])) as Record<
  ResourceId,
  ResourceDef
>;

export const CATEGORY_LABEL: Record<Category, { label: string; emoji: string }> = {
  cuisine: { label: 'Cuisine', emoji: '🍳' },
  creation: { label: 'Création', emoji: '🎨' },
  balade: { label: 'Balade', emoji: '🥾' },
  sport: { label: 'Sport', emoji: '🏃' },
  bienetre: { label: 'Bien-être', emoji: '🧘' },
};

export const RARITY_LABEL: Record<Rarity, string> = {
  commune: 'Commune',
  rare: 'Rare',
  epique: 'Épique',
  defi: 'Micro-défi',
};

export const RARITY_XP: Record<Rarity, number> = {
  commune: 20,
  rare: 40,
  epique: 80,
  defi: 10,
};
