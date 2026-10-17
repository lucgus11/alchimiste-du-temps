import type { GameState, Inventory } from '../types';
import {
  MAX_AWAY_MIN,
  MEDITATION_BONUS,
  addInventory,
  awardForMinutes,
  elapsedMinutes,
  inventoryTotal,
} from './rewards';

export interface AbsenceReport {
  minutes: number;
  counted: number;
  capped: boolean;
  awarded: Inventory;
}

export interface MeditationReport {
  durationMin: number;
  awarded: Inventory;
}

export interface SettleResult {
  state: GameState;
  absence?: AbsenceReport;
  meditation?: MeditationReport;
}

export function meditationEndsAt(m: { startedAt: number; durationMin: number }): number {
  return m.startedAt + m.durationMin * 60_000;
}

/** Enregistre le moment où l'app quitte l'écran (sans écraser un horodatage déjà posé). */
export function markHidden(state: GameState, now: number): GameState {
  return state.lastHiddenAt == null ? { ...state, lastHiddenAt: now } : state;
}

/**
 * Règle les comptes au retour sur l'écran (ou au démarrage) :
 *  - termine la méditation si son heure est passée,
 *  - convertit le temps passé hors-écran en ressources.
 * Fonction pure : aucune dépendance au DOM ni à l'horloge.
 */
export function settle(state: GameState, now: number): SettleResult {
  let s: GameState = { ...state, lastHiddenAt: null };
  let awayFrom = state.lastHiddenAt;
  const result: SettleResult = { state: s };

  const med = state.meditation;
  if (med) {
    const endAt = meditationEndsAt(med);
    if (now >= endAt) {
      const awarded = addInventory(awardForMinutes(med.durationMin), MEDITATION_BONUS);
      s = {
        ...s,
        meditation: null,
        inventory: addInventory(s.inventory, awarded),
        totalAwayMin: s.totalAwayMin + med.durationMin,
      };
      result.meditation = { durationMin: med.durationMin, awarded };
      // Le temps hors-écran après la fin de la méditation compte comme une absence normale.
      awayFrom = awayFrom == null ? null : Math.max(awayFrom, endAt);
    } else {
      // Méditation encore en cours : le temps déjà passé hors-écran est couvert par elle.
      awayFrom = null;
    }
  }

  if (awayFrom != null) {
    const minutes = elapsedMinutes(awayFrom, now);
    if (minutes > 0) {
      const counted = Math.min(minutes, MAX_AWAY_MIN);
      const awarded = awardForMinutes(counted);
      s = {
        ...s,
        inventory: addInventory(s.inventory, awarded),
        totalAwayMin: s.totalAwayMin + counted,
      };
      result.absence = { minutes, counted, capped: minutes > MAX_AWAY_MIN, awarded };
    }
  }

  result.state = s;
  return result;
}

export function hasAnyReward(r: AbsenceReport | MeditationReport): boolean {
  return inventoryTotal(r.awarded) > 0;
}

export function startMeditation(state: GameState, durationMin: number, now: number): GameState {
  return { ...state, meditation: { startedAt: now, durationMin }, lastHiddenAt: null };
}

export function cancelMeditation(state: GameState): GameState {
  return { ...state, meditation: null };
}
