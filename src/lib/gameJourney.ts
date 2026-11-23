import type { CanonicalPhase, CanonicalWorld, GameMode } from '../types/gameContracts';
import {
  CANONICAL_WORLDS as CANONICAL_GAME_WORLDS,
  WORLD_1_PHASES as CANONICAL_WORLD_ONE_PHASES,
} from '../data/canonicalGameData';

const JOURNEY_STORAGE_KEY = 'biblia:game-journey-v1';

// Uma única fonte canónica para o mapa, a sessão, os desbloqueios e a base de dados.
// O catálogo duplicado anterior tinha IDs diferentes e quebrava a progressão local.
export const CANONICAL_WORLDS: CanonicalWorld[] = CANONICAL_GAME_WORLDS;
const WORLD_ONE_PHASES: CanonicalPhase[] = CANONICAL_WORLD_ONE_PHASES;

export interface JourneyState {
  phases: Record<string, CanonicalPhase>;
}

function createInitialState(): JourneyState {
  // O catálogo é conteúdo; a conclusão pertence sempre ao jogador. Não usar
  // estrelas/fases concluídas de demonstração como progresso inicial.
  return {
    phases: Object.fromEntries(WORLD_ONE_PHASES.map((phase, index) => [phase.id, {
      ...phase,
      isCompleted: false,
      isUnlocked: index === 0,
      stars: 0,
      lastCompletedAt: undefined,
      retentionReviewedAt: undefined,
    }]))
  };
}

export function getJourneyState(): JourneyState {
  try {
    const stored = localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as JourneyState;
      const expectedIds = new Set(WORLD_ONE_PHASES.map((phase) => phase.id));
      if (Object.keys(parsed.phases || {}).some((id) => expectedIds.has(id))) return parsed;

      // Migra a versão de protótipo, que tinha IDs incompatíveis, sem perder
      // conclusões que o jogador já tivesse obtido por número de fase.
      const migrated = createInitialState();
      for (const previous of Object.values(parsed.phases || {})) {
        const target = Object.values(migrated.phases).find(
          (phase) => phase.worldId === previous.worldId && phase.phaseNumber === previous.phaseNumber
        );
        if (target) {
          migrated.phases[target.id] = {
            ...target,
            isCompleted: Boolean(previous.isCompleted),
            isUnlocked: Boolean(previous.isUnlocked || previous.isCompleted),
            stars: Math.max(0, previous.stars || 0),
            lastCompletedAt: previous.lastCompletedAt,
          };
        }
      }
      saveJourneyState(migrated);
      return migrated;
    }
  } catch {
    // A fresh state is safer than retaining malformed local progress.
  }
  return createInitialState();
}

function saveJourneyState(state: JourneyState): void {
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Progress remains available for the current session if storage is unavailable.
  }
}

export function getJourneyPhases(worldId: number): CanonicalPhase[] {
  const phases = Object.values(getJourneyState().phases)
    .filter((phase) => phase.worldId === worldId)
    .sort((a, b) => a.phaseNumber - b.phaseNumber);
  return phases;
}

export function getJourneyPhase(phaseId: string): CanonicalPhase | undefined {
  return getJourneyState().phases[phaseId];
}

export function getCurrentJourneyPhase(): CanonicalPhase {
  const phases = getJourneyPhases(1);
  return phases.find((phase) => phase.isUnlocked && !phase.isCompleted) || phases[phases.length - 1];
}

export function getWorldCompletion(worldId: number): number {
  const phases = getJourneyPhases(worldId);
  if (!phases.length) return 0;
  return Math.round((phases.filter((phase) => phase.isCompleted).length / phases.length) * 100);
}

export function getTotalMasteryStars(): number {
  const state = getJourneyState();
  return Object.values(state.phases).reduce((sum, phase) => sum + (phase.stars || 0), 0);
}

export function awardThirdMasteryStar(phaseId: string): boolean {
  if (!phaseId) return false;
  const state = getJourneyState();
  const phase = state.phases[phaseId];
  if (!phase || !phase.isCompleted || phase.stars >= 3) return false;

  state.phases[phaseId] = {
    ...phase,
    stars: 3,
    retentionReviewedAt: new Date().toISOString(),
  };
  saveJourneyState(state);
  return true;
}

export function recordPhaseResult(phaseId: string | undefined, result: { completed: boolean; starsEarned: number }): void {
  if (!phaseId || !result.completed) return;

  const state = getJourneyState();
  const phase = state.phases[phaseId];
  if (!phase) return;

  state.phases[phaseId] = {
    ...phase,
    isCompleted: true,
    stars: Math.max(phase.stars, result.starsEarned),
    lastCompletedAt: new Date().toISOString(),
  };

  const phasesInWorld = Object.values(state.phases)
    .filter((item) => item.worldId === phase.worldId)
    .sort((left, right) => left.phaseNumber - right.phaseNumber);
  const currentIndex = phasesInWorld.findIndex((item) => item.id === phaseId);
  const nextPhase = currentIndex >= 0 ? phasesInWorld[currentIndex + 1] : undefined;
  if (nextPhase) {
    state.phases[nextPhase.id] = { ...nextPhase, isUnlocked: true };
  }
  saveJourneyState(state);
}

export function getNodeIcon(nodeType: CanonicalPhase['nodeType']): string {
  if (nodeType === 'memory') return 'bookmark';
  if (nodeType === 'guided_reading') return 'menu_book';
  if (nodeType === 'blessing_chest') return 'redeem';
  if (nodeType === 'world_review') return 'workspace_premium';
  return 'play_circle';
}

export function getPhaseModeLabel(mode: GameMode): string {
  if (mode === 'true-false') return 'Verdadeiro ou Falso';
  if (mode === 'fill-blanks') return 'Completar Versículo';
  if (mode === 'daily') return 'Desafio Diário';
  return 'Quiz Bíblico';
}
